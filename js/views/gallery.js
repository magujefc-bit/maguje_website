import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { galleryCard } from "../components/gallery-card.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";

injectStyle(
  "gallery-view",
  `
  /* =========================================================
     GALLERY HEADER
     ========================================================= */

  .gallery-view-header {
    padding-block: var(--sp-md) var(--sp-sm);
  }

  .gallery-view-title {
    font-size: var(--fs-2xl);
    line-height: 1.05;
    margin: 0;
  }


  /* =========================================================
     GALLERY GRID
     ========================================================= */

  .gallery-view-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--sp-sm);
    padding-bottom: var(--sp-md);
  }


  /* =========================================================
     GALLERY CARDS
     ========================================================= */

  .gallery-view-grid > * {
    min-width: 0;
    width: 100%;
    overflow: hidden;
  }


  /*
   * Keep gallery images compact and consistent.
   *
   * The object-fit: cover prevents portrait/landscape images
   * from making one gallery item extremely tall.
   */

  .gallery-view-grid img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    height: auto;
    object-fit: cover;
    object-position: center;
  }


  /*
   * If the gallery card has an image wrapper, make sure
   * the wrapper also respects the same compact ratio.
   */

  .gallery-view-grid [class*="gallery-card"] {
    min-width: 0;
    overflow: hidden;
  }


  .gallery-view-grid [class*="gallery-card"] img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }


  /* =========================================================
     LOAD MORE
     ========================================================= */

  .gallery-load-more {
    display: flex;
    justify-content: center;
    padding-block: var(--sp-sm) var(--sp-xl);
  }


  /* =========================================================
     TABLET
     ========================================================= */

  @media (min-width: 768px) {

    .gallery-view-header {
      padding-block: var(--sp-lg) var(--sp-md);
    }

    .gallery-view-title {
      font-size: var(--fs-2xl);
    }

    .gallery-view-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--sp-md);
    }

    .gallery-view-grid img,
    .gallery-view-grid [class*="gallery-card"] img {
      aspect-ratio: 4 / 3;
    }
  }


  /* =========================================================
     DESKTOP
     ========================================================= */

  @media (min-width: 1024px) {

    .gallery-view-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--sp-md);
    }
  }


  /* =========================================================
     LARGE DESKTOP
     ========================================================= */

  @media (min-width: 1200px) {

    .gallery-view-grid {
      gap: var(--sp-lg);
    }

    .gallery-view-title {
      font-size: var(--fs-3xl);
    }
  }


  /* =========================================================
     VERY SMALL PHONES
     ========================================================= */

  @media (max-width: 380px) {

    .gallery-view-header {
      padding-block: var(--sp-sm) var(--sp-xs);
    }

    .gallery-view-title {
      font-size: var(--fs-xl);
    }

    .gallery-view-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--sp-xs);
    }

    .gallery-view-grid img,
    .gallery-view-grid [class*="gallery-card"] img {
      aspect-ratio: 4 / 3;
    }
  }
`,
);

const PAGE_SIZE = 12;

export async function galleryView() {
  let allItems = [];
  let visibleCount = PAGE_SIZE;

  await viewContainer.render(`
    <div class="container">

      <!-- =================================================
           HEADER
           ================================================= -->

      <div class="gallery-view-header">
        <h1 class="gallery-view-title">
          Gallery
        </h1>
      </div>


      <!-- =================================================
           GALLERY GRID
           ================================================= -->

      <div
        class="gallery-view-grid"
        data-slot="grid"
      >
        ${skeletons.gallery(6)}
      </div>


      <!-- =================================================
           LOAD MORE
           ================================================= -->

      <div data-slot="load-more"></div>

    </div>
  `);

  const root = document.querySelector("#app");

  await loadMedia(root);

  return {
    cleanup: null,
  };


  /* =========================================================
     LOAD MEDIA
     ========================================================= */

  async function loadMedia(root) {
    const slot = root.querySelector(
      '[data-slot="grid"]',
    );

    try {
      const {
        data,
        error,
      } = await supabase
        .from("media_library")
        .select(
          "slug, url, created_at",
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

      if (error) {
        throw error;
      }

      allItems = data || [];

      renderGrid(root);

    } catch (err) {
      console.error(
        "[gallery] load failed:",
        err,
      );

      slot.innerHTML =
        states.error();

      states.bindRetry(
        slot,
        () => loadMedia(root),
      );
    }
  }


  /* =========================================================
     RENDER GRID
     ========================================================= */

  function renderGrid(root) {
    const slot =
      root.querySelector(
        '[data-slot="grid"]',
      );

    const loadMoreSlot =
      root.querySelector(
        '[data-slot="load-more"]',
      );


    /* -------------------------------------------------------
       EMPTY STATE
       ------------------------------------------------------- */

    if (!allItems.length) {
      slot.innerHTML =
        states.empty({
          message:
            "No photos yet. Check back soon.",
        });

      loadMoreSlot.innerHTML = "";

      return;
    }


    /* -------------------------------------------------------
       VISIBLE ITEMS
       ------------------------------------------------------- */

    const visible =
      allItems.slice(
        0,
        visibleCount,
      );


    /* -------------------------------------------------------
       CARDS
       ------------------------------------------------------- */

    slot.innerHTML =
      visible
        .map(
          (item) =>
            galleryCard({
              slug: item.slug,
              thumbnailUrl:
                item.url,
              caption: "",
            }),
        )
        .join("");


    /* -------------------------------------------------------
       LAZY IMAGES
       ------------------------------------------------------- */

    observeLazyImages(slot);


    /* -------------------------------------------------------
       LOAD MORE
       ------------------------------------------------------- */

    if (
      allItems.length >
      visibleCount
    ) {
      loadMoreSlot.innerHTML = `
        <div class="gallery-load-more">

          <button
            type="button"
            class="btn btn--secondary"
            data-load-more
          >
            Load more photos
          </button>

        </div>
      `;

      const button =
        loadMoreSlot.querySelector(
          "[data-load-more]",
        );

      button.addEventListener(
        "click",
        () => {
          visibleCount += PAGE_SIZE;
          renderGrid(root);
        },
      );

    } else {
      loadMoreSlot.innerHTML = "";
    }
  }
}