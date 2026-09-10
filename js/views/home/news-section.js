import "./home-shared.js";
import { supabase } from "../../supabase-client.js";
import { newsCard } from "../../components/news-card.js";
import { states } from "../../components/states.js";
import { observeLazyImages } from "../../components/lazy-image.js";
import { initCarousel } from "../../components/carousel.js";
import { fetchOverlayGradients } from "../../utils/overlay.js";
import { excerptFrom } from "../../utils/format.js";
import { fetchFirstMedia } from "./home-data.js";

const MAX_NEWS = 4;

/*
 * NEWS SECTION — self-contained fetch + render, same pattern as
 * the original loadSecondaryNews(). Not part of the shared
 * home-data.js layer since nothing else on the page needs this
 * data — no benefit to routing it through the shared fetch step.
 */
export async function renderNewsSection(root) {
  const carouselRoot = root.querySelector('[data-slot="news-carousel"]');
  const track = carouselRoot?.querySelector("[data-track]");
  if (!track) return undefined;

  try {
    const { data, error } = await supabase
      .from("news_posts")
      .select("id, slug, title, body, created_at, cover_overlay_id")
      .order("created_at", { ascending: false })
      .limit(MAX_NEWS);

    if (error) throw error;

    if (!data?.length) {
      track.innerHTML = states.empty({ message: "More updates coming soon." });
      return undefined;
    }

    const overlayMap = await fetchOverlayGradients(supabase, data.map((p) => p.cover_overlay_id));

    const cards = await Promise.all(
      data.map(async (post) => {
        const cover = await fetchFirstMedia("news", post.id);
        return `<div class="carousel__slide">${newsCard({
          slug: post.slug,
          title: post.title,
          excerpt: excerptFrom(post.body),
          coverImageUrl: cover,
          publishedAt: post.created_at,
          overlayGradient: overlayMap.get(post.cover_overlay_id) || null,
        })}</div>`;
      }),
    );

    track.innerHTML = cards.join("");
    observeLazyImages(track);

    const instance = initCarousel(carouselRoot);
    return () => instance.destroy();
  } catch (err) {
    console.error("[home] news section failed:", err);
    track.innerHTML = states.error();
    states.bindRetry(track, () => renderNewsSection(root));
    return undefined;
  }
}