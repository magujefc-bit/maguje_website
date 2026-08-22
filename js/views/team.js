import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { skeletons } from "../components/skeletons.js";
import { states } from "../components/states.js";
import { teamHeader, positionGroup } from "../components/team-card.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { injectStyle } from "../utils/inject-style.js";

injectStyle(
  "team-view",
  `
  .team-view-squad { padding-bottom: var(--sp-2xl); }
  .team-view-h2h-link { display: inline-block; margin-top: var(--sp-sm); }
`,
);

const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

export async function teamView() {
  await viewContainer.render(`
    <div class="container">
      <div data-slot="header"></div>
      <div class="team-view-squad" data-slot="squad">${skeletons.playerGrid(8)}</div>
    </div>`);

  const root = document.querySelector("#app");
  await loadTeamHeader(root);
  await loadSquad(root);
  return { cleanup: null };
}

async function loadTeamHeader(root) {
  const slot = root.querySelector('[data-slot="header"]');
  try {
    const { data, error } = await supabase
      .from("club_profile")
      .select("name, crest_url")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return;
    slot.innerHTML = teamHeader({ name: data.name, crestUrl: data.crest_url });
    observeLazyImages(slot);
  } catch (err) {
    console.error("[team] header failed:", err);
  }
}

async function loadSquad(root) {
  const squadSlot = root.querySelector('[data-slot="squad"]');
  try {
    let { data: players, error } = await supabase
      .from("players")
      .select("id, slug, full_name, position, jersey_number, photo_url")
      .eq("is_active", true)
      .order("jersey_number", { ascending: true, nullsFirst: false });
    if (error) throw error;

    // If no active players are marked in the DB, fall back to showing all players
    if (!players.length) {
      const { data: allPlayers, error: allErr } = await supabase
        .from("players")
        .select("id, slug, full_name, position, jersey_number, photo_url")
        .order("jersey_number", { ascending: true, nullsFirst: false });
      if (allErr) throw allErr;
      players = allPlayers || [];
    }
    if (!players.length) {
      squadSlot.innerHTML = states.empty({
        message: "Squad list coming soon.",
      });
      return;
    }

    // Group players by position; include unpositioned players under 'Squad'
    const byPosition = {};
    players.forEach((p) => {
      const pos = p.position || "Squad";
      if (!byPosition[pos]) byPosition[pos] = [];
      byPosition[pos].push({
        slug: p.slug,
        name: p.full_name,
        position: p.position,
        jerseyNumber: p.jersey_number,
        photoUrl: p.photo_url,
      });
    });

    const grouped = Object.keys(byPosition)
      .sort((a, b) => {
        const ia =
          POSITION_ORDER.indexOf(a) !== -1 ? POSITION_ORDER.indexOf(a) : 999;
        const ib =
          POSITION_ORDER.indexOf(b) !== -1 ? POSITION_ORDER.indexOf(b) : 999;
        return ia - ib || a.localeCompare(b);
      })
      .map((posKey) => ({
        position: posKey === "Squad" ? "Squad" : `${posKey}s`,
        players: byPosition[posKey],
      }));

    squadSlot.innerHTML = grouped.map(positionGroup).join("");
    observeLazyImages(squadSlot);
  } catch (err) {
    console.error("[team] squad load failed:", err);
    squadSlot.innerHTML = states.error();
    states.bindRetry(squadSlot, () => loadSquad(root));
  }
}

function computeRecord(matches) {
  let wins = 0,
    draws = 0,
    losses = 0;
  matches.forEach((m) => {
    if (m.our_score > m.opponent_score) wins++;
    else if (m.our_score === m.opponent_score) draws++;
    else losses++;
  });
  return { played: matches.length, wins, draws, losses };
}
