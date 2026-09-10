import { injectStyle } from "../../utils/inject-style.js";

/*
 * Shared markup styles for home-page sections that use the
 * title + optional "see all →" link header pattern: Spotlight,
 * News, Match Reports. Events and Fixtures render conditionally
 * and don't use this header shape, so they don't import this.
 */
injectStyle(
  "home-shared",
  `
  .home-section {
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }

  .home-section__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sp-sm);
    margin-bottom: var(--sp-sm);
    min-width: 0;
  }

  .home-section__title { font-size: var(--fs-xl); min-width: 0; }

  .home-section__link {
    flex: 0 0 auto;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-ridge-green);
    white-space: nowrap;
  }
`,
);