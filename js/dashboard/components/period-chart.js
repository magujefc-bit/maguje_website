// js/dashboard/components/period-chart.js
// Shared weekly/monthly analytics block used by both the Installs and
// Supporters pages (and, later, the match-analytics pages): a period
// control bar (Weekly/Monthly + prev/next nav) sitting above a bar chart
// and a pie chart that both redraw together whenever the period changes.
// Takes raw ISO timestamps + the all-time total and handles bucketing,
// zero-filling, and the period-vs-total split itself — each page only
// has to fetch its own timestamp column and total count.
import { loadChart } from './chart-loader.js';
import { injectStyle } from '../utils/inject-style.js';

injectStyle('period-chart-shared', `
  /* ---- Controls bar: sits after the stat-hero, above both charts ---- */
  .period-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.7rem; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 0.7rem 0.9rem; margin-bottom: 1.2rem; }

  .period-controls__toggle { display: flex; gap: 0.25rem; background: #f2f7f3; padding: 4px; border-radius: 999px; }
  .period-controls__btn { padding: 0.4rem 1rem; border: none; background: transparent; border-radius: 999px; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: #5c6b62; transition: background 0.2s ease, color 0.2s ease; }
  .period-controls__btn:hover { color: #109b45; }
  .period-controls__btn.active { background: #109b45; color: #fff; box-shadow: 0 2px 8px rgba(16,155,69,0.35); }
  .period-controls__btn.active:hover { color: #fff; }

  .period-controls__nav { display: flex; align-items: center; gap: 0.6rem; }
  .period-controls__nav-btn { width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; border: 1px solid #d8e3dc; background: #fff; color: #109b45; font-size: 1rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease, transform 0.1s ease; }
  .period-controls__nav-btn:hover { background: #eaf6ee; }
  .period-controls__nav-btn:active { transform: scale(0.92); }
  .period-controls__nav-btn.is-hidden { visibility: hidden; pointer-events: none; }
  .period-controls__title { font-size: 0.82rem; font-weight: 700; color: #046926; min-width: 108px; text-align: center; white-space: nowrap; }

  @media (max-width: 480px) {
    .period-controls { justify-content: center; }
    .period-controls__toggle, .period-controls__nav { flex: 1 1 100%; justify-content: center; }
  }

  /* ---- Chart grid: bar + pie side by side on wide screens, stacked on mobile ----
     minmax(0, …) on every track (including the mobile 1-column fallback) is
     required, not decorative — a bare "1fr" track has an implicit min-width
     equal to its content's min-content size, which is exactly what let the
     bar chart blow out its column and stretch the whole page. */
  .period-charts-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 1rem; margin-bottom: 1.5rem; min-width: 0; }
  @media (max-width: 720px) {
    .period-charts-grid { grid-template-columns: minmax(0, 1fr); }
  }

  .period-chart-card, .period-pie-card { background: #fff; border-radius: 14px; box-shadow: 0 4px 18px rgba(4,105,38,0.08); padding: 1.2rem; display: flex; flex-direction: column; min-width: 0; }

  /* Bar chart. Always sized to 100% of its card — never forced wider — so
     it can never stretch the page; the monthly view instead fits all ~30
     bars into that same width by drawing them thinner (see maxBarThickness
     in period-chart.js) and shortening the chart itself (.is-compact),
     since this chart is a quick-glance visual, not the source of truth —
     the table below it has the exact numbers. overflow-x:auto stays on as
     a harmless fallback, not the primary mechanism. */
  .period-chart__canvas-wrap { height: 260px; overflow-x: auto; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain; }
  .period-chart__canvas-wrap.is-compact { height: 190px; }
  .period-chart__canvas-inner { height: 100%; width: 100%; position: relative; }

  /* Pie chart */
  .period-pie__caption { font-size: 0.8rem; font-weight: 700; color: #5c6b62; margin-bottom: 0.8rem; text-align: center; }
  .period-pie__canvas-wrap { height: 160px; position: relative; margin: 0 auto 1rem; max-width: 160px; }
  .period-pie__legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .period-pie__legend li { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #444; }
  .period-pie__dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
  .period-pie__legend-label { flex: 1; }
  .period-pie__legend-value { font-weight: 700; color: #222; }
  .period-pie__empty { text-align: center; color: #999; font-size: 0.85rem; padding: 2rem 0; }
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

/** One bucket per calendar day, 1st through the last day of the month —
 *  every day is listed, including days with zero records. */
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
 * Renders a period control bar (Weekly/Monthly + prev/next) followed by a
 * bar chart and a pie chart, both driven by the same period selection.
 *
 * @param container   element to render into
 * @param timestamps  ISO date strings (or anything `new Date()` accepts) —
 *                    every `installed_at` / `created_at` value being charted
 * @param total       the all-time total count (for the pie's "vs total"
 *                    slice) — pass `null` if it's unknown/failed to load
 * @param options.barColor    brand color for the bar chart / pie's period slice
 * @param options.entityLabel plural noun used in tooltips and the pie legend
 *                             (e.g. "installs", "supporters")
 */
export async function renderPeriodChart(container, timestamps, total, { barColor = '#109b45', entityLabel = 'entries' } = {}) {
  container.innerHTML = `
    <div class="period-controls">
      <div class="period-controls__toggle">
        <button type="button" class="period-controls__btn active" data-period="weekly">Weekly</button>
        <button type="button" class="period-controls__btn" data-period="monthly">Monthly</button>
      </div>
      <div class="period-controls__nav">
        <button type="button" class="period-controls__nav-btn" data-dir="prev" aria-label="Previous period">&#8249;</button>
        <span class="period-controls__title"></span>
        <button type="button" class="period-controls__nav-btn" data-dir="next" aria-label="Next period">&#8250;</button>
      </div>
    </div>

    <div class="period-charts-grid">
      <div class="period-chart-card">
        <div class="period-chart__canvas-wrap"><div class="period-chart__canvas-inner"><canvas></canvas></div></div>
      </div>
      <div class="period-pie-card">
        <div class="period-pie__caption"></div>
        <div class="period-pie__canvas-wrap"><canvas></canvas></div>
        <ul class="period-pie__legend"></ul>
      </div>
    </div>
  `;

  const toggleButtons = container.querySelectorAll('.period-controls__btn');
  const titleEl = container.querySelector('.period-controls__title');
  const prevBtn = container.querySelector('.period-controls__nav-btn[data-dir="prev"]');
  const nextBtn = container.querySelector('.period-controls__nav-btn[data-dir="next"]');

  const barWrap = container.querySelector('.period-chart__canvas-wrap');
  const barInner = container.querySelector('.period-chart__canvas-inner');
  const barCanvas = barInner.querySelector('canvas');

  const pieCaption = container.querySelector('.period-pie__caption');
  const pieCanvas = container.querySelector('.period-pie__canvas-wrap canvas');
  const pieLegend = container.querySelector('.period-pie__legend');

  let Chart;
  try {
    Chart = await loadChart();
  } catch (err) {
    console.error('[period-chart] Chart.js failed to load:', err);
    container.innerHTML = '<p class="empty-msg">Could not load the chart. Please check your connection and retry.</p>';
    return;
  }

  let barInstance = null;
  let pieInstance = null;
  let period = 'weekly';
  let weekOffset = 0;  // 0 = current week, negative = weeks back
  let monthOffset = 0; // 0 = current month, negative = months back

  // Draws the count above each bar. Skipped on the monthly view (up to 31
  // bars, each already labelled by day) where it would just be clutter.
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

  // Draws the "42%" center label on the pie/doughnut. Reads its value from
  // options.plugins.centerLabel, set when the chart is constructed.
  const centerLabelPlugin = {
    id: 'centerLabel',
    afterDraw(chart) {
      const pct = chart.options?.plugins?.centerLabel?.pct;
      if (pct == null) return;
      const { ctx, chartArea } = chart;
      const x = (chartArea.left + chartArea.right) / 2;
      const y = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      ctx.fillStyle = '#046926';
      ctx.font = '700 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${pct}%`, x, y);
      ctx.restore();
    },
  };

  function currentView() {
    if (period === 'monthly') {
      const now = new Date();
      const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const buckets = bucketMonthDays(timestamps, monthDate);
      return { buckets, title: monthTitle(monthDate), atPresent: monthOffset === 0, caption: 'This month vs. total' };
    }
    const weekStart = new Date(startOfWeek(new Date()).getTime() + weekOffset * 7 * DAY_MS);
    const buckets = bucketWeekDays(timestamps, weekStart);
    return { buckets, title: weekTitle(weekStart), atPresent: weekOffset === 0, caption: 'This week vs. total' };
  }

  function drawBar(buckets) {
    // Monthly view gets a shorter chart — it's a quick-glance visual, not
    // where anyone reads exact numbers (the table below has those), so a
    // smaller footprint on mobile matters more than a tall canvas.
    barWrap.classList.toggle('is-compact', period === 'monthly');

    const ctx = barCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, barWrap.clientHeight || 260);
    gradient.addColorStop(0, barColor);
    gradient.addColorStop(1, '#0a6e30');

    if (barInstance) barInstance.destroy();
    barInstance = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: buckets.map((b) => b.label),
        datasets: [{
          data: buckets.map((b) => b.count),
          backgroundColor: gradient,
          hoverBackgroundColor: '#ffb703',
          borderRadius: period === 'monthly' ? 3 : 6,
          borderSkipped: false,
          // Monthly always fits all ~30 bars into the same width as the
          // 7-bar weekly view, so each bar has to be much thinner.
          maxBarThickness: period === 'monthly' ? 10 : 40,
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
              label: (item) => `${item.formattedValue} ${Number(item.formattedValue) === 1 ? entityLabel.replace(/s$/, '') : entityLabel}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#7c8b82',
              font: { size: 10 },
              // Every day still gets its own bar (see bucketMonthDays) —
              // this only thins out the text labels underneath so ~30 of
              // them don't overlap into an unreadable smear on a phone.
              autoSkip: true,
              maxTicksLimit: period === 'monthly' ? 8 : 7,
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

  function drawPie(periodCount, caption) {
    pieCaption.textContent = caption;

    if (total == null || total === 0) {
      if (pieInstance) { pieInstance.destroy(); pieInstance = null; }
      pieLegend.innerHTML = '';
      pieCanvas.style.display = 'none';
      pieLegend.innerHTML = `<li class="period-pie__empty">No data yet.</li>`;
      return;
    }
    pieCanvas.style.display = '';

    const rest = Math.max(total - periodCount, 0);
    const pct = Math.round((periodCount / total) * 100);

    if (pieInstance) pieInstance.destroy();
    pieInstance = new Chart(pieCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Selected period', 'Rest of total'],
        datasets: [{
          data: [periodCount, rest],
          backgroundColor: [barColor, '#e2ece5'],
          hoverBackgroundColor: ['#ffb703', '#d3ded6'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: { duration: 550, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          centerLabel: { pct },
          tooltip: {
            backgroundColor: '#046926',
            titleColor: '#eafbea',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (item) => `${item.formattedValue} ${entityLabel}`,
            },
          },
        },
      },
      plugins: [centerLabelPlugin],
    });

    pieLegend.innerHTML = `
      <li><span class="period-pie__dot" style="background:${barColor}"></span><span class="period-pie__legend-label">Selected period</span><span class="period-pie__legend-value">${periodCount}</span></li>
      <li><span class="period-pie__dot" style="background:#d3ded6"></span><span class="period-pie__legend-label">Rest of total</span><span class="period-pie__legend-value">${rest}</span></li>
    `;
  }

  function draw() {
    const { buckets, title, atPresent, caption } = currentView();
    titleEl.textContent = title;
    nextBtn.classList.toggle('is-hidden', atPresent);

    const periodCount = buckets.reduce((sum, b) => sum + b.count, 0);
    drawBar(buckets);
    drawPie(periodCount, caption);
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