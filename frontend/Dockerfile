FROM nginx:1.27-alpine
# Replace the default site with ours.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html portfolio.html /usr/share/nginx/html/
COPY css /usr/share/nginx/html/css
COPY js /usr/share/nginx/html/js
COPY vendor /usr/share/nginx/html/vendor
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
