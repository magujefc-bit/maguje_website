import { injectStyle } from '../utils/inject-style.js';

injectStyle('team-picker', `
  .team-picker { position: relative; }
  .team-picker__input { width: 100%; padding: var(--sp-xs) var(--sp-sm); border: 1px solid var(--color-line); border-radius: var(--radius-md); font-size: var(--fs-sm); }
  .team-picker__list { position: absolute; z-index: 5; top: calc(100% + 4px); left: 0; right: 0; max-height: 220px; overflow-y: auto; background: var(--color-summit-white); border: 1px solid var(--color-line); border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .team-picker__list[hidden] { display: none; }
  .team-picker__item { padding: var(--sp-xs) var(--sp-sm); font-size: var(--fs-sm); cursor: pointer; }
  .team-picker__item:hover { background: rgba(16,155,69,0.08); }
`);

/*
 * Type-to-search team picker, selecting only from an already-known
 * list of teams — no "create new team" flow, unlike the dashboard's
 * version of this pattern (that's an admin-only concern during
 * match creation). Renders its own input + suggestion list into
 * containerEl.
 *
 * options.teams: array of { id, name, logo_url }
 * options.placeholder: input placeholder text
 * options.onSelect(team | null): called whenever the selection
 *   changes — a team object once the user picks a real match from
 *   the list, or null the moment they type anything that
 *   invalidates the previous selection.
 */
export function attachTeamPicker(containerEl, { teams, placeholder = 'Search teams…', onSelect }) {
  containerEl.innerHTML = `
    <div class="team-picker">
      <input type="text" class="team-picker__input" placeholder="${placeholder}" autocomplete="off">
      <div class="team-picker__list" hidden></div>
    </div>
  `;

  const input = containerEl.querySelector('.team-picker__input');
  const list = containerEl.querySelector('.team-picker__list');

  function setSelected(team) {
    onSelect(team);
  }

  input.addEventListener('input', () => {
    setSelected(null);
    const query = input.value.trim().toLowerCase();
    if (!query) { list.hidden = true; list.innerHTML = ''; return; }

    const matches = teams.filter((t) => t.name.toLowerCase().includes(query)).slice(0, 8);
    if (!matches.length) { list.hidden = true; list.innerHTML = ''; return; }

    list.innerHTML = matches.map((t) => `<div class="team-picker__item" data-id="${t.id}">${t.name}</div>`).join('');
    list.hidden = false;

    list.querySelectorAll('.team-picker__item').forEach((item) => {
      item.addEventListener('click', () => {
        const team = teams.find((t) => String(t.id) === item.dataset.id);
        input.value = team.name;
        list.hidden = true;
        setSelected(team);
      });
    });
  });

  document.addEventListener('click', (e) => {
    if (!containerEl.contains(e.target)) list.hidden = true;
  });

  return {
    clear() {
      input.value = '';
      list.hidden = true;
      list.innerHTML = '';
      setSelected(null);
    },
  };
}

