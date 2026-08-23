import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { getDailyDeveloperImage } from "../components/footer.js";

export async function developerView() {
  const [imageUrl, profileRes, skillsRes, projectsRes, socialRes] =
    await Promise.all([
      getDailyDeveloperImage(),
      supabase
        .from("developer_profile")
        .select("name, title, tagline, bio")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("developer_skills")
        .select("skill_name")
        .order("display_order", { ascending: true }),
      supabase
        .from("developer_projects")
        .select("path, description, url")
        .order("display_order", { ascending: true }),
      supabase
        .from("developer_social_links")
        .select("label, href")
        .order("display_order", { ascending: true }),
    ]);

  const profile = profileRes.data || {};
  const skills = (skillsRes.data || []).map((s) => s.skill_name);
  const projects = projectsRes.data || [];
  const contacts = socialRes.data || [];

  await viewContainer.render(`
    <style>

      /* =====================================================
         TOKENS
      ===================================================== */

      .dev-page {
        --dev-bg: #0B0F1A;
        --dev-panel: #10162A;
        --dev-cyan: #5EEAD4;
        --dev-amber: #F5A623;
        --dev-text: #E8ECF4;
        --dev-muted: #8892B0;

        background: var(--dev-bg);
        color: var(--dev-text);
        margin: -32px 0 0;
        padding: 0 0 80px;
        position: relative;
        overflow: hidden;
        font-family: 'Inter', system-ui, sans-serif;
      }

      /* faint starfield */
      .dev-page::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image:
          radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.35) 50%, transparent 100%),
          radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.25) 50%, transparent 100%),
          radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,0.3) 50%, transparent 100%),
          radial-gradient(1px 1px at 90% 15%, rgba(255,255,255,0.3) 50%, transparent 100%),
          radial-gradient(1.5px 1.5px at 55% 45%, rgba(255,255,255,0.2) 50%, transparent 100%),
          radial-gradient(1px 1px at 10% 70%, rgba(255,255,255,0.3) 50%, transparent 100%);
        background-repeat: repeat;
        background-size: 600px 600px;
        pointer-events: none;
        opacity: 0.8;
      }

      .dev-eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        letter-spacing: 0.08em;
        color: var(--dev-cyan);
        opacity: 0.85;
        margin: 0 0 10px;
      }

      /* =====================================================
         HERO
      ===================================================== */

      .dev-hero {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 14px;
        padding: 72px 20px 56px;
      }

      .dev-hero-photo-wrap {
        width: 132px;
        height: 132px;
        border-radius: 50%;
        padding: 3px;
        background: conic-gradient(from 0deg, var(--dev-cyan), transparent 60%, var(--dev-amber), transparent 90%, var(--dev-cyan));
        margin-bottom: 8px;
      }

      .dev-hero-photo {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        display: block;
        border: 3px solid var(--dev-bg);
      }

      .dev-hero-name {
        font-family: 'Space Grotesk', system-ui, sans-serif;
        font-size: clamp(28px, 5vw, 44px);
        font-weight: 700;
        letter-spacing: -0.01em;
        margin: 0;
      }

      .dev-hero-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--dev-muted);
        margin: 0;
      }

      .dev-hero-tagline {
        max-width: 480px;
        color: var(--dev-muted);
        font-size: 15px;
        line-height: 1.6;
        margin: 4px 0 0;
      }

      /* =====================================================
         SECTIONS
      ===================================================== */

      .dev-section {
        max-width: 720px;
        margin: 0 auto;
        padding: 56px 24px 0;
        position: relative;
      }

      .dev-bio {
        font-size: 15px;
        line-height: 1.75;
        color: var(--dev-text);
        opacity: 0.9;
        max-width: 620px;
      }

      /* =====================================================
         SKILLS ORBIT (signature element)
      ===================================================== */

      .dev-orbit-section {
        max-width: 900px;
        margin: 0 auto;
        padding: 64px 24px 0;
      }

      .dev-orbit {
        position: relative;
        width: min(100%, 460px);
        aspect-ratio: 1 / 1;
        margin: 40px auto 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .dev-orbit-ring {
        position: absolute;
        border: 1px dashed rgba(94, 234, 212, 0.15);
        border-radius: 50%;
      }

      .dev-orbit-ring--inner {
        width: 56%;
        height: 56%;
      }

      .dev-orbit-ring--outer {
        width: 94%;
        height: 94%;
      }

      .dev-orbit-core {
        position: relative;
        z-index: 2;
        width: 92px;
        height: 92px;
        border-radius: 50%;
        background: var(--dev-panel);
        border: 1px solid rgba(94, 234, 212, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        letter-spacing: 0.1em;
        color: var(--dev-cyan);
        text-align: center;
        box-shadow: 0 0 40px rgba(94, 234, 212, 0.15);
      }

      .dev-orbit-item {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
      }

      .dev-orbit-item span {
        position: absolute;
        transform: translate(-50%, -50%);
        white-space: nowrap;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(16, 22, 42, 0.9);
        border: 1px solid rgba(94, 234, 212, 0.3);
        color: var(--dev-text);
        transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease;
      }

      .dev-orbit-item:hover span {
        border-color: var(--dev-cyan);
        color: var(--dev-cyan);
        background: rgba(94, 234, 212, 0.1);
      }

      @keyframes orbit-inner-spin {
        from { transform: rotate(0deg) translateX(var(--r)) rotate(0deg); }
        to   { transform: rotate(360deg) translateX(var(--r)) rotate(-360deg); }
      }

      @keyframes orbit-outer-spin {
        from { transform: rotate(360deg) translateX(var(--r)) rotate(-360deg); }
        to   { transform: rotate(0deg) translateX(var(--r)) rotate(0deg); }
      }

      .dev-orbit-item--inner {
        animation: orbit-inner-spin var(--dur) linear infinite;
        animation-delay: var(--delay);
      }

      .dev-orbit-item--outer {
        animation: orbit-outer-spin var(--dur) linear infinite;
        animation-delay: var(--delay);
      }

      .dev-orbit:hover .dev-orbit-item {
        animation-play-state: paused;
      }

      @media (prefers-reduced-motion: reduce) {
        .dev-orbit-item {
          animation: none !important;
        }
      }

      @media (max-width: 560px) {
        .dev-orbit {
          width: 320px;
        }
        .dev-orbit-core {
          width: 74px;
          height: 74px;
          font-size: 10px;
        }
        .dev-orbit-item span {
          font-size: 11px;
          padding: 5px 10px;
        }
      }

      /* =====================================================
         PROJECTS
      ===================================================== */

      .dev-projects {
        display: grid;
        gap: 14px;
        margin-top: 24px;
      }

      .dev-project-card {
        padding: 20px 22px;
        border-radius: 12px;
        background: var(--dev-panel);
        border: 1px solid rgba(255,255,255,0.06);
        transition: border-color 0.25s ease, transform 0.25s ease;
      }

      .dev-project-card:hover {
        border-color: rgba(94, 234, 212, 0.35);
        transform: translateY(-2px);
      }

      .dev-project-path {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        color: var(--dev-amber);
        margin: 0 0 8px;
      }

      .dev-project-desc {
        font-size: 14px;
        color: var(--dev-muted);
        line-height: 1.6;
        margin: 0;
      }

      .dev-project-link {
        display: inline-block;
        margin-top: 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: var(--dev-cyan);
        text-decoration: none;
      }

      .dev-project-link:hover {
        text-decoration: underline;
      }

      /* =====================================================
         CONTACT
      ===================================================== */

      .dev-contacts {
        display: flex;
        gap: 28px;
        justify-content: center;
        flex-wrap: wrap;
        margin: 48px 0 0;
        padding: 0 24px;
      }

      .dev-contact-link {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        color: var(--dev-text);
        text-decoration: none;
        opacity: 0.85;
        transition: color 0.2s ease, opacity 0.2s ease;
      }

      .dev-contact-link::before {
        content: "$ ";
        color: var(--dev-cyan);
      }

      .dev-contact-link:hover {
        color: var(--dev-cyan);
        opacity: 1;
      }

    </style>

    <div class="dev-page">

      <div class="dev-hero">
        ${
          imageUrl
            ? `<div class="dev-hero-photo-wrap">
                 <img src="${imageUrl}" alt="${profile.name || ""}" class="dev-hero-photo" loading="lazy">
               </div>`
            : ""
        }
        <h1 class="dev-hero-name">${profile.name || ""}</h1>
        <p class="dev-hero-title">${profile.title || ""}</p>
        <p class="dev-hero-tagline">${profile.tagline || ""}</p>
      </div>

      <div class="dev-section">
        <p class="dev-eyebrow">// about</p>
        <p class="dev-bio">${profile.bio || ""}</p>
      </div>

      <div class="dev-orbit-section">
        <p class="dev-eyebrow" style="text-align:center;">// stack</p>
        <div class="dev-orbit" id="dev-orbit">
          <div class="dev-orbit-ring dev-orbit-ring--inner"></div>
          <div class="dev-orbit-ring dev-orbit-ring--outer"></div>
          <div class="dev-orbit-core">STACK</div>
        </div>
      </div>

      <div class="dev-section">
        <p class="dev-eyebrow">// projects</p>
        <div class="dev-projects">
          ${projects
            .map(
              (p) => `
            <div class="dev-project-card">
              <p class="dev-project-path">${p.path}</p>
              <p class="dev-project-desc">${p.description || ""}</p>
              ${p.url ? `<a href="${p.url}" class="dev-project-link">open →</a>` : ""}
            </div>
          `,
            )
            .join("")}
        </div>
      </div>

      <div class="dev-contacts">
        ${contacts
          .map(
            (c) =>
              `<a href="${c.href}" class="dev-contact-link" data-external>${c.label}</a>`,
          )
          .join("")}
      </div>

    </div>
  `);

  _mountOrbit(skills);
  observeLazyImages(document.querySelector("#app"));

  return { cleanup: null };
}

/* =========================================================
   Position skills into two counter-rotating orbit rings.
   Radius/duration read via CSS custom properties so the
   keyframes stay generic regardless of skill count.
========================================================= */
function _mountOrbit(skills) {
  const orbit = document.querySelector("#dev-orbit");
  if (!orbit || !skills.length) return;

  const mid = Math.ceil(skills.length / 2);
  const innerSkills = skills.slice(0, mid);
  const outerSkills = skills.slice(mid);

  const isMobile = window.innerWidth <= 560;
  const innerRadius = isMobile ? 90 : 130;
  const outerRadius = isMobile ? 145 : 205;

  innerSkills.forEach((skill, i) => {
    const angle = (360 / innerSkills.length) * i;
    const el = document.createElement("div");
    el.className = "dev-orbit-item dev-orbit-item--inner";
    el.style.setProperty("--r", `${innerRadius}px`);
    el.style.setProperty("--dur", "26s");
    el.style.setProperty(
      "--delay",
      `${-(angle / 360) * 26}s`,
    );
    el.innerHTML = `<span>${skill}</span>`;
    orbit.appendChild(el);
  });

  outerSkills.forEach((skill, i) => {
    const angle = (360 / outerSkills.length) * i;
    const el = document.createElement("div");
    el.className = "dev-orbit-item dev-orbit-item--outer";
    el.style.setProperty("--r", `${outerRadius}px`);
    el.style.setProperty("--dur", "38s");
    el.style.setProperty(
      "--delay",
      `${-(angle / 360) * 38}s`,
    );
    el.innerHTML = `<span>${skill}</span>`;
    orbit.appendChild(el);
  });
}
