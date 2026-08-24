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

  /* ---- New for home page rebuild ---- */

  heroCarousel() {
    return `<div class="skel skel-block" style="height:280px; border-radius: var(--radius-lg);"></div>`;
  },
  fixtureCard() {
    return `<div class="card skel-match-card"><div class="skel-match-card__team"><div class="skel skel-circle skel-match-card__crest"></div><div class="skel skel-line skel-line--sm"></div></div><div class="skel-match-card__score"></div><div class="skel-match-card__team"><div class="skel skel-circle skel-match-card__crest"></div><div class="skel skel-line skel-line--sm"></div></div></div>`;
  },
  spotlightRow(count = 2) {
    const card = `<div class="skel skel-block" style="height:140px; flex:1;"></div>`;
    return `<div class="flex gap-sm">${card.repeat(count)}</div>`;
  },
};
