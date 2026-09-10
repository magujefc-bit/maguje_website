import { liveIndicator } from "../../components/controls.js";
import { initCarousel } from "../../components/carousel.js";
import { injectStyle } from "../../utils/inject-style.js";
import { combineDateTime, escapeHtml } from "../../utils/format.js";

injectStyle(
  "hero-section",
  `
  .home-hero {
    position: relative;
    background-color: var(--color-pitch-shadow);
    background-size: cover;
    background-position: center;
    border-radius: var(--radius-lg);
    overflow: hidden;
    min-height: 280px;
    width: 100%;
  }

  .home-hero__overlay {
    position: absolute;
    inset: 0;
    z-index: 0;
    background: linear-gradient(
      180deg,
      rgba(9, 38, 20, 0.82) 0%,
      rgba(16, 155, 69, 0.55) 60%,
      rgba(9, 38, 20, 0.85) 100%
    );
  }

  .home-hero__greeting {
    position: relative;
    z-index: 2;
    padding: var(--sp-lg) var(--sp-lg) 0;
  }

  .home-hero__greeting-crest {
    width: clamp(48px, 12vw, 64px);
    height: auto;
    margin-bottom: var(--sp-xs);
  }

  .home-hero__greeting-title {
    color: var(--color-summit-white);
    margin: 0;
    text-shadow: 0 1px 3px rgba(0,0,0,0.35);
  }

  .home-hero-carousel {
    position: relative;
    z-index: 1;
  }

  .home-hero-carousel .carousel__track {
    height: 160px;
  }

  .home-hero-slide {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: var(--sp-md) var(--sp-lg) var(--sp-lg);
    height: 100%;
  }

  .home-hero-slide__title {
    color: var(--color-summit-white);
    margin-bottom: var(--sp-2xs);
    text-shadow: 0 1px 3px rgba(0,0,0,0.35);
  }

  .home-hero-slide__text {
    color: rgba(247,249,246,0.9);
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }

  .home-hero-slide__badge {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-3xs);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    color: var(--color-summit-white);
    background: rgba(0,0,0,0.25);
    padding: 2px var(--sp-2xs);
    border-radius: 999px;
    margin-bottom: var(--sp-xs);
    width: fit-content;
  }

  .home-hero-slide__badge--live { color: var(--color-live); }
`,
);

/*
 * HERO — greeting is static chrome, pinned above the carousel,
 * never part of the sliding track. Carousel rotates: live match
 * slide (if any) + one slide per upcoming match in the array,
 * no time restriction. News, reports, and spotlight are not part
 * of hero rotation — they're their own standalone sections.
 */
export function renderHeroSection(root, { liveMatch, upcomingMatches, heroImageUrl }, cleanupFns) {
  const heroWrap = root.querySelector('[data-slot="hero-wrap"]');
  if (!heroWrap) return;

  const slides = [];

  if (liveMatch) {
    slides.push(liveSlide(liveMatch));
  }

  for (const match of upcomingMatches || []) {
    slides.push(upcomingSlide(match));
  }

  if (!slides.length) {
    slides.push(`
      <div class="home-hero-slide">
        <h2 class="text-display-md home-hero-slide__title">Rooted in the community</h2>
        <p class="text-body-sm home-hero-slide__text">Playing for the ridge.</p>
      </div>
    `);
  }

  const bgStyle = heroImageUrl ? ` style="background-image: url('${heroImageUrl}');"` : "";

  heroWrap.innerHTML = `
    <div class="home-hero"${bgStyle}>
      <div class="home-hero__overlay"></div>
      <div class="home-hero__greeting">
        <img src="/assets/maguje-crest.png" alt="" class="home-hero__greeting-crest">
        <h1 class="text-display-lg home-hero__greeting-title">${getGreeting()}, welcome to Maguje FC</h1>
      </div>
      <div class="home-hero-carousel carousel" data-slot="hero-carousel">
        <div class="carousel__track" data-track>
          ${slides.map((s) => `<div class="carousel__slide">${s}</div>`).join("")}
        </div>
      </div>
    </div>
  `;

  const carouselRoot = heroWrap.querySelector('[data-slot="hero-carousel"]');
  const instance = initCarousel(carouselRoot);
  cleanupFns.push(() => instance.destroy());
}

function liveSlide(match) {
  const opponentName = match.opponent?.name || "our opponents";
  const venueBit = match.is_home === false ? ` at ${match.venue || opponentName + "'s ground"}` : "";
  return `
    <div class="home-hero-slide">
      <span class="home-hero-slide__badge home-hero-slide__badge--live">${liveIndicator("Live")}</span>
      <h2 class="text-display-md home-hero-slide__title">Maguje is playing ${escapeHtml(opponentName)}${venueBit}</h2>
      <p class="text-body-sm home-hero-slide__text">Don't miss live updates for this match.</p>
    </div>
  `;
}

function upcomingSlide(match) {
  const opponentName = match.opponent?.name || "our opponents";
  const venueBit = match.is_home === false ? ` at ${match.venue || opponentName + "'s ground"}` : "";
  const kickoff = combineDateTime(match.match_date, match.match_time);
  const kickoffLabel = kickoff
    ? new Date(kickoff).toLocaleString("en-KE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })
    : "soon";
  return `
    <div class="home-hero-slide">
      <h2 class="text-display-md home-hero-slide__title">Maguje will play ${escapeHtml(opponentName)}${venueBit}, at ${kickoffLabel}</h2>
      <p class="text-body-sm home-hero-slide__text">Come support our boys — live updates might also be available, stay tuned.</p>
    </div>
  `;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}