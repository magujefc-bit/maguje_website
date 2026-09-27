// js/dashboard/components/period-chart.js
// Shared weekly/monthly bar chart used by both the Installs and
// Supporters analytics pages (and, later, the match-analytics pages).
// Takes raw ISO timestamps and handles bucketing + zero-filling itself,
// so each page only has to fetch its own timestamp column.
import { loadChart } from './chart-loader.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('period-chart-shared', `
  .period-chart { background: #fff; border-radius: 14px; box-shadow: 0 4px 18px rgba(4,105,38,0.08); padding: 1.3rem 1.3rem 1.5rem; margin-bottom: 1.5rem; }

  .period-chart__header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.7rem; margin-bottom: 1.1rem; }

  .period-chart__toggle { display: flex; gap: 0.25rem; background: #f2f7f3; padding: 4px; border-radius: 999px; }
  .period-chart__btn { padding: 0.4rem 1rem; border: none; background: transparent; border-radius: 999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: #5c6b62; transition: background 0.2s ease, color 0.2s ease; }
  .period-chart__btn:hover { color: #109b45; }
  .period-chart__btn.active { background: #109b45; color: #fff; box-shadow: 0 2px 8px rgba(16,155,69,0.35); }
  .period-chart__btn.active:hover { color: #fff; }

  .period-chart__nav { display: flex; align-items: center; gap: 0.6rem; }
  .period-chart__nav-btn { width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; border: 1px solid #d8e3dc; background: #fff; color: #109b45; font-size: 1rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease, transform 0.1s ease; }
  .period-chart__nav-btn:hover { background: #eaf6ee; }
  .period-chart__nav-btn:active { transform: scale(0.92); }
  .period-chart__nav-btn.is-hidden { visibility: hidden; pointer-events: none; }
  .period-chart__title { font-size: 0.82rem; font-weight: 700; color: #046926; min-width: 108px; text-align: center; white-space: nowrap; }

  .period-chart__canvas-wrap { height: 270px; position: relative; }

  @media (max-width: 480px) {
    .period-chart__header { justify-content: center; }
    .period-chart__toggle, .period-chart__nav { flex: 1 1 100%; justify-content: center; }
  }
`);

const DAY_MS = 86400000;
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Monday-to-Sunday buckets for the week that starts on `weekStart`. */
function bucketWeekDays(timestamps, weekStart) {
  const buckets = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getTime() + i * DAY_MS);
    buckets.push({ date: d, label: WEEKDAY_LABELS[i], count: 0 });
  }

  timestamps.forEach((ts) => {
    const d = new Date(ts);
    const bucket = buckets.find((b) => sameDay(b.date, d));
    if (bucket) bucket.count += 1;
  });

  return buckets;
}

/** "Sept 2026 · Wk 2" — week-of-month is which 7-day slice of the month this Monday falls in. */
function weekTitle(weekStart) {
  const weekOfMonth = Math.ceil(weekStart.getDate() / 7);
  const month = weekStart.toLocaleDateString(undefined, { month: 'short' });
  return `${month} ${weekStart.getFullYear()} · Wk ${weekOfMonth}`;
}

/** One bucket per calendar day, 1st through the last day of the month. */
function bucketMonthDays(timestamps, monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const numDays = new Date(year, month + 1, 0).getDate();

  const buckets = [];
  for (let day = 1; day <= numDays; day++) {
    buckets.push({ day, label: String(day), count: 0 });
  }

  timestamps.forEach((ts) => {
    const d = new Date(ts);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const bucket = buckets[d.getDate() - 1];
      if (bucket) bucket.count += 1;
    }
  });

  return buckets;
}

function monthTitle(monthDate) {
  return monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * Renders a weekly/monthly toggle + navigable bar chart into `container`.
 * `timestamps` is a plain array of ISO date strings (or anything
 * `new Date()` accepts) — e.g. every `installed_at` or `created_at`
 * value for the rows being charted.
 */
export async function renderPeriodChart(container, timestamps, { barColor = '#109b45' } = {}) {
  container.innerHTML = `
    <div class="period-chart">
      <div class="period-chart__header">
        <div class="period-chart__toggle">
          <button type="button" class="period-chart__btn active" data-period="weekly">Weekly</button>
          <button type="button" class="period-chart__btn" data-period="monthly">Monthly</button>
        </div>
        <div class="period-chart__nav">
          <button type="button" class="period-chart__nav-btn" data-dir="prev" aria-label="Previous period">&#8249;</button>
          <span class="period-chart__title"></span>
          <button type="button" class="period-chart__nav-btn" data-dir="next" aria-label="Next period">&#8250;</button>
        </div>
      </div>
      <div class="period-chart__canvas-wrap"><canvas></canvas></div>
    </div>
  `;

  const canvas = container.querySelector('canvas');
  const toggleButtons = container.querySelectorAll('.period-chart__btn');
  const titleEl = container.querySelector('.period-chart__title');
  const prevBtn = container.querySelector('.period-chart__nav-btn[data-dir="prev"]');
  const nextBtn = container.querySelector('.period-chart__nav-btn[data-dir="next"]');

  let Chart;
  try {
    Chart = await loadChart();
  } catch (err) {
    console.error('[period-chart] Chart.js failed to load:', err);
    container.innerHTML = '<p class="empty-msg">Could not load the chart. Please check your connection and retry.</p>';
    return;
  }

  let chartInstance = null;
  let period = 'weekly';
  let weekOffset = 0;  // 0 = current week, negative = weeks back
  let monthOffset = 0; // 0 = current month, negative = months back

  // Small inline plugin — draws the count above each bar. Skipped on the
  // monthly view (up to 31 bars) where it would just be visual noise.
  const valueLabelsPlugin = {
    id: 'valueLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      ctx.save();
      ctx.fillStyle = '#046926';
      ctx.font = '700 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      meta.data.forEach((bar, i) => {
        const value = chart.data.datasets[0].data[i];
        if (value) ctx.fillText(value, bar.x, bar.y - 6);
      });
      ctx.restore();
    },
  };

  function currentView() {
    if (period === 'monthly') {
      const now = new Date();
      const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      return { buckets: bucketMonthDays(timestamps, monthDate), title: monthTitle(monthDate), atPresent: monthOffset === 0 };
    }
    const weekStart = new Date(startOfWeek(new Date()).getTime() + weekOffset * 7 * DAY_MS);
    return { buckets: bucketWeekDays(timestamps, weekStart), title: weekTitle(weekStart), atPresent: weekOffset === 0 };
  }

  function draw() {
    const { buckets, title, atPresent } = currentView();
    titleEl.textContent = title;
    nextBtn.classList.toggle('is-hidden', atPresent);

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 270);
    gradient.addColorStop(0, barColor);
    gradient.addColorStop(1, '#0a6e30');

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: buckets.map((b) => b.label),
        datasets: [{
          data: buckets.map((b) => b.count),
          backgroundColor: gradient,
          hoverBackgroundColor: '#ffb703',
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: period === 'monthly' ? 18 : 40,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 550, easing: 'easeOutQuart' },
        layout: { padding: { top: period === 'monthly' ? 4 : 20 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#046926',
            titleColor: '#eafbea',
            titleFont: { weight: '700' },
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (item) => `${item.formattedValue} ${Number(item.formattedValue) === 1 ? 'entry' : 'entries'}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#7c8b82',
              font: { size: 11 },
              autoSkip: true,
              maxTicksLimit: period === 'monthly' ? 10 : 7,
              maxRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#9aa8a1' },
            grid: { color: '#eef3ef', borderDash: [4, 4] },
            border: { display: false },
          },
        },
      },
      plugins: period === 'monthly' ? [] : [valueLabelsPlugin],
    });
  }

  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.period === period) return;
      toggleButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      period = btn.dataset.period;
      draw();
    });
  });

  prevBtn.addEventListener('click', () => {
    if (period === 'monthly') monthOffset -= 1; else weekOffset -= 1;
    draw();
  });

  nextBtn.addEventListener('click', () => {
    if (period === 'monthly') { if (monthOffset < 0) monthOffset += 1; }
    else if (weekOffset < 0) weekOffset += 1;
    draw();
  });

  draw();
}