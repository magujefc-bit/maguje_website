import "./home-shared.js";
import { supabase } from "../../supabase-client.js";
import { newsCard } from "../../components/news-card.js";
import { states } from "../../components/states.js";
import { observeLazyImages } from "../../components/lazy-image.js";
import { initCarousel } from "../../components/carousel.js";
import { fetchOverlayGradients } from "../../utils/overlay.js";
import { fetchFirstMedia } from "./home-data.js";
import { carouselNavButtons, wireCarouselNav } from "./home-shared.js";

const MAX_NEWS = 4;

/*
 * Trim news body to a maximum of 8 words.
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
 * NEWS SECTION — self-contained fetch + render, same pattern as
 * the original loadSecondaryNews(). Not part of the shared
 * home-data.js layer since nothing else on the page needs this
 * data.
 *
 * Returns { cleanup, advance } once resolved — advance only
 * present with 2+ slides. Returns undefined on empty state or
 * error (nothing to clean up or advance in either case).
 *
 * Note on retry: the error state's retry button calls this
 * function again recursively. That re-render correctly clears
 * nav buttons before re-adding them (see the querySelectorAll
 * cleanup below) so a retry can't duplicate buttons — but the
 * *carousel instance* from a failed-then-retried render isn't
 * threaded back through home.js's registerSection(), since the
 * retry call isn't awaited by anything outside this file. This
 * mirrors a pre-existing gap from before this split (the original
 * loadSecondaryNews() had the same orphaned-instance-on-retry
 * behavior) — not introduced here, not fixed here either.
 */
export async function renderNewsSection(root) {
  const wrapEl = root.querySelector('[data-slot="news-carousel-wrap"]');
  const carouselRoot = wrapEl?.querySelector('[data-slot="news-carousel"]');
  const track = carouselRoot?.querySelector("[data-track]");

  if (!wrapEl || !track) return undefined;

  try {
    const { data, error } = await supabase
      .from("news_posts")
      .select("id, slug, title, body, created_at, cover_overlay_id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(MAX_NEWS);

    if (error) throw error;

    if (!data?.length) {
      track.innerHTML = states.empty({
        message: "More updates coming soon.",
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
        const cover = await fetchFirstMedia("news", post.id);

        return `<div class="carousel__slide">${newsCard({
          slug: post.slug,
          title: post.title,
          excerpt: trimToEightWords(post.body),
          coverImageUrl: cover,
          publishedAt: post.created_at,
          overlayGradient:
            overlayMap.get(post.cover_overlay_id) || null,
        })}</div>`;
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
    console.error("[home] news section failed:", err);

    track.innerHTML = states.error();

    clearNavButtons(wrapEl);

    states.bindRetry(track, () => renderNewsSection(root));

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