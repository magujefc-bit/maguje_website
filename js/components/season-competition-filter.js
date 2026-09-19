import { injectStyle } from "../utils/inject-style.js";

injectStyle(
  "season-competition-filter",
  `
  .season-competition-filter {
    display: flex;
    align-items: center;
    gap: var(--sp-sm);
    flex-wrap: wrap;
  }
  .season-competition-filter__select {
    padding: var(--sp-xs) var(--sp-sm);
    border-radius: var(--radius-sm, 6px);
    border: 1px solid var(--color-border, #ddd);
    background: var(--color-surface, #fff);
    font-size: var(--fs-sm);
  }
`,
);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Pulls the largest 4-digit year out of a season string ("2024/2025" -> 2025,
// "2023" -> 2023) so seasons sort newest-first regardless of format.
function seasonSortKey(season) {
  const matches = String(season).match(/\d{4}/g);
  if (matches && matches.length) return Math.max(...matches.map(Number));
  return -Infinity;
}

function uniqueSeasons(competitions) {
  const seen = new Set();
  competitions.forEach((c) => {
    if (c.season) seen.add(c.season);
  });
  return Array.from(seen).sort((a, b) => seasonSortKey(b) - seasonSortKey(a));
}

function competitionsForSeason(competitions, season) {
  return competitions.filter((c) => c.season === season);
}

export function mostRecentSeason(competitions) {
  const seasons = uniqueSeasons(competitions);
  return seasons.length ? seasons[0] : null;
}

function competitionOptionsMarkup(seasonCompetitions, activeCompetitionId) {
  return [
    `<option value="all" ${activeCompetitionId === "all" ? "selected" : ""}>All Competitions</option>`,
    ...seasonCompetitions.map(
      (c) =>
        `<option value="${escapeHtml(c.id)}" ${c.id === activeCompetitionId ? "selected" : ""}>${escapeHtml(c.name)}</option>`,
    ),
  ].join("");
}

export function seasonCompetitionFilter(competitions, { activeSeason, activeCompetitionId }) {
  const seasons = uniqueSeasons(competitions);
  const seasonCompetitions = competitionsForSeason(competitions, activeSeason);

  const seasonOptions = seasons
    .map(
      (s) =>
        `<option value="${escapeHtml(s)}" ${s === activeSeason ? "selected" : ""}>${escapeHtml(s)}</option>`,
    )
    .join("");

  return `
    <div class="season-competition-filter">
      <select class="season-competition-filter__select" data-role="season-select">
        ${seasonOptions}
      </select>
      <select class="season-competition-filter__select" data-role="competition-select">
        ${competitionOptionsMarkup(seasonCompetitions, activeCompetitionId)}
      </select>
    </div>
  `;
}

export function bindSeasonCompetitionFilter(root, competitions, onChange) {
  const seasonSelect = root.querySelector('[data-role="season-select"]');
  const competitionSelect = root.querySelector('[data-role="competition-select"]');

  if (!seasonSelect || !competitionSelect) return;

  seasonSelect.addEventListener("change", () => {
    const season = seasonSelect.value;
    const seasonCompetitions = competitionsForSeason(competitions, season);
    competitionSelect.innerHTML = competitionOptionsMarkup(seasonCompetitions, "all");
    onChange(season, "all");
  });

  competitionSelect.addEventListener("change", () => {
    onChange(seasonSelect.value, competitionSelect.value);
  });
}