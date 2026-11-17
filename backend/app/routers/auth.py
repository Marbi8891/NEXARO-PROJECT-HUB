from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Role, User, UserSession
from ..schemas import Credentials, SessionOut, SetupRequest, SetupStatus, UserOut
from ..security import (
    _DUMMY_HASH, SESSION_COOKIE, audit, client_ip, create_session, current_session,
    hash_password, rate_limiter, verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_cookie(response: Response, token: str) -> None:
    s = get_settings()
    response.set_cookie(
        SESSION_COOKIE, token, httponly=True, secure=s.cookie_secure, samesite="lax",
        max_age=s.session_ttl_hours * 3600, path="/",
    )


def _check_rate(request: Request) -> None:
    if not rate_limiter.hit(f"login:{client_ip(request)}", get_settings().login_rate_limit):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts, try again in a minute")


@router.get("/setup", response_model=SetupStatus)
def setup_status(db: Session = Depends(get_db)):
    return SetupStatus(needs_setup=db.scalar(select(func.count(User.id))) == 0)


@router.post("/setup", response_model=SessionOut, status_code=201)
def setup(body: SetupRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    """Create the first owner account. Only works while no user exists."""
    _check_rate(request)
    if db.scalar(select(func.count(User.id))):
        raise HTTPException(status.HTTP_409_CONFLICT, "Setup already completed")
    user = User(email=body.email.lower(), password_hash=hash_password(body.password), role=Role.OWNER)
    db.add(user)
    db.flush()
    audit(db, request, user, "auth.setup", "user", user.id, "Owner account created")
    db.commit()
    token, sess = create_session(db, user, request)
    _set_cookie(response, token)
    return SessionOut(user=UserOut.model_validate(user), csrf_token=sess.csrf_token)


@router.post("/login", response_model=SessionOut)
def login(body: Credentials, request: Request, response: Response, db: Session = Depends(get_db)):
    _check_rate(request)
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user:
        verify_password(_DUMMY_HASH, body.password)
        audit(db, request, None, "auth.login_failed", summary="Unknown account")
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not verify_password(user.password_hash, body.password):
        audit(db, request, user, "auth.login_failed", "user", user.id, "Wrong password")
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    user.last_login_at = datetime.now(timezone.utc)
    audit(db, request, user, "auth.login", "user", user.id)
    db.commit()
    token, sess = create_session(db, user, request)
    _set_cookie(response, token)
    return SessionOut(user=UserOut.model_validate(user), csrf_token=sess.csrf_token)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, sess: UserSession = Depends(current_session),
           db: Session = Depends(get_db)):
    audit(db, request, sess.user, "auth.logout", "user", sess.user_id)
    db.delete(db.merge(sess))
    db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.status_code = 204
    return response


@router.get("/me", response_model=SessionOut)
def me(sess: UserSession = Depends(current_session)):
    return SessionOut(user=UserOut.model_validate(sess.user), csrf_token=sess.csrf_token)
