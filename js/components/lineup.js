import { injectStyle } from '../utils/inject-style.js';

injectStyle('lineup', `
  .lineup-list { display: flex; flex-direction: column; gap: var(--sp-2xs); }
  .lineup-list__item { display: flex; align-items: center; gap: var(--sp-xs); padding: var(--sp-2xs) 0; border-bottom: 1px solid var(--color-line); }
  .lineup-list__number { font-family: var(--font-mono); font-weight: 700; width: 1.5em; color: var(--color-ridge-green); }
  .lineup-list__name { font-size: var(--fs-sm); font-weight: 600; }
  .lineup-list__position { font-size: var(--fs-xs); color: rgba(16,36,26,0.5); margin-left: auto; }
  .substitute-list__title { font-family: var(--font-mono); font-size: var(--fs-xs); text-transform: uppercase; color: rgba(16,36,26,0.5); margin: var(--sp-sm) 0 var(--sp-2xs); }
  .match-officials { display: flex; flex-direction: column; gap: var(--sp-3xs); font-size: var(--fs-sm); color: rgba(16,36,26,0.7); }
`);

export function startingXIList(players) {
  if (!players.length) return '';
  return `<div class="lineup-list">${players.map(p => `<div class="lineup-list__item"><span class="lineup-list__number">${p.number}</span><span class="lineup-list__name">${p.name}</span><span class="lineup-list__position">${p.position || ''}</span></div>`).join('')}</div>`;
}

export function substituteList(players) {
  if (!players.length) return '';
  return `<div class="substitute-list"><h3 class="substitute-list__title">Substitutes</h3><div class="lineup-list">${players.map(p => `<div class="lineup-list__item"><span class="lineup-list__number">${p.number}</span><span class="lineup-list__name">${p.name}</span><span class="lineup-list__position">${p.position || ''}</span></div>`).join('')}</div></div>`;
}

export function matchOfficials(officials) {
  const rows = [officials.referee && `Referee: ${officials.referee}`, officials.assistant1 && `Assistant: ${officials.assistant1}`, officials.assistant2 && `Assistant: ${officials.assistant2}`, officials.fourthOfficial && `Fourth Official: ${officials.fourthOfficial}`].filter(Boolean);
  if (!rows.length) return '';
  return `<div class="match-officials">${rows.map(r => `<span>${r}</span>`).join('')}</div>`;
}
