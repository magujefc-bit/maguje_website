// js/dashboard/components/period-chart.js
// Shared weekly/monthly bar chart used by both the Installs and
// Supporters analytics pages (and, later, the match-analytics pages).
// Takes raw ISO timestamps and handles bucketing + zero-filling itself,
// so each page only has to fetch its own timestamp column.
import { loadChart } from './chart-loader.js';

const WEEKS_WINDOW = 8;
const MONTHS_WINDOW = 12;

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function bucketWeekly(timestamps) {
  const now = new Date();
  const buckets = [];
  for (let i = WEEKS_WINDOW - 1; i >= 0; i--) {
    const weekStart = startOfWeek(new Date(now.getTime() - i * 7 * 86400000));
    buckets.push({ key: weekStart.getTime(), label: weekLabel(weekStart), count: 0 });
  }

  timestamps.forEach((ts) => {
    const weekStart = startOfWeek(new Date(ts)).getTime();
    const bucket = buckets.find((b) => b.key === weekStart);
    if (bucket) bucket.count += 1;
  });

  return buckets;
}

function bucketMonthly(timestamps) {
  const now = new Date();
  const buckets = [];
  for (let i = MONTHS_WINDOW - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: monthKey(d), label: monthLabel(d), count: 0 });
  }

  const bucketMap = new Map(buckets.map((b) => [b.key, b]));
  timestamps.forEach((ts) => {
    const d = new Date(ts);
    const bucket = bucketMap.get(monthKey(d));
    if (bucket) bucket.count += 1;
  });

  return buckets;
}

/**
 * Renders a weekly/monthly toggle + bar chart into `container`.
 * `timestamps` is a plain array of ISO date strings (or anything
 * `new Date()` accepts) — e.g. every `installed_at` or `created_at`
 * value for the rows being charted.
 */
export async function renderPeriodChart(container, timestamps, { barColor = '#109b45' } = {}) {
  container.innerHTML = `
    <div class="period-chart">
      <div class="period-chart__toggle">
        <button type="button" class="period-chart__btn active" data-period="weekly">Weekly</button>
        <button type="button" class="period-chart__btn" data-period="monthly">Monthly</button>
      </div>
      <div class="period-chart__canvas-wrap"><canvas></canvas></div>
    </div>
  `;

  const canvas = container.querySelector('canvas');
  const buttons = container.querySelectorAll('.period-chart__btn');

  let Chart;
  try {
    Chart = await loadChart();
  } catch (err) {
    console.error('[period-chart] Chart.js failed to load:', err);
    container.innerHTML = '<p class="empty-msg">Could not load the chart. Please check your connection and retry.</p>';
    return;
  }

  let chartInstance = null;

  function draw(period) {
    const buckets = period === 'monthly' ? bucketMonthly(timestamps) : bucketWeekly(timestamps);

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: buckets.map((b) => b.label),
        datasets: [{
          data: buckets.map((b) => b.count),
          backgroundColor: barColor,
          borderRadius: 4,
          maxBarThickness: 36,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      draw(btn.dataset.period);
    });
  });

  draw('weekly');
}

