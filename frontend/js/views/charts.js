// Chart.js helpers that follow the current theme tokens.
const charts = new Set();

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function palette() {
  return [css('--accent'), css('--success'), css('--warning'), css('--info'), css('--danger'), css('--text-muted'), css('--text-faint')];
}

export function makeChart(canvas, config) {
  if (!window.Chart) return null;
  const Chart = window.Chart;
  Chart.defaults.font.family = css('--font-sans');
  Chart.defaults.color = css('--text-muted');
  Chart.defaults.borderColor = css('--border');
  const chart = new Chart(canvas, {
    ...config,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 250 },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } } },
      ...config.options,
    },
  });
  charts.add(chart);
  return chart;
}

export function destroyCharts() {
  charts.forEach((c) => c.destroy());
  charts.clear();
}

window.addEventListener('hashchange', destroyCharts);
