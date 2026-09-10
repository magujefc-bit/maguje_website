import { supabase } from "../supabase-client.js";
import { viewContainer } from "../view-container.js";
import { states } from "../components/states.js";
import { observeLazyImages } from "../components/lazy-image.js";
import { bindStandingsScroll } from "../components/standings-table.js";
import { fetchStandingsMarkup } from "./competition-shared.js";
import { injectStyle } from "../utils/inject-style.js";

injectStyle(
  "standings-view",
  `
  .standings-picker {
    margin-top: var(--sp-sm);
    width: 100%;
    max-width: 320px;
    padding: var(--sp-xs) var(--sp-sm);
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-ink);
    background: var(--color-summit-white);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-md);
  }
`,
);

export async function standingsView() {
  await viewContainer.render(
    `<div class="container"><div class="about-header"><h1 class="about-title">Standings</h1><div data-slot="filter"></div></div><div data-slot="table">${states.empty({ message: "Pick a competition above to view its standings." })}</div></div>`,
  );
  const root = document.querySelector("#app");
  const slot = root.querySelector('[data-slot="table"]');
  const filterSlot = root.querySelector('[data-slot="filter"]');

  try {
    const { data: comps, error: compsErr } = await supabase
      .from("competitions")
      .select("id, name, type")
      .neq("type", "Friendly")
      .order("name", { ascending: true });
    if (compsErr) throw compsErr;

    const competitions = comps || [];
    if (!competitions.length) {
      filterSlot.innerHTML = "";
      slot.innerHTML = states.empty({
        message: "Standings will appear once the season begins.",
      });
      return { cleanup: null };
    }

    filterSlot.innerHTML = `
      <select class="standings-picker" data-comp-picker aria-label="Select competition">
        <option value="" selected disabled>Pick a competition to view</option>
        ${competitions.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}
      </select>`;

    filterSlot
      .querySelector("[data-comp-picker]")
      .addEventListener("change", (e) => {
        const chosen = competitions.find((c) => c.id === e.target.value);
        if (chosen) loadStandingsForComp(root, slot, chosen);
      });
  } catch (err) {
    console.error("[standings] load failed:", err);
    filterSlot.innerHTML = "";
    slot.innerHTML = states.error();
    states.bindRetry(slot, async () => {
      await standingsView();
    });
  }
  return { cleanup: null };
}

async function loadStandingsForComp(root, slot, comp) {
  slot.innerHTML = `<div class="skel skel-block" style="height:300px;"></div>`;
  try {
    slot.innerHTML = await fetchStandingsMarkup(comp);
    observeLazyImages(slot);
    bindStandingsScroll(root);
  } catch (err) {
    console.error("[standings] load failed:", err);
    slot.innerHTML = states.error();
    states.bindRetry(slot, () => loadStandingsForComp(root, slot, comp));
  }
}