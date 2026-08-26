import { viewContainer } from "../view-container.js";
import { injectStyle } from "./inject-style.js";
import { BASE_PATH as DASH_BASE_PATH, dashPath } from "../dashboard/config.js";

const MOBILE_QUERY = "(max-width: 767px)";

injectStyle(
  "mobile-gate",
  `
  .mobile-gate {
    max-width: 480px;
    margin: 15vh auto;
    text-align: center;
    padding: var(--sp-lg);
  }

  .mobile-gate__icon {
    font-size: 2.5rem;
    margin-bottom: var(--sp-sm);
  }

  .mobile-gate__title {
    font-size: var(--fs-xl);
    margin-bottom: var(--sp-xs);
  }

  .mobile-gate__text {
    color: rgba(16,36,26,0.65);
    margin-bottom: var(--sp-md);
  }

  .mobile-gate__admin-link {
    display: inline-block;
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-ridge-green);
  }
`,
);

function isMobileViewport() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function renderGate() {
  viewContainer.render(`
    <div class="container">
      <div class="mobile-gate">
        <div class="mobile-gate__icon">📱</div>
        <h1 class="mobile-gate__title">This app is currently meant for mobile users</h1>
        <p class="mobile-gate__text">Desktop support is coming soon. Kindly switch to a mobile device to view Maguje FC.</p>
        <a href="${dashPath("/login")}" class="mobile-gate__admin-link" data-external>Admin login →</a>
      </div>
    </div>
  `);
}

/*
 * Wraps a public view so that on any screen wider than the mobile
 * breakpoint it shows the "mobile only" notice (with a link to the
 * dashboard login) instead of the real view. Reacts live if the
 * viewport crosses the breakpoint (window resized, device rotated)
 * by re-running the same check — no page reload needed.
 *
 * Dashboard routes are never wrapped with this, so the admin panel
 * keeps working on any screen size regardless.
 */
export function withMobileGate(viewFn) {
  return async function gatedView(...args) {
    if (!isMobileViewport()) {
      renderGate();

      const mq = window.matchMedia(MOBILE_QUERY);
      const onChange = (e) => {
        if (e.matches) gatedView(...args);
      };
      mq.addEventListener("change", onChange);

      return {
        cleanup() {
          mq.removeEventListener("change", onChange);
        },
      };
    }

    const result = await viewFn(...args);

    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => {
      if (!e.matches) gatedView(...args);
    };
    mq.addEventListener("change", onChange);

    return {
      cleanup() {
        if (result && typeof result.cleanup === "function") result.cleanup();
        mq.removeEventListener("change", onChange);
      },
    };
  };
}
