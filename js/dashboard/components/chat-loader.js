// js/dashboard/components/chart-loader.js
// Lazy-loads Chart.js from cdnjs exactly once, on demand — only pages
// that actually render a chart pay for the script, and the public site
// never loads it at all. Reused by any dashboard page that needs a
// graph (installs, supporters, and later the match-analytics pages).
const CHART_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js';

let chartPromise = null;

export function loadChart() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (chartPromise) return chartPromise;

  chartPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHART_JS_URL;
    script.onload = () => resolve(window.Chart);
    script.onerror = () => {
      chartPromise = null; // allow a retry on next call instead of caching the failure
      reject(new Error('Failed to load Chart.js'));
    };
    document.head.appendChild(script);
  });

  return chartPromise;
}

