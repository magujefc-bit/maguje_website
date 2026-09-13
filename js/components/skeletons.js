export const skeletons = {
  newsList(count = 6) {
    const card = `<div class="card skel-news-card"><div class="skel skel-block"></div><div class="skel skel-line skel-line--sm"></div><div class="skel skel-line skel-line--lg"></div><div class="skel skel-line skel-line--md"></div></div>`;
    return `<div class="grid grid--3">${card.repeat(count)}</div>`;
  },
  article() {
    return `
      <div class="container section--tight">
        <div class="skel skel-article__hero"></div>
        <div class="skel-article__meta"><div class="skel skel-line"></div><div class="skel skel-line"></div></div>
        <div class="skel skel-line skel-line--lg" style="height:2em; margin-bottom: var(--sp-sm);"></div>
        <div class="skel-article__body">
          <div class="skel skel-line skel-line--lg"></div><div class="skel skel-line skel-line--lg"></div>
          <div class="skel skel-line skel-line--md"></div><div class="skel skel-line skel-line--lg"></div>
          <div class="skel skel-line skel-line--sm"></div>
        </div>
      </div>`;
  },
  matchList(count = 4) {
    const card = `<div class="card skel-match-card"><div class="skel-match-card__team"><div class="skel skel-circle skel-match-card__crest"></div><div class="skel skel-line skel-line--sm"></div></div><div class="skel-match-card__score"></div><div class="skel-match-card__team"><div class="skel skel-circle skel-match-card__crest"></div><div class="skel skel-line skel-line--sm"></div></div></div>`;
    return `<div class="flex flex-col gap-sm">${card.repeat(count)}</div>`;
  },
  matchDetails() {
    return `
      <div class="container section--tight">
        <div class="card skel-match-card" style="margin-bottom: var(--sp-lg);"></div>
        <div class="skel skel-line skel-line--sm" style="height:1.5em; margin-bottom: var(--sp-sm);"></div>
        <div class="grid grid--2"><div class="skel skel-block" style="height:160px;"></div><div class="skel skel-block" style="height:160px;"></div></div>
      </div>`;
  },
  playerGrid(count = 8) {
    const card = `<div class="card skel-player-card"><div class="skel skel-block"></div><div class="skel skel-line skel-line--md"></div><div class="skel skel-line skel-line--sm"></div></div>`;
    return `<div class="grid grid--4">${card.repeat(count)}</div>`;
  },
  playerProfile() {
    return `
      <div class="container section--tight layout-split">
        <div><div class="skel skel-line skel-line--lg" style="height:2.5em; margin-bottom: var(--sp-sm);"></div><div class="skel skel-line skel-line--lg"></div><div class="skel skel-line skel-line--md"></div></div>
        <div class="skel skel-block" style="aspect-ratio: 3/4;"></div>
      </div>`;
  },
  standings(rows = 10) {
    const row = `<div class="skel-standings-row">${'<div class="skel skel-line"></div>'.repeat(7)}</div>`;
    return `<div class="card">${row.repeat(rows)}</div>`;
  },
  gallery(count = 9) {
    const tile = `<div class="skel skel-gallery-tile"></div>`;
    return `<div class="grid grid--3">${tile.repeat(count)}</div>`;
  },
  eventList(count = 4) {
    const card = `<div class="card skel-event-card"><div class="skel-event-card__date"></div><div class="skel-event-card__body"><div class="skel skel-line skel-line--lg"></div><div class="skel skel-line skel-line--md"></div><div class="skel skel-line skel-line--sm"></div></div></div>`;
    return `<div class="flex flex-col gap-sm">${card.repeat(count)}</div>`;
  },

  /* ---- Home page skeletons ---- */

  heroCarousel() {
    return `
      <div class="skel skel-block" style="aspect-ratio:16/9; border-radius: var(--radius-lg); position:relative; overflow:hidden;">
        <div class="skel skel-line skel-line--md" style="position:absolute; top:var(--sp-sm); left:var(--sp-sm); right:var(--sp-sm); height:1em; background:rgba(255,255,255,0.25);"></div>
        <div class="skel skel-line skel-line--lg" style="position:absolute; bottom:var(--sp-md); left:var(--sp-sm); right:var(--sp-sm); height:1.4em; background:rgba(255,255,255,0.25);"></div>
      </div>`;
  },
  kickoffPill() {
    return `<div class="skel skel-line" style="width:220px; max-width:80%; height:2.2em; border-radius:999px; margin-inline:auto; margin-bottom:var(--sp-sm);"></div>`;
  },
  fixtureCard() {
    return `<div class="card skel-match-card"><div class="skel-match-card__team"><div class="skel skel-circle skel-match-card__crest"></div><div class="skel skel-line skel-line--sm"></div></div><div class="skel-match-card__score"></div><div class="skel-match-card__team"><div class="skel skel-circle skel-match-card__crest"></div><div class="skel skel-line skel-line--sm"></div></div></div>`;
  },
  eventCard() {
    return `
      <div class="card" style="display:flex; gap:var(--sp-sm); align-items:center;">
        <div class="skel skel-block" style="width:56px; height:56px; flex-shrink:0; border-radius: var(--radius-sm);"></div>
        <div style="flex:1; min-width:0;">
          <div class="skel skel-line skel-line--lg" style="margin-bottom:var(--sp-3xs);"></div>
          <div class="skel skel-line skel-line--sm"></div>
        </div>
      </div>`;
  },
  spotlightRow(count = 2) {
    const card = `
      <div class="card" style="flex:1; min-width:0;">
        <div class="skel skel-line skel-line--sm" style="width:110px; height:1.4em; border-radius:999px; margin-bottom:var(--sp-sm);"></div>
        <div class="skel skel-circle" style="width:56px; height:56px; margin-bottom:var(--sp-xs);"></div>
        <div class="skel skel-line skel-line--md" style="margin-bottom:var(--sp-3xs);"></div>
        <div class="skel skel-line skel-line--sm"></div>
      </div>`;
    return `<div class="flex gap-sm">${card.repeat(count)}</div>`;
  },

  /* ---- Club Profile skeletons ---- */

  // Matches about.js's General tab: centered circular crest,
  // centered name/meta lines, then paragraph lines.
  clubGeneral() {
    return `
      <div style="text-align:center; margin-bottom:var(--sp-lg);">
        <div class="skel skel-circle" style="width:84px; height:84px; margin:0 auto var(--sp-sm);"></div>
        <div class="skel skel-line skel-line--md" style="width:160px; margin-inline:auto; margin-bottom:var(--sp-3xs);"></div>
        <div class="skel skel-line skel-line--sm" style="width:200px; margin-inline:auto;"></div>
      </div>
      <div class="skel skel-line skel-line--lg"></div>
      <div class="skel skel-line skel-line--lg"></div>
      <div class="skel skel-line skel-line--md"></div>`;
  },

  // Matches vision-mission.js's stacked label+paragraph blocks
  // (visionMissionSection's .vision-mission__block cards).
  labeledTextBlocks(count = 2) {
    const block = `
      <div class="card" style="margin-bottom:var(--sp-sm);">
        <div class="skel skel-line skel-line--sm" style="width:80px; margin-bottom:var(--sp-sm);"></div>
        <div class="skel skel-line skel-line--lg"></div>
        <div class="skel skel-line skel-line--lg"></div>
        <div class="skel skel-line skel-line--md"></div>
      </div>`;
    return block.repeat(count);
  },

  // Matches club-history.js's plain flowing article-style text.
  textBlock(lines = 6) {
    const widths = ['lg', 'lg', 'md', 'lg', 'sm', 'md'];
    return Array.from({ length: lines }, (_, i) =>
      `<div class="skel skel-line skel-line--${widths[i % widths.length]}"></div>`
    ).join('');
  },
};