import { openAuthModal } from "./auth-modal.js";
import { supabase } from "../supabase-client.js";
import { getProfileSnapshot, logout } from "../auth.js";
import { dashPath } from "../dashboard/config.js";
import { injectStyle } from "../utils/inject-style.js";

injectStyle("header-account", `
  #header-account { position: relative; display: flex; align-items: center; }
  .account__avatar-btn {
    width: 40px; height: 40px; border-radius: 50%; overflow: hidden;
    border: 2px solid var(--color-line); background: var(--color-summit-white);
    display: flex; align-items: center; justify-content: center; padding: 0;
    position: relative; flex-shrink: 0;
  }
  .account__avatar-btn--guest { border-color: var(--color-trophy-gold); }
  .account__avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .account__avatar-icon { width: 22px; height: 22px; color: var(--color-ridge-green); }
  .account__badge {
    position: absolute; top: -2px; right: -2px;
    width: 16px; height: 16px; border-radius: 50%;
    background: var(--color-trophy-gold); color: var(--color-ink);
    font-size: 11px; font-weight: 700; line-height: 16px;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--color-summit-white);
  }
  .account__dropdown {
    position: absolute; top: calc(100% + var(--sp-2xs)); right: 0;
    background: var(--color-summit-white); border: 1px solid var(--color-line);
    border-radius: var(--radius-md); box-shadow: 0 8px 24px rgba(11,31,20,0.18);
    min-width: 200px; padding: var(--sp-3xs) 0; z-index: var(--z-nav);
    display: none;
  }
  .account__dropdown:not([hidden]) { display: flex; flex-direction: column; }
  .account__dropdown-link {
    display: block; width: 100%; box-sizing: border-box; text-align: left;
    padding: var(--sp-2xs) var(--sp-sm); font-size: var(--fs-sm);
    font-family: var(--font-body); color: var(--color-ink);
    background: none; border: none; cursor: pointer;
  }
  .account__dropdown-link:hover { background: var(--color-line); }
  .account__dropdown-link--danger { color: var(--color-error); }
  .header__group { display: flex; align-items: center; gap: var(--sp-2xs); flex-shrink: 0; }
  .header__bar { position: relative; }
  .header__wordmark-center {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    text-decoration: none;
  }
`);

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

    getProfileSnapshot().then((snapshot) => this._renderAccount(snapshot));

    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        this._renderAccount({ accountType: null, avatarUrl: null });
      } else if (event === "SIGNED_IN") {
        getProfileSnapshot().then((snapshot) => this._renderAccount(snapshot));
      }
    });
  }

  _template() {
    return `
      <div class="header__bar container">
        <div class="header__group header__group--left">
          <a href="/" class="header__brand" aria-label="Maguje FC home">
            <img
              src="/assets/maguje-crest.png"
              alt=""
              class="header__crest"
              width="40"
              height="40"
            >
          </a>

          <a
            href="/search"
            class="header__search-btn"
            data-path="/search"
            aria-label="Search"
          >
            <span aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="#099220" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8.5" cy="8.5" r="5.5"/>
                <path d="M16.5 16.5 12.7 12.7"/>
              </svg>
            </span>
          </a>
        </div>

        <a href="/" class="header__wordmark-center header__wordmark text-display-lg" data-path="/">
          Maguje FC
        </a>

        <nav
          class="nav nav--desktop show-desktop-up"
          aria-label="Primary"
        >
          <ul class="nav__list">
            ${NAV_ITEMS.map((item) => `
              <li>
                <a
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
                <a
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

        <div class="header__group header__group--right">
          <div id="header-account"></div>

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
                    <a
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
      if (e.key !== "Escape") return;
      if (this.menuOpen) this._closeMenu();
      this._closeAccountDropdown();
    });

    this.root.addEventListener("click", (e) => {
      const authBtn = e.target.closest("[data-auth-action]");
      if (authBtn) {
        const action = authBtn.dataset.authAction;
        if (action === "login") openAuthModal("login");
        if (action === "logout") logout({ redirect: true });
        this._closeAccountDropdown();
        if (this.menuOpen) this._closeMenu();
        return;
      }

      const toggleBtn = e.target.closest("[data-account-toggle]");
      if (toggleBtn) {
        const dropdown = this.root.querySelector("[data-account-dropdown]");
        if (!dropdown) return;
        const willOpen = dropdown.hidden;
        dropdown.hidden = !willOpen;
        toggleBtn.setAttribute("aria-expanded", String(willOpen));
        return;
      }

      if (e.target.closest("[data-account-dropdown] a")) {
        this._closeAccountDropdown();
      }

      if (e.target.closest("[data-mobile-menu] a")) {
        this._closeMenu();
      }
    });

    document.addEventListener("click", (e) => {
      const acct = this.root.querySelector("#header-account");
      if (!acct || !acct.contains(e.target)) {
        this._closeAccountDropdown();
      }
    });
  }

  _closeAccountDropdown() {
    const dropdown = this.root.querySelector("[data-account-dropdown]");
    if (!dropdown || dropdown.hidden) return;
    dropdown.hidden = true;
    this.root
      .querySelector("[data-account-toggle]")
      ?.setAttribute("aria-expanded", "false");
  }

  _avatarMarkup(avatarUrl) {
    if (avatarUrl) {
      return `<img src="${avatarUrl}" alt="" class="account__avatar-img">`;
    }
    return `
      <svg viewBox="0 0 24 24" class="account__avatar-icon" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="currentColor"/>
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" fill="currentColor"/>
      </svg>
    `;
  }

  _renderAccount({ accountType, avatarUrl }) {
    this._accountType = accountType;
    const slot = this.root.querySelector("#header-account");
    if (!slot) return;

    if (!accountType) {
      slot.innerHTML = `
        <button
          type="button"
          class="account__avatar-btn account__avatar-btn--guest"
          data-auth-action="login"
          aria-label="Log in"
        >
          ${this._avatarMarkup(null)}
          <span class="account__badge" aria-hidden="true">!</span>
        </button>
      `;
      return;
    }

    const items = [
      { label: "Update Profile", path: "/profile" },
      { label: "Report an Issue", path: "/report-issue" },
      ...(accountType === "admin"
        ? [{ label: "Manage Dashboard", path: dashPath("") }]
        : []),
      ...(accountType === "supporter"
        ? [{ label: "Send Message", path: "/contact" }]
        : []),
    ];

    slot.innerHTML = `
      <button
        type="button"
        class="account__avatar-btn"
        data-account-toggle
        aria-haspopup="true"
        aria-expanded="false"
        aria-label="Account menu"
      >
        ${this._avatarMarkup(avatarUrl)}
      </button>
      <div class="account__dropdown" data-account-dropdown hidden>
        ${items
          .map(
            (item) =>
              `<a href="${item.path}" class="account__dropdown-link" data-path="${item.path}">${item.label}</a>`,
          )
          .join("")}
        <button type="button" class="account__dropdown-link account__dropdown-link--danger" data-auth-action="logout">Logout</button>
      </div>
    `;

    this._setActive(window.location.pathname);
  }

  async refreshAccount() {
    const snapshot = await getProfileSnapshot();
    this._renderAccount(snapshot);
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
    this._closeAccountDropdown();
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