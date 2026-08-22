import { injectStyle } from '../utils/inject-style.js';

injectStyle('event-card', `
  .event-card { display: flex; gap: var(--sp-sm); background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--sp-sm); transition: border-color var(--dur-fast) var(--ease-standard); }
  .event-card:hover { border-color: var(--color-ridge-green); }
  .event-card__date { flex-shrink: 0; width: 56px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--color-pitch-shadow); color: var(--color-summit-white); border-radius: var(--radius-sm); }
  .event-card__date-day { font-family: var(--font-display); font-size: var(--fs-md); line-height: 1; }
  .event-card__date-month { font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; color: var(--color-trophy-gold); }
  .event-card__body { display: flex; flex-direction: column; gap: var(--sp-3xs); min-width: 0; }
  .event-card__title { font-size: var(--fs-md); }
  .event-card__meta { font-size: var(--fs-sm); color: rgba(16,36,26,0.6); }
`);

export function eventCard(event) {
  const d = event.startAt ? new Date(event.startAt) : null;
  const day = d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-KE', { day: '2-digit', timeZone: 'Africa/Nairobi' }) : '–';
  const month = d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-KE', { month: 'short', timeZone: 'Africa/Nairobi' }) : '';
  return `
    <a href="/events/${event.slug}" class="event-card">
      <div class="event-card__date"><span class="event-card__date-day">${day}</span><span class="event-card__date-month">${month}</span></div>
      <div class="event-card__body"><h3 class="event-card__title">${event.title}</h3><span class="event-card__meta">${event.location || 'Location TBD'}</span></div>
    </a>`;
}
