const NAV_GROUPS = [
  {
    title: "Club",
    items: [
      { label: "Home", path: "/" },
      { label: "Club Profile", path: "/club-profile" },
      { label: "Club All-Time Records", path: "/club-records" },
      { label: "Officials", path: "/officials" },
      { label: "Players", path: "/players" },
    ],
  },
  {
    title: "Matches",
    items: [
      { label: "Fixtures", path: "/fixtures" },
      { label: "Results", path: "/results" },
      { label: "Standings", path: "/standings" },
      { label: "Head to Head", path: "/results/head-to-head" },
      { label: "Competitions", path: "/competitions" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "News", path: "/news" },
      { label: "Match Reports", path: "/match-reports" },
      { label: "Gallery", path: "/gallery" },
      { label: "Events", path: "/events" },
    ],
  },
  {
    title: "More",
    items: [
      { label: "Contact", path: "/contact" },
      { label: "Admin Login", path: "/maguje-dashboard/login" },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

class Header {
  constructor(rootSelector = "#site-header") {
    this.root = document.querySelector(rootSelector);
    this.menuOpen = false;
    this._onRouteAfter = this._onRouteAfter.bind(this);
  }

  mount() {
    this.root.innerHTML = this._template();
    this._bindEvents();
    this._setActive(window.location.pathname);
    document.addEventListener("route:after", this._onRouteAfter);
  }

  _template() {
    return `
      <div class="header__bar container">
        <a href="/" class="header__brand" aria-label="Maguje FC home">
          <img
            src="/assets/maguje-crest.png"
            alt=""
            class="header__crest"
            width="40"
            height="40"
          >

          <span class="header__wordmark text-display-lg">
            Maguje FC
          </span>
        </a>

        <nav
          class="nav nav--desktop show-desktop-up"
          aria-label="Primary"
        >
          <ul class="nav__list">
            ${NAV_ITEMS.map((item) => `
              <li>
                
                  href="${item.path}"
                  class="nav__link"
                  data-path="${item.path}"
                >
                  ${item.label}
                </a>
              </li>
            `).join("")}
          </ul>
        </nav>

        <nav
          class="nav nav--tablet show-tablet-up hide-desktop-up"
          aria-label="Primary"
        >
          <ul class="nav__list nav__list--tablet">
            ${NAV_ITEMS.slice(0, 6).map((item) => `
              <li>
                
                  href="${item.path}"
                  class="nav__link"
                  data-path="${item.path}"
                >
                  ${item.label}
                </a>
              </li>
            `).join("")}

            <li>
              <button
                type="button"
                class="nav__link nav__more"
                data-menu-toggle
                aria-expanded="false"
                aria-controls="mobile-menu"
              >
                More
              </button>
            </li>
          </ul>
        </nav>

        
          href="/search"
          class="header__search-btn"
          data-path="/search"
          aria-label="Search"
        >
          <span aria-hidden="true">🔍</span>
        </a>

        <button
          type="button"
          class="header__menu-btn show-mobile-only"
          data-menu-toggle
          aria-expanded="false"
          aria-controls="mobile-menu"
          aria-label="Open menu"
        >
          <span
            class="header__menu-icon"
            aria-hidden="true"
          ></span>
        </button>
      </div>

      <div
        class="mobile-menu"
        id="mobile-menu"
        data-mobile-menu
        hidden
      >
        <nav aria-label="Mobile primary">
          ${NAV_GROUPS.map((group) => `
            <div class="mobile-menu__group">
              <p class="mobile-menu__group-title">${group.title}</p>
              <ul class="mobile-menu__list">
                ${group.items.map((item) => `
                  <li>
                    
                      href="${item.path}"
                      class="mobile-menu__link"
                      data-path="${item.path}"
                    >
                      ${item.label}
                    </a>
                  </li>
                `).join("")}
              </ul>
            </div>
          `).join("")}
        </nav>
      </div>

      <div
        class="mobile-menu__backdrop"
        data-menu-backdrop
        hidden
      ></div>
    `;
  }

  _bindEvents() {
    this.root
      .querySelectorAll("[data-menu-toggle]")
      .forEach((btn) =>
        btn.addEventListener("click", () => this._toggleMenu()),
      );

    const backdrop = document.querySelector("[data-menu-backdrop]");

    backdrop.addEventListener("click", () =>
      this._closeMenu(),
    );

    document
      .querySelectorAll("[data-mobile-menu] a")
      .forEach((link) =>
        link.addEventListener("click", () =>
          this._closeMenu(),
        ),
      );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.menuOpen) {
        this._closeMenu();
      }
    });
  }

  _toggleMenu() {
    this.menuOpen
      ? this._closeMenu()
      : this._openMenu();
  }

  _openMenu() {
    this.menuOpen = true;

    const menu = document.querySelector("[data-mobile-menu]");
    const backdrop = document.querySelector("[data-menu-backdrop]");

    menu.hidden = false;
    backdrop.hidden = false;

    requestAnimationFrame(() => {
      menu.classList.add("mobile-menu--open");
      backdrop.classList.add("mobile-menu__backdrop--open");
    });

    document.body.style.overflow = "hidden";

    this.root
      .querySelectorAll("[data-menu-toggle]")
      .forEach((btn) =>
        btn.setAttribute("aria-expanded", "true"),
      );
  }

  _closeMenu() {
    this.menuOpen = false;

    const menu = document.querySelector("[data-mobile-menu]");
    const backdrop = document.querySelector("[data-menu-backdrop]");

    menu.classList.remove("mobile-menu--open");
    backdrop.classList.remove("mobile-menu__backdrop--open");

    document.body.style.overflow = "";

    this.root
      .querySelectorAll("[data-menu-toggle]")
      .forEach((btn) =>
        btn.setAttribute("aria-expanded", "false"),
      );

    window.setTimeout(() => {
      if (!this.menuOpen) {
        menu.hidden = true;
        backdrop.hidden = true;
      }
    }, 220);
  }

  _onRouteAfter(e) {
    this._setActive(e.detail.path);
  }

  _setActive(pathname) {
    document.querySelectorAll("[data-path]").forEach((link) => {
      const linkPath = link.getAttribute("data-path");
      let isActive = false;

      if (linkPath === "/") {
        isActive = pathname === "/";
      } else if (linkPath === "/players") {
        isActive =
          pathname === "/players" ||
          pathname.startsWith("/players/");
      } else {
        isActive =
          pathname === linkPath ||
          pathname.startsWith(linkPath + "/");
      }

      link.classList.toggle(
        "nav__link--active",
        isActive
      );

      link.setAttribute(
        "aria-current",
        isActive ? "page" : "false"
      );
    });
  }
}

export const header = new Header("#site-header");
