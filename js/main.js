import { router } from "./router.js";
import { crestLoader } from "./components/crest-loader.js";
import { header } from "./components/header.js";
import { footer } from "./components/footer.js";

import { withMobileGate } from "./utils/mobile-gate.js";

import { homeView } from "./views/home.js";
import { newsView } from "./views/news.js";
import { newsDetailsView } from "./views/news-details.js";
import { fixturesView } from "./views/fixtures.js";
import { resultsView } from "./views/results.js";
import { matchReportsView } from "./views/match-reports.js";
import { matchReportDetailsView } from "./views/match-report-details.js";
import { matchDetailsView } from "./views/match-details.js";
import { liveMatchView } from "./views/live-match.js";
import { teamView as playersView } from "./views/team.js";
import { playerProfileView } from "./views/player-profile.js";
import { headToHeadIndexView } from "./views/head-to-head-index.js";
import { headToHeadDetailView } from "./views/head-to-head-detail.js";
import { galleryView } from "./views/gallery.js";
import { galleryDetailsView } from "./views/gallery-details.js";
import { competitionsView } from "./views/competitions.js";
import { competitionDetailsView } from "./views/competition-details.js";
import { competitionStandingsView } from "./views/competition-standings.js";
import { competitionFixturesView } from "./views/competition-fixtures.js";
import { competitionResultsView } from "./views/competition-results.js";
import { competitionPlayerStatisticsView } from "./views/competition-player-statistics.js";
import { aboutView as clubProfileGeneralView } from "./views/about.js";
import { clubHistoryView } from "./views/club-history.js";
import { visionMissionView } from "./views/vision-mission.js";
import { clubOfficialsView } from "./views/club-officials.js";
import { clubAllTimeStatsView } from "./views/club-all-time-stats.js";
import { clubHonoursView } from "./views/club-honours.js";
import { communityView } from "./views/community.js";
import { activityDetailsView } from "./views/activity-details.js";
import { eventsView } from "./views/events.js";
import { eventDetailsView } from "./views/event-details.js";
import { supportersView } from "./views/supporters.js";
import { contactView } from "./views/contact.js";
import { searchView } from "./views/search.js";
import { privacyView } from "./views/privacy.js";
import { termsView } from "./views/terms.js";
import { notFoundView } from "./views/not-found.js";
import { developerView } from "./views/developer.js";
import { developerProfileView as dashDeveloperProfileView } from "./dashboard/views/developer-profile.js";

// ---------------------------------------------------------------
// Admin dashboard — merged into this same SPA/router, living under
// the /maguje-dashboard prefix. See js/dashboard/README.md for the
// full breakdown of what got ported from the old standalone build.
// ---------------------------------------------------------------
import { BASE_PATH as DASH_BASE_PATH } from "./dashboard/config.js";
import { loginView as dashLoginView } from "./dashboard/views/auth/login.js";
import { forgotPasswordView as dashForgotPasswordView } from "./dashboard/views/auth/forgot-password.js";
import { resetPasswordView as dashResetPasswordView } from "./dashboard/views/auth/reset-password.js";
import { dashboardView as dashHomeView } from "./dashboard/views/dashboard.js";
import { managersView as dashManagersView } from "./dashboard/views/managers.js";
import { authRecordsView as dashAuthRecordsView } from "./dashboard/views/auth-records.js";
import { systemLogView as dashSystemLogView } from "./dashboard/views/system-log.js";
import { playersView as dashPlayersView } from "./dashboard/views/players.js";
import { officialsView as dashOfficialsView } from "./dashboard/views/officials.js";
import { clubProfileView as dashClubProfileView } from "./dashboard/views/club-profile.js";
import { clubRecordsView as dashClubRecordsView } from "./dashboard/views/club-records.js";
import { competitionsView as dashCompetitionsView } from "./dashboard/views/competitions.js";
import { competitionDetailView as dashCompetitionDetailView } from "./dashboard/views/competition-detail.js";
import { matchCenterView as dashMatchCenterView } from "./dashboard/views/match-center.js";
import { resultsView as dashResultsView } from "./dashboard/views/results.js";
import { liveMatchView as dashLiveMatchView } from "./dashboard/views/live-match.js";
import { contentDashboardView as dashContentDashboardView } from "./dashboard/views/content-dashboard.js";

// Standings page reuses the same v_standings source as Home/Competitions,
// scoped to Maguje FC's primary competition if one exists, else the first available.
import { supabase } from "./supabase-client.js";
import { viewContainer } from "./view-container.js";
import { states } from "./components/states.js";
import { standingsTable } from "./components/standings-table.js";
import { skeletons } from "./components/skeletons.js";
import { observeLazyImages } from "./components/lazy-image.js";
import { getMagujeTeamId } from "./views/home.js";

async function standingsView() {
  await viewContainer.render(
    `<div class="container"><div class="about-header"><h1 class="about-title">League Standings</h1><div data-slot="filter"></div></div><div data-slot="table">${skeletons.standings(10)}</div></div>`,
  );
  const root = document.querySelector("#app");
  const slot = root.querySelector('[data-slot="table"]');
  const filterSlot = root.querySelector('[data-slot="filter"]');
  let competitions = [];
  let activeCompId = null;

  try {
    const { data: comps, error: compsErr } = await supabase
      .from("competitions")
      .select("id, name")
      .order("name", { ascending: true });
    if (compsErr) throw compsErr;
    competitions = comps || [];
    if (!competitions.length) {
      slot.innerHTML = states.empty({
        message: "Standings will appear once the season begins.",
      });
      return { cleanup: null };
    }

    if (competitions.length > 1) {
      activeCompId = competitions[0].id;
      filterSlot.innerHTML = `
        <div style="display: flex; gap: var(--sp-sm); margin-top: var(--sp-sm);">
          ${competitions.map((c) => `<button type="button" class="btn btn--secondary" data-comp-id="${c.id}" data-active="${c.id === activeCompId}">${c.name}</button>`).join("")}
        </div>`;

      filterSlot.querySelectorAll("[data-comp-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeCompId = btn.dataset.compId;
          filterSlot
            .querySelectorAll("[data-comp-id]")
            .forEach((b) =>
              b.setAttribute("data-active", b.dataset.compId === activeCompId),
            );
          loadStandingsForComp(root, slot, activeCompId);
        });
      });
    } else {
      activeCompId = competitions[0].id;
    }

    await loadStandingsForComp(root, slot, activeCompId);
  } catch (err) {
    console.error("[standings] load failed:", err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, async () => {
      await standingsView();
    });
  }
  return { cleanup: null };
}

async function loadStandingsForComp(root, slot, competitionId) {
  try {
    const { data, error } = await supabase
      .from("v_standings")
      .select(
        "team_id, team_name, crest_url, played, won, drawn, lost, points, position, competition_id",
      )
      .eq("competition_id", competitionId)
      .order("position", { ascending: true });

    if (error) throw error;
    if (!data.length) {
      slot.innerHTML = states.empty({
        message: "Standings will appear once matches are played.",
      });
      return;
    }

    const teamId = await getMagujeTeamId();
    slot.innerHTML = standingsTable(
      data.map((r) => ({
        position: r.position,
        teamId: r.team_id,
        teamName: r.team_name,
        crestUrl: r.crest_url,
        played: r.played,
        won: r.won,
        drawn: r.drawn,
        lost: r.lost,
        points: r.points,
      })),
      { highlightTeamId: teamId },
    );
    observeLazyImages(slot);
  } catch (err) {
    console.error("[standings] load failed:", err);
    slot.innerHTML = states.error();
  }
}

async function boot() {
  const startingOnDashboard = window.location.pathname.startsWith(
    DASH_BASE_PATH,
  );

  if (!startingOnDashboard) crestLoader.show();

  header.mount();
  await footer.mount();

  router
    .add("/", withMobileGate(homeView))
    .add("/news", withMobileGate(newsView))
    .add("/news/:slug", withMobileGate(newsDetailsView))
    .add("/fixtures", withMobileGate(fixturesView))
    .add("/results", withMobileGate(resultsView))
    .add("/results/head-to-head", withMobileGate(headToHeadIndexView))
    .add("/results/head-to-head/:teamId", withMobileGate(headToHeadDetailView))
    .add("/match-reports", withMobileGate(matchReportsView))
    .add("/match-reports/:slug", withMobileGate(matchReportDetailsView))
    .add("/matches/:slug", withMobileGate(matchDetailsView))
    .add("/live", withMobileGate(liveMatchView))
    .add("/standings", withMobileGate(standingsView))
    .add("/players", withMobileGate(playersView))
    .add("/players/:slug", withMobileGate(playerProfileView))
    .add("/gallery", withMobileGate(galleryView))
    .add("/gallery/:slug", withMobileGate(galleryDetailsView))
    .add("/competitions", withMobileGate(competitionsView))
    .add("/competitions/:slug", withMobileGate(competitionDetailsView))
    .add("/competitions/:slug/standings", withMobileGate(competitionStandingsView))
    .add("/competitions/:slug/fixtures", withMobileGate(competitionFixturesView))
    .add("/competitions/:slug/results", withMobileGate(competitionResultsView))
    .add(
      "/competitions/:slug/player-statistics",
      withMobileGate(competitionPlayerStatisticsView),
    )
    .add("/club-profile", withMobileGate(clubProfileGeneralView))
    .add("/club-profile/mission-vision", withMobileGate(visionMissionView))
    .add("/club-profile/history", withMobileGate(clubHistoryView))
    // Temporary: bare /club-records points at Honours content until
    // Pass 4 (#7) builds the dedicated All-Time Stats page.
    .add("/club-records", withMobileGate(clubAllTimeStatsView))
    .add("/club-records/honours", withMobileGate(clubHonoursView))
    .add("/officials", withMobileGate(clubOfficialsView))
    .add("/community", withMobileGate(communityView))
    .add("/community/:slug", withMobileGate(activityDetailsView))
    .add("/events", withMobileGate(eventsView))
    .add("/events/:slug", withMobileGate(eventDetailsView))
    .add("/supporters", withMobileGate(supportersView))
    .add("/contact", withMobileGate(contactView))
    .add("/search", withMobileGate(searchView))
    .add("/privacy", withMobileGate(privacyView))
    .add("/terms", withMobileGate(termsView))
    // ---------------- Admin dashboard routes ----------------
    // (never wrapped with withMobileGate — dashboard works on any screen size)
    .add(`${DASH_BASE_PATH}/login`, dashLoginView)
    .add(`${DASH_BASE_PATH}/forgot-password`, dashForgotPasswordView)
    .add(`${DASH_BASE_PATH}/reset-password`, dashResetPasswordView)
    .add(DASH_BASE_PATH, dashHomeView)
    .add(`${DASH_BASE_PATH}/managers`, dashManagersView)
    .add(`${DASH_BASE_PATH}/auth-records`, dashAuthRecordsView)
    .add(`${DASH_BASE_PATH}/system-log`, dashSystemLogView)
    .add(`${DASH_BASE_PATH}/players`, dashPlayersView)
    .add(`${DASH_BASE_PATH}/officials`, dashOfficialsView)
    .add(`${DASH_BASE_PATH}/club-profile`, dashClubProfileView)
    .add(`${DASH_BASE_PATH}/club-records`, dashClubRecordsView)
    .add(`${DASH_BASE_PATH}/competitions`, dashCompetitionsView)
    .add(`${DASH_BASE_PATH}/competitions/detail`, dashCompetitionDetailView)
    .add(`${DASH_BASE_PATH}/match-center`, dashMatchCenterView)
    .add(`${DASH_BASE_PATH}/results`, dashResultsView)
    .add(`${DASH_BASE_PATH}/live-match`, dashLiveMatchView)
    .add(`${DASH_BASE_PATH}/content`, dashContentDashboardView)
    .add("/developer", withMobileGate(developerView))
    .add(`${DASH_BASE_PATH}/developer-profile`, dashDeveloperProfileView)
    .notFound(notFoundView);

  document.addEventListener("route:after", (e) => {
    const onDashboard = e.detail.path.startsWith(DASH_BASE_PATH);
    document.body.classList.toggle("dashboard-mode", onDashboard);
    document.getElementById("site-header").classList.toggle(
      "hidden",
      onDashboard,
    );
    document.getElementById("site-footer").classList.toggle(
      "hidden",
      onDashboard,
    );
    document.getElementById("app").classList.toggle("hidden", onDashboard);
    document.getElementById("dashboard-shell").classList.toggle(
      "hidden",
      !onDashboard,
    );
  });

  router.init();

  if (!startingOnDashboard) {
    await new Promise((res) => setTimeout(res, 50));
    await crestLoader.hide();
  }
}

boot();
