import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { router } from "../router.js";

export async function liveMatchView() {
  await viewContainer.renderSkeleton(
    `<div class="container">${skeletons.matchDetails()}</div>`,
  );

  try {
    const { data: match, error } = await supabase
      .from("matches")
      .select("slug")
      .eq("is_live", true)
      .eq("is_internal", true)
      .maybeSingle();

    if (error) throw error;

    if (match?.slug) {
      router.navigate(`/matches/${match.slug}`, { replace: true });
      return { cleanup: null };
    }

    await renderNoLiveMatch();
    return { cleanup: null };
  } catch (err) {
    console.error("[live-match] lookup failed:", err);
    await renderNoLiveMatch();
    return { cleanup: null };
  }
}

async function renderNoLiveMatch() {
  await viewContainer.render(`
    <div class="container section" style="text-align:center;">
      <h1 class="text-display-xl">No live match right now</h1>
      <p class="text-body-md" style="margin-top: var(--sp-sm); color: rgba(16,36,26,0.6);">
        Check back during the next matchday, or view upcoming fixtures below.
      </p>
      <a href="/fixtures" class="btn btn--primary" style="margin-top: var(--sp-md); display:inline-block;">
        View Fixtures
      </a>
    </div>
  `);
}