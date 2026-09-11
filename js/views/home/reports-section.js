import "./home-shared.js";
import { supabase } from "../../supabase-client.js";
import { newsCard } from "../../components/news-card.js";
import { states } from "../../components/states.js";
import { observeLazyImages } from "../../components/lazy-image.js";
import { initCarousel } from "../../components/carousel.js";
import { fetchOverlayGradients } from "../../utils/overlay.js";
import { fetchFirstMedia } from "./home-data.js";
import { carouselNavButtons, wireCarouselNav } from "./home-shared.js";

const MAX_MATCH_REPORTS = 4;

/*
 * Trim match report body to a maximum of 8 words.
 * Adds "..." only when the original text contains more than 8 words.
 */
function trimToEightWords(text) {
  if (!text) return "";

  const words = text.trim().split(/\s+/);

  return words.length > 8
    ? words.slice(0, 8).join(" ") + "..."
    : text.trim();
}

/*
 * MATCH REPORTS SECTION — self-contained fetch + render, same
 * pattern as news-section.js and the original
 * loadFeaturedMatchReport(). Reuses newsCard() with a basePath
 * override, same as the original did.
 *
 * Returns { cleanup, advance } once resolved — advance only
 * present with 2+ slides. Returns undefined on empty state or
 * error. Same retry/orphaned-instance caveat as news-section.js
 * applies here (pre-existing, not introduced by this split).
 */
export async function renderReportsSection(root) {
  const wrapEl = root.querySelector('[data-slot="reports-carousel-wrap"]');
  const carouselRoot = wrapEl?.querySelector('[data-slot="reports-carousel"]');
  const track = carouselRoot?.querySelector("[data-track]");

  if (!wrapEl || !track) return undefined;

  try {
    const { data, error } = await supabase
      .from("match_report_posts")
      .select("id, slug, title, body, created_at, cover_overlay_id")
      .order("created_at", { ascending: false })
      .limit(MAX_MATCH_REPORTS);

    if (error) throw error;

    if (!data?.length) {
      track.innerHTML = states.empty({
        message: "No match reports yet — check back after the next game.",
      });

      clearNavButtons(wrapEl);
      return undefined;
    }

    const overlayMap = await fetchOverlayGradients(
      supabase,
      data.map((p) => p.cover_overlay_id),
    );

    const cards = await Promise.all(
      data.map(async (post) => {
        const cover = await fetchFirstMedia("match_report", post.id);

        return `<div class="carousel__slide">${newsCard(
          {
            slug: post.slug,
            title: post.title,
            excerpt: trimToEightWords(post.body),
            coverImageUrl: cover,
            publishedAt: post.created_at,
            overlayGradient:
              overlayMap.get(post.cover_overlay_id) || null,
          },
          {
            basePath: "/match-reports",
            badge: "Match Report",
          },
        )}</div>`;
      }),
    );

    track.innerHTML = cards.join("");

    observeLazyImages(track);

    const instance = initCarousel(carouselRoot, {
      autoplay: false,
    });

    const hasMultiple = cards.length > 1;

    clearNavButtons(wrapEl);

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
  } catch (err) {
    console.error("[home] match reports section failed:", err);

    track.innerHTML = states.error();

    clearNavButtons(wrapEl);

    states.bindRetry(track, () => renderReportsSection(root));

    return undefined;
  }
}

// Removes any nav buttons left over from a previous render of this
// section before deciding whether to add fresh ones — prevents
// duplicate buttons piling up if this section re-renders (e.g. on
// retry after an error).
function clearNavButtons(wrapEl) {
  wrapEl.querySelectorAll("[data-nav]").forEach((el) => el.remove());
}