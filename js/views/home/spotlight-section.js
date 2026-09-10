import "./home-shared.js";
import { spotlightCard, spotlightPlaceholderCard } from "../../components/spotlight-card.js";
import { initCarousel } from "../../components/carousel.js";
import { observeLazyImages } from "../../components/lazy-image.js";

/*
 * SPOTLIGHT SECTION — standalone, no longer feeds hero slides.
 * Always renders (placeholder cards if nothing eligible), same
 * as the original home.js behavior.
 */
export function renderSpotlightSection(root, spotlightItems) {
  const carouselRoot = root.querySelector('[data-slot="spotlight-carousel"]');
  const track = carouselRoot?.querySelector("[data-track]");
  if (!track) return undefined;

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

  const instance = initCarousel(carouselRoot);
  return () => instance.destroy();
}