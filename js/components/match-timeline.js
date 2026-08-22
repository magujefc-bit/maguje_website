import { injectStyle } from '../utils/inject-style.js';

injectStyle('match-timeline', `
  .timeline { display: flex; flex-direction: column; border-left: 2px solid var(--color-line); margin-left: var(--sp-sm); }
  .timeline-event { position: relative; display: flex; align-items: center; gap: var(--sp-sm); padding: var(--sp-xs) 0 var(--sp-xs) var(--sp-md); }
  .timeline-event::before { content: ''; position: absolute; left: -6px; top: 50%; transform: translateY(-50%); width: 10px; height: 10px; border-radius: 50%; background: var(--color-summit-white); border: 2px solid var(--color-ridge-green); }
  .timeline-event__minute { font-family: var(--font-mono); font-size: var(--fs-sm); font-weight: 700; color: var(--color-ridge-green); min-width: 2.5em; text-align: right; }
  .timeline-event__icon { flex-shrink: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
  .timeline-event__detail { font-size: var(--fs-sm); }
  .timeline-event__player { font-weight: 600; }
  .timeline-event__sub-note { color: rgba(16,36,26,0.6); font-size: var(--fs-xs); }
  .icon-goal { color: var(--color-ridge-green); font-weight: 700; }
  .icon-card-yellow { width: 12px; height: 16px; background: #E8C22E; border-radius: 2px; }
  .icon-card-red { width: 12px; height: 16px; background: var(--color-error); border-radius: 2px; }
  .icon-sub-in { color: var(--color-ridge-green); }
  .icon-sub-out { color: var(--color-error); }
`);

export function matchTimeline(events) {
  if (!events.length) return '';
  return `<div class="timeline">${events.map(timelineEvent).join('')}</div>`;
}

function timelineEvent(e) {
  switch (e.type) {
    case 'goal':
      return eventRow(e.minute, `<span class="icon-goal">⚽</span>`, `<span class="timeline-event__player">${e.player}</span> scored${e.assistBy ? ` <span class="timeline-event__sub-note">(assist: ${e.assistBy})</span>` : ''}`);
    case 'card':
      return eventRow(e.minute, `<span class="icon-card-${e.cardType}"></span>`, `<span class="timeline-event__player">${e.player}</span> booked${e.cardType === 'red' ? ' — sent off' : ''}`);
    case 'substitution':
      return eventRow(e.minute, `<span class="icon-sub-in">↑</span>`, `<span class="timeline-event__player">${e.player}</span> on, <span class="timeline-event__sub-note">${e.playerOut} off</span>`);
    default:
      return '';
  }
}

function eventRow(minute, icon, detail) {
  return `<div class="timeline-event"><span class="timeline-event__minute">${minute}'</span><span class="timeline-event__icon">${icon}</span><span class="timeline-event__detail">${detail}</span></div>`;
}
