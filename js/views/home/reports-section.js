import "./home-shared.js";
import { supabase } from "../../supabase-client.js";
import { newsCard } from "../../components/news-card.js";
import { states } from "../../components/states.js";
import { observeLazyImages } from "../../components/lazy-image.js";
import { initCarousel } from "../../components/carousel.js";
import { fetchOverlayGradients } from "../../utils/overlay.js";
import { excerptFrom } from "../../utils/format.js";
import { fetchFirstMedia } from "./home-data.js";

const MAX_MATCH_REPORTS = 4;

/*
 * MATCH REPORTS SECTION — self-contained fetch + render, same
 * pattern as news-section.js and the original
 * loadFeaturedMatchReport(). Reuses newsCard() with a basePath
 * override, same as the original did.
 */
export async function renderReportsSection(root) {
  const carouselRoot = root.querySelector('[data-slot="reports-carousel"]');
  const track = carouselRoot?.querySelector("[data-track]");
  if (!track) return undefined;

  try {
    const { data, error } = await supabase
      .from("match_report_posts")
      .select("id, slug, title, body, created_at, cover_overlay_id")
      .order("created_at", { ascending: false })
      .limit(MAX_MATCH_REPORTS);

    if (error) throw error;

    if (!data?.length) {
      track.innerHTML = states.empty({ message: "No match reports yet — check back after the next game." });
      return undefined;
    }

    const overlayMap = await fetchOverlayGradients(supabase, data.map((p) => p.cover_overlay_id));

    const cards = await Promise.all(
      data.map(async (post) => {
        const cover = await fetchFirstMedia("match_report", post.id);
        return `<div class="carousel__slide">${newsCard(
          {
            slug: post.slug,
            title: post.title,
            excerpt: excerptFrom(post.body),
            coverImageUrl: cover,
            publishedAt: post.created_at,
            overlayGradient: overlayMap.get(post.cover_overlay_id) || null,
          },
          { basePath: "/match-reports", badge: "Match Report" },
        )}</div>`;
      }),
    );

    track.innerHTML = cards.join("");
    observeLazyImages(track);

    const instance = initCarousel(carouselRoot);
    return () => instance.destroy();
  } catch (err) {
    console.error("[home] match reports section failed:", err);
    track.innerHTML = states.error();
    states.bindRetry(track, () => renderReportsSection(root));
    return undefined;
  }
}