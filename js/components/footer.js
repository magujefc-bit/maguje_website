import { supabase } from "../supabase-client.js";

const QUICK_LINKS = [
  { label: "Fixtures", path: "/fixtures" },
  { label: "Results", path: "/results" },
  { label: "Standings", path: "/standings" },
  { label: "Players", path: "/players" },
  { label: "Head to Head", path: "/results/head-to-head" },
  { label: "Gallery", path: "/gallery" },
  { label: "Club Profile", path: "/club-profile" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", path: "/privacy" },
  { label: "Terms of Service", path: "/terms" },
  { label: "Contact", path: "/contact" },
  { label: "Report an Issue", path: "/report-issue" },
  { label: "Admin Login", path: "/maguje-dashboard/login" },
];

const CLUB_LINKS = [
  { label: "About Maguje FC", path: "/club-profile" },
  { label: "Club History", path: "/club-profile/history" },
  { label: "Vision & Mission", path: "/club-profile/mission-vision" },
  { label: "Officials", path: "/officials" },
  { label: "Honours", path: "/club-records/honours" },
  { label: "Join Supporters", path: "/supporters" },
];


/* =========================================================
   DAILY DEVELOPER IMAGE
   Pulled from the "developer-images" folder inside the
   existing "club-assets" Supabase Storage bucket, instead of
   a hardcoded list — add or remove images there directly,
   no code changes needed. Sorted by upload date so the daily
   pick stays stable and predictable as images are added.
========================================================= */

export async function getDailyDeveloperImage() {
  const { data, error } = await supabase.storage
    .from("club-assets")
    .list("developer-images", {
      sortBy: { column: "created_at", order: "asc" },
    });

  if (error) {
    console.error("[footer] could not load developer images:", error);
    return null;
  }

  // Supabase Storage can include a hidden placeholder file for empty
  // folders — filter that out, and anything that isn't an image.
  const imageFiles = (data || []).filter((f) =>
    /\.(png|jpe?g|webp|gif)$/i.test(f.name),
  );

  if (!imageFiles.length) return null;

  const today = new Date();

  const dateString =
    `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  let hash = 0;

  for (let i = 0; i < dateString.length; i++) {
    hash =
      ((hash << 5) - hash) +
      dateString.charCodeAt(i);

    hash |= 0;
  }

  const index =
    Math.abs(hash) % imageFiles.length;

  const chosenFile = imageFiles[index];

  const { data: urlData } = supabase.storage
    .from("club-assets")
    .getPublicUrl(`developer-images/${chosenFile.name}`);

  return urlData.publicUrl;
}


class Footer {

  constructor(rootSelector = "#site-footer") {
    this.root =
      document.querySelector(rootSelector);

    this.developerObserver = null;
    this.developerSection = null;
    this.animationTimer = null;
    this.restartTimer = null;
  }


  async mount() {

    if (!this.root) {
      console.error(
        "[footer] #site-footer was not found."
      );

      return;
    }


    /*
      Initial footer render.
      This allows the footer to appear immediately
      while Supabase data loads.
    */

    this.root.innerHTML =
      this._template({
        social: [],
        contacts: [],
        developerImageUrl: null,
      });


    this._setupDeveloperAnimation();


    try {

      const [
        { data: social, error: socialError },
        { data: contacts, error: contactsError },
        developerImageUrl,
      ] = await Promise.all([

        supabase
          .from("club_social_links")
          .select("platform, url")
          .limit(6),

        supabase
          .from("club_contacts")
          .select("type, value"),

        getDailyDeveloperImage(),

      ]);


      if (socialError) {

        console.error(
          "[footer] social links error:",
          socialError
        );

      }


      if (contactsError) {

        console.error(
          "[footer] contacts error:",
          contactsError
        );

      }


      /*
        Replace the temporary footer with the
        Supabase-loaded footer.
      */

      this.root.innerHTML =
        this._template({
          social: social || [],
          contacts: contacts || [],
          developerImageUrl,
        });


      /*
        The footer was replaced, so the observer
        must be connected to the new developer section.
      */

      this._setupDeveloperAnimation();


    } catch (err) {

      console.error(
        "[footer] failed to load club data:",
        err
      );

    }

  }


  /* =========================================================
     DEVELOPER ANIMATION SETUP
  ========================================================= */

  _setupDeveloperAnimation() {

    /*
      Clean up any previous observer.
    */

    if (this.developerObserver) {

      this.developerObserver.disconnect();

      this.developerObserver = null;

    }


    /*
      Clean up any previous timers.
    */

    if (this.animationTimer) {

      clearTimeout(
        this.animationTimer
      );

      this.animationTimer = null;

    }


    if (this.restartTimer) {

      clearTimeout(
        this.restartTimer
      );

      this.restartTimer = null;

    }


    this.developerSection =
      this.root.querySelector(
        ".footer__developer"
      );


    if (!this.developerSection) {
      return;
    }


    /*
      Animation only starts when the section
      is actually visible.
    */

    this.developerObserver =
      new IntersectionObserver(

        (entries) => {

          entries.forEach((entry) => {

            if (entry.isIntersecting) {

              this._startDeveloperCycle();

            } else {

              this._stopDeveloperCycle();

            }

          });

        },

        {
          threshold: 0.35
        }

      );


    this.developerObserver.observe(
      this.developerSection
    );

  }


  /* =========================================================
     START 20-SECOND CYCLE
  ========================================================= */

  _startDeveloperCycle() {

    if (!this.developerSection) {
      return;
    }


    /*
      Don't create duplicate cycles.
    */

    if (
      this.developerSection.classList.contains(
        "footer__developer--active"
      )
    ) {

      return;

    }


    this.developerSection.classList.add(
      "footer__developer--active"
    );


    /*
      Force the animation to restart
      from the beginning.
    */

    this.developerSection.classList.remove(
      "footer__developer--cycle"
    );


    void this.developerSection.offsetWidth;


    this.developerSection.classList.add(
      "footer__developer--cycle"
    );


    /*
      Full animation cycle = 20 seconds.
    */

    this.animationTimer =
      setTimeout(() => {

        if (!this.developerSection) {
          return;
        }


        this.developerSection.classList.remove(
          "footer__developer--cycle"
        );

        this.developerSection.classList.remove(
          "footer__developer--active"
        );


        /*
          Small pause before starting
          the next cycle.
        */

        this.restartTimer =
          setTimeout(() => {

            if (
              this.developerSection &&
              this._isDeveloperVisible()
            ) {

              this._startDeveloperCycle();

            }

          }, 250);


      }, 20000);

  }


  /* =========================================================
     STOP WHEN SECTION LEAVES VIEWPORT
  ========================================================= */

  _stopDeveloperCycle() {

    if (this.animationTimer) {

      clearTimeout(
        this.animationTimer
      );

      this.animationTimer = null;

    }


    if (this.restartTimer) {

      clearTimeout(
        this.restartTimer
      );

      this.restartTimer = null;

    }


    if (!this.developerSection) {
      return;
    }


    this.developerSection.classList.remove(
      "footer__developer--active"
    );

    this.developerSection.classList.remove(
      "footer__developer--cycle"
    );

  }


  /* =========================================================
     CHECK VISIBILITY
  ========================================================= */

  _isDeveloperVisible() {

    if (!this.developerSection) {
      return false;
    }


    const rect =
      this.developerSection.getBoundingClientRect();


    return (
      rect.top < window.innerHeight &&
      rect.bottom > 0
    );

  }


  /* =========================================================
     FOOTER TEMPLATE
  ========================================================= */

  _template({ social, contacts, developerImageUrl }) {

    return `

      <style>

        /* =====================================================
           DEVELOPER SECTION
        ===================================================== */

        .footer__developer {

          position: relative;

          width: 100%;

          margin: 48px 0 34px;

          display: flex;

          justify-content: center;

          align-items: center;

          text-decoration: none;

          color: inherit;

          overflow: hidden;

          cursor: pointer;

          -webkit-tap-highlight-color: transparent;

        }


        .footer__developer-inner {

          width: min(100%, 460px);

          min-height: 260px;

          padding: 28px 24px 30px;

          box-sizing: border-box;

          display: flex;

          flex-direction: column;

          justify-content: center;

          align-items: center;

          text-align: center;

          border-radius: 18px;

          transition:
            transform 0.3s ease,
            background 0.3s ease;

        }


        .footer__developer:hover
        .footer__developer-inner {

          transform:
            translateY(-3px);

        }


        /* =====================================================
           DEVELOPED BY LABEL
        ===================================================== */

        .footer__developer-label {

          margin: 0 0 10px;

          font-size: 10px;

          line-height: 1.2;

          font-weight: 700;

          letter-spacing: 0.18em;

          text-transform: uppercase;

          opacity: 0.65;

        }


        /* =====================================================
           DEVELOPER NAME
        ===================================================== */

        .footer__developer-name {

          margin: 0;

          font-size:
            clamp(20px, 4vw, 28px);

          line-height: 1.15;

          font-weight: 700;

          letter-spacing: -0.02em;

          opacity: 0;

          transform:
            translateY(-45px)
            rotateX(70deg);

          transform-origin:
            center bottom;

          will-change:
            transform,
            opacity;

        }


        /* =====================================================
           DEVELOPER IMAGE
        ===================================================== */

        .footer__developer-image-wrap {

          width: 110px;

          height: 110px;

          margin-top: 18px;

          border-radius: 50%;

          overflow: hidden;

          opacity: 0;

          transform:
            translateY(45px)
            scale(0.8);

          will-change:
            transform,
            opacity;

          box-shadow:
            0 8px 30px
            rgba(0, 0, 0, 0.18);

        }


        .footer__developer-image {

          width: 100%;

          height: 100%;

          display: block;

          object-fit: cover;

        }


        /* =====================================================
           VIEW DEVELOPER CTA
        ===================================================== */

        .footer__developer-cta {

          margin-top: 14px;

          font-size: 11px;

          font-weight: 700;

          letter-spacing: 0.12em;

          text-transform: uppercase;

          opacity: 0.55;

          display: inline-flex;

          align-items: center;

          gap: 6px;

          transition:
            opacity 0.3s ease,
            gap 0.3s ease;

        }


        .footer__developer:hover
        .footer__developer-cta {

          opacity: 0.9;

          gap: 9px;

        }


        /* =====================================================
           20 SECOND ANIMATION
        ===================================================== */


        .footer__developer--cycle
        .footer__developer-name {

          animation:
            developerNameCycle
            20s
            ease-in-out
            forwards;

        }


        .footer__developer--cycle
        .footer__developer-image-wrap {

          animation:
            developerImageCycle
            20s
            ease-in-out
            forwards;

        }


        /* =====================================================
           NAME ANIMATION
        ===================================================== */

        @keyframes developerNameCycle {

          /*
            Start hidden above.
          */

          0% {

            opacity: 0;

            transform:
              translateY(-45px)
              rotateX(70deg);

          }


          /*
            Name rolls into position.
          */

          6% {

            opacity: 1;

            transform:
              translateY(0)
              rotateX(0);

          }


          /*
            Stay visible.
          */

          82% {

            opacity: 1;

            transform:
              translateY(0)
              rotateX(0);

          }


          /*
            Disappear toward the end.
          */

          100% {

            opacity: 0;

            transform:
              translateY(-25px)
              rotateX(-20deg);

          }

        }


        /* =====================================================
           IMAGE ANIMATION
        ===================================================== */

        @keyframes developerImageCycle {

          /*
            Start below.
          */

          0% {

            opacity: 0;

            transform:
              translateY(45px)
              scale(0.8);

          }


          /*
            Image settles underneath the name.
          */

          10% {

            opacity: 1;

            transform:
              translateY(0)
              scale(1);

          }


          /*
            Stay visible.
          */

          82% {

            opacity: 1;

            transform:
              translateY(0)
              scale(1);

          }


          /*
            Disappear toward the end.
          */

          100% {

            opacity: 0;

            transform:
              translateY(25px)
              scale(0.9);

          }

        }


        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 600px) {

          .footer__developer {

            margin:
              32px 0 24px;

          }


          .footer__developer-inner {

            width: 100%;

            min-height: 225px;

            padding:
              24px 18px 26px;

          }


          .footer__developer-name {

            font-size: 21px;

          }


          .footer__developer-image-wrap {

            width: 88px;

            height: 88px;

            margin-top: 15px;

          }

        }


        /* =====================================================
           TABLET
        ===================================================== */

        @media
        (min-width: 601px)
        and
        (max-width: 1024px) {

          .footer__developer {

            margin:
              38px 0 28px;

          }


          .footer__developer-inner {

            width:
              min(100%, 460px);

            min-height: 240px;

          }

        }


        /* =====================================================
           DESKTOP
        ===================================================== */

        @media (min-width: 1025px) {

          .footer__developer {

            margin:
              48px 0 34px;

          }


          .footer__developer-inner {

            width: 460px;

            min-height: 260px;

          }


          .footer__developer-image-wrap {

            width: 110px;

            height: 110px;

          }

        }


        /* =====================================================
           ACCESSIBILITY
        ===================================================== */

        @media (prefers-reduced-motion: reduce) {

          .footer__developer-name,
          .footer__developer-image-wrap {

            opacity: 1;

            transform: none;

            animation: none !important;

          }


          .footer__developer-inner {

            transition: none;

          }

        }

      </style>


      <div class="footer__inner container">


        <!-- =================================================
             FOOTER TOP
        ================================================== -->

        <div class="footer__top grid grid--4">


          <!-- BRAND -->

          <div class="footer__brand-block">

            
              href="/"
              class="footer__brand"
            >

              <img
                src="/assets/maguje-crest.png"
                alt=""
                class="footer__crest"
                width="48"
                height="48"
              >

              <span
                class="text-display-lg footer__wordmark"
              >
                Maguje FC
              </span>

            </a>


            <p
              class="text-body-sm footer__tagline"
            >
              Rooted in the community.
              Playing for Nyaoko.
            </p>

          </div>


          <!-- QUICK LINKS -->

          <div class="footer__col">

            <h3
              class="text-mono-xs footer__col-title"
            >
              Quick Links
            </h3>


            <ul class="footer__link-list">

              ${QUICK_LINKS.map((l) => `

                <li>

                  
                    href="${l.path}"
                    class="footer__link"
                  >
                    ${l.label}
                  </a>

                </li>

              `).join("")}

            </ul>

          </div>


          <!-- CLUB -->

          <div class="footer__col">

            <h3
              class="text-mono-xs footer__col-title"
            >
              Club
            </h3>


            <ul class="footer__link-list">

              ${CLUB_LINKS.map((l) => `

                <li>

                  
                    href="${l.path}"
                    class="footer__link"
                  >
                    ${l.label}
                  </a>

                </li>

              `).join("")}

            </ul>

          </div>


          <!-- CONTACT -->

          <div class="footer__col">

            <h3
              class="text-mono-xs footer__col-title"
            >
              Get in Touch
            </h3>


            ${
              contacts.length

                ? `

                  <ul
                    class="footer__contact-list"
                  >

                    ${contacts.map((c) => `

                      <li>

                        ${
                          c.type === "email"

                            ? `

                              
                                href="mailto:${c.value}"
                                class="footer__link"
                                data-external
                              >
                                ${c.value}
                              </a>

                            `

                            : c.type === "phone"

                              ? `

                                
                                  href="tel:${c.value}"
                                  class="footer__link"
                                  data-external
                                >
                                  ${c.value}
                                </a>

                              `

                              : `

                                <span
                                  class="footer__address"
                                >
                                  ${c.value}
                                </span>

                              `
                        }

                      </li>

                    `).join("")}

                  </ul>

                `

                : `

                  <p
                    class="text-body-sm footer__muted"
                  >
                    Contact details coming soon.
                  </p>

                `
            }


            ${
              social.length

                ? `

                  <div
                    class="footer__social"
                    aria-label="Social media links"
                  >

                    ${social.map((s) => `

                      
                        href="${s.url}"
                        class="footer__social-link"
                        data-external
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="${s.platform}"
                      >
                        ${s.platform}
                      </a>

                    `).join("")}

                  </div>

                `

                : ""

            }

          </div>

        </div>


        <!-- =================================================
             DEVELOPER SECTION
        ================================================== -->

        
          href="/developer"
          class="footer__developer"
          aria-label="Developed by Victor Onyango — view developer profile"
        >

          <div class="footer__developer-inner">


            <p
              class="footer__developer-label"
            >
              Developed By
            </p>


            <h4
              class="footer__developer-name"
            >
              Victor Onyango
            </h4>


            ${
              developerImageUrl

                ? `

                  <div
                    class="footer__developer-image-wrap"
                  >

                    <img
                      src="${developerImageUrl}"
                      alt="Victor Onyango Odiwuor"
                      class="footer__developer-image"
                      loading="lazy"
                    >

                  </div>

                `

                : ""

            }


            <span class="footer__developer-cta">
              View Developer
              <span aria-hidden="true">→</span>
            </span>


          </div>

        </a>


        <!-- =================================================
             FOOTER BOTTOM
        ================================================== -->

        <div class="footer__bottom">


          <p
            class="text-body-sm footer__copyright"
          >
            © ${new Date().getFullYear()}
            Maguje FC.
            All rights reserved.
          </p>


          <ul class="footer__legal-list">

            ${LEGAL_LINKS.map((l) => `

              <li>

                
                  href="${l.path}"
                  class="footer__legal-link"
                >
                  ${l.label}
                </a>

              </li>

            `).join("")}

          </ul>


        </div>


      </div>

    `;

  }

}


export const footer =
  new Footer("#site-footer");
