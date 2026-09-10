import "./home-shared.js";
import { spotlightCard, spotlightPlaceholderCard } from "../../components/spotlight-card.js";
import { initCarousel } from "../../components/carousel.js";
import { observeLazyImages } from "../../components/lazy-image.js";
import { carouselNavButtons, wireCarouselNav } from "./home-shared.js";

/*
 * SPOTLIGHT SECTION — standalone, no longer feeds hero slides.
 * Always renders (placeholder cards if nothing eligible), same
 * as the original home.js behavior.
 *
 * Nav buttons + auto-scroll participation only apply when there
 * are 2+ slides — a lone card gets no buttons and isn't part of
 * the shared advance() sweep.
 *
 * Movement is driven entirely by the shared orchestrator's 15s
 * advance() calls (autoplay: false here) — Spotlight no longer
 * has its own independent autoplay timer like it did before this
 * split, when it rotated on its own ~7s cycle.
 *
 * Returns { cleanup, advance } — advance only present with 2+
 * slides. Returns undefined if the wrap slot isn't in the DOM
 * (shouldn't happen given home.js's skeleton, but matches every
 * other section's defensive early-return).
 */
export function renderSpotlightSection(root, spotlightItems) {
  const wrapEl = root.querySelector('[data-slot="spotlight-carousel-wrap"]');
  const carouselRoot = wrapEl?.querySelector('[data-slot="spotlight-carousel"]');
  const track = carouselRoot?.querySelector("[data-track]");
  if (!wrapEl || !track) return undefined;

  let cardsHtml = (spotlightItems || []).map((item) =>
    spotlightCard({
      label: item.label,
      playerName: item.playerName,
      photoUrl: item.photoUrl,
      playerSlug: item.playerSlug,
      statLine: item.statLine,
      meta: item.meta,
    }),
  );

  if (!cardsHtml.length) {
    cardsHtml = [spotlightPlaceholderCard(), spotlightPlaceholderCard()];
  }

  track.innerHTML = cardsHtml.map((c) => `<div class="carousel__slide">${c}</div>`).join("");
  observeLazyImages(track);

  const instance = initCarousel(carouselRoot, { autoplay: false });

  const hasMultiple = cardsHtml.length > 1;

  if (hasMultiple) {
    wrapEl.insertAdjacentHTML("afterbegin", carouselNavButtons());
    wireCarouselNav(wrapEl, instance);
  }

  return {
    cleanup() {
      instance.destroy();
    },
    advance: hasMultiple ? instance.advance : undefined,
  };
}