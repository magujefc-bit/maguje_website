import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { lazyImage, observeLazyImages } from "../components/lazy-image.js";
import { shareBar, bindShareBar } from "../components/controls.js";
import { formatPlainText } from "../utils/format-text.js";
import { injectStyle } from "../utils/inject-style.js";

injectStyle(
  "official-profile-view",
  `
  .official-profile {
    padding-block: var(--sp-lg);
  }

  .official-profile__photo {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    overflow: hidden;
    margin-inline: auto;
    margin-bottom: var(--sp-md);
  }

  .official-profile__photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .official-profile__role {
    text-align: center;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-ridge-green);
    margin-bottom: var(--sp-2xs);
  }

  .official-profile__name {
    text-align: center;
    font-size: var(--fs-2xl);
    margin-bottom: var(--sp-md);
  }

  .official-profile__bio {
    max-width: 65ch;
    margin-inline: auto;
    font-size: var(--fs-md);
    line-height: var(--lh-normal);
  }

  .official-profile__share {
    display: flex;
    justify-content: center;
    margin-block: var(--sp-md);
  }

  .official-profile__gallery {
    margin-top: var(--sp-lg);
  }

  .official-gallery__title {
    font-size: var(--fs-lg);
    margin-bottom: var(--sp-sm);
    text-align: center;
  }

  .official-gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-sm);
  }

  .official-gallery-item {
    display: block;
    aspect-ratio: 1 / 1;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-line);
  }

  .official-gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (min-width: 768px) {
    .official-profile__photo {
      width: 180px;
      height: 180px;
    }
  }
`,
);

export async function officialProfileView(params) {
  const { slug } = params;

  await viewContainer.renderSkeleton(
    `<div class="container"><div class="skel skel-block" style="width:140px;height:140px;border-radius:50%;margin-inline:auto;margin-bottom:var(--sp-md);"></div><div class="skel skel-block" style="height:200px;"></div></div>`,
  );

  const root = document.querySelector("#app");

  try {
    const { data: official, error } = await supabase
      .from("officials")
      .select("id, slug, full_name, official_role, photo_url, bio")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;

    if (!official) {
      await viewContainer.render(`
        <div class="container section" style="text-align:center;">
          <h1 class="text-display-xl">Official not found</h1>
          <a href="/officials" class="btn btn--primary" style="margin-top: var(--sp-md);">Back to Officials</a>
        </div>
      `);
      return { cleanup: null };
    }

    await renderProfile(root, official);
    return { cleanup: null };
  } catch (err) {
    console.error("[official-profile] load failed:", err);
    viewContainer.renderError("Could not load this official.", () =>
      officialProfileView(params),
    );
    return { cleanup: null };
  }
}

async function renderProfile(root, official) {
  const shareUrl = window.location.origin + "/officials/" + official.slug;

  await viewContainer.render(`
    <div class="container official-profile">

      <div class="official-profile__photo">
        ${lazyImage({
          src: official.photo_url,
          alt: official.full_name,
          aspect: "square",
        })}
      </div>

      ${
        official.official_role
          ? `<div class="official-profile__role">${official.official_role}</div>`
          : ""
      }

      <h1 class="official-profile__name">${official.full_name}</h1>

      ${
        official.bio
          ? `<div class="official-profile__bio">${formatPlainText(official.bio)}</div>`
          : ""
      }

      <div class="official-profile__share">
        ${shareBar(shareUrl, official.full_name)}
      </div>

      <div class="official-profile__gallery" data-slot="gallery">
        <h2 class="official-gallery__title">Gallery</h2>
        ${skeletons.standings(1)}
      </div>

    </div>
  `);

  observeLazyImages(root.querySelector(".official-profile__photo"));
  bindShareBar(root);

  await loadGallery(root, official.id, official.full_name);
}

async function loadGallery(root, officialId, name) {
  const gallerySlot = root.querySelector('[data-slot="gallery"]');

  try {
    const { data, error } = await supabase
      .from("media_participants")
      .select("media:media_library(slug, url)")
      .eq("participant_type", "official")
      .eq("participant_id", officialId);

    if (error) throw error;

    const items = (data || []).map((row) => row.media).filter(Boolean);

    if (!items.length) {
      gallerySlot.innerHTML = `
        <h2 class="official-gallery__title">Gallery</h2>
        ${states.empty({ message: `No featured image for ${name} yet.` })}
      `;
      return;
    }

    gallerySlot.innerHTML = `
      <h2 class="official-gallery__title">Gallery</h2>
      <div class="official-gallery-grid">
        ${items
          .map(
            (m) => `
              <a href="/gallery/${m.slug}" class="official-gallery-item">
                ${lazyImage({ src: m.url, alt: "", aspect: "square" })}
              </a>
            `,
          )
          .join("")}
      </div>
    `;

    observeLazyImages(gallerySlot);
  } catch (err) {
    console.error("[official-profile] gallery failed:", err);
    gallerySlot.innerHTML = `
      <h2 class="official-gallery__title">Gallery</h2>
      ${states.error()}
    `;
    states.bindRetry(gallerySlot, () => loadGallery(root, officialId, name));
  }
}


