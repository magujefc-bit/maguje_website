/**
 * <fab-scoreboard match-id="123">
 *
 * Self-contained live scoreboard web component.
 * Drop it into any plain HTML/JS page (admin or public site) via:
 *
 *   const sb = document.createElement("fab-scoreboard");
 *   sb.supabaseClient = yourClientInstance; // optional — see below
 *   sb.setAttribute("match-id", theMatchId);
 *   document.getElementById("scoreboard-slot").replaceWith(sb);
 *
 * Client resolution order:
 *   1. `el.supabaseClient` — set this explicitly BEFORE inserting the
 *      element into the DOM if your page has its own client instance
 *      (e.g. the public site's ES-module client). This guarantees the
 *      component uses the SAME client/connection as the rest of the
 *      page, rather than a second, independent one.
 *   2. `window.supabaseClient` — fallback, used by the dashboard
 *      (unchanged behaviour from before).
 *   3. bare global `supabaseClient` — last-resort fallback.
 *
 * It fetches its own data (club/teams/players/match/goals/cards/subs/lineups),
 * subscribes to Supabase realtime for live updates, and renders entirely
 * inside a Shadow DOM so its styles never collide with the host page.
 *
 * NOTE: match_cards / match_substitutions / match_lineups in this schema
 * only track OUR club's players. There is no data source yet for the
 * opponent's card tally, so the opponent-side card badges will always be
 * empty until that's added to the schema.
 */
(function () {
  "use strict";

  const TICKER_ROTATE_MS = 4500;
  const CLOCK_TICK_MS = 1000;

const TEMPLATE = `
    <style>
      :host { display:block; font-family: inherit; }
      .sb { text-align:center; padding:1.5rem; background:linear-gradient(135deg,#109b45,#046926); border-radius:12px; color:#fff; }
      .sb-top { display:flex; align-items:center; justify-content:space-between; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; opacity:0.9; margin-bottom:0.5rem; min-height:1rem; }
      .sb-top-left { display:flex; align-items:center; gap:0.4rem; }
      .live-dot { width:8px; height:8px; border-radius:50%; background:#ff4d4d; opacity:0; }
      .live-dot.pulsing { opacity:1; animation: sb-pulse 1.5s infinite; }
      @keyframes sb-pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      .sb-competition { font-size:0.75rem; opacity:0.85; font-weight:600; text-align:right; }
      .sb-teams { font-size:1.5rem; font-weight:700; margin-bottom:0.4rem; }
      .sb-scoreline { display:flex; align-items:center; justify-content:center; gap:0.9rem; }
      .sb-score { font-size:2.5rem; font-weight:800; min-width:90px; }
      .sb-cards { display:flex; gap:0.35rem; min-width:56px; }
      .sb-cards.home { justify-content:flex-end; }
      .sb-cards.away { justify-content:flex-start; }
      .badge { font-size:0.85rem; font-weight:700; background:rgba(255,255,255,0.18); border-radius:6px; padding:0.15rem 0.4rem; display:inline-flex; align-items:center; gap:0.15rem; transform:scale(1); }
      .badge.pulse { animation: sb-badge-pulse 0.6s ease; }
      @keyframes sb-badge-pulse { 0%{transform:scale(1);} 40%{transform:scale(1.35);} 100%{transform:scale(1);} }
      .sb-clock { font-size:1.3rem; font-weight:800; margin-top:0.5rem; }
      .sb-clock.live { animation: sb-clock-live 1.5s infinite; }
      @keyframes sb-clock-live { 0%,100%{opacity:1;} 50%{opacity:0.6;} }
      .sb-phase { font-size:0.75rem; opacity:0.85; margin-top:0.15rem; text-transform:uppercase; letter-spacing:0.05em; }
      .sb-ticker { overflow:hidden; white-space:nowrap; margin-top:0.9rem; border-top:1px solid rgba(255,255,255,0.25); padding-top:0.6rem; }
      .sb-ticker-track { display:inline-block; padding-left:100%; font-size:0.78rem; letter-spacing:0.03em; opacity:0.95; animation: sb-ticker-scroll 15s linear infinite; }
      @keyframes sb-ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
      .sb-msg { color:#fff; font-size:0.85rem; padding:1rem; text-align:center; }
    </style>
    <div class="sb" part="scoreboard">
      <div class="sb-top">
        <span class="sb-top-left">
          <span class="live-dot" part="live-dot"></span>
          <span class="sb-live-label"></span>
        </span>
        <span class="sb-competition"></span>
      </div>
      <div class="sb-teams"></div>
      <div class="sb-scoreline">
        <div class="sb-cards home"></div>
        <div class="sb-score">0 – 0</div>
        <div class="sb-cards away"></div>
      </div>
      <div class="sb-clock"></div>
      <div class="sb-phase"></div>
      <div class="sb-ticker">
        <div class="sb-ticker-track"></div>
      </div>
    </div>
  `;

  class FabScoreboard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = TEMPLATE;

      this._matchId = null;
      this._match = null;
      this._teams = [];
      this._players = [];
      this._goals = [];
      this._cards = [];
      this._subs = [];
      this._lineups = [];
      this._clubName = "Our Club";

      this._prevBadgeCounts = {};
      this._tickerItems = [];
      this._tickerIdx = 0;
      this._tickerTimer = null;
      this._clockTimer = null;
      this._channel = null;

      // Optional: set this BEFORE inserting the element into the DOM
      // to force a specific client instance. See file header comment.
      this.supabaseClient = null;
    }

    _getSupabase() {
      if (this.supabaseClient) return this.supabaseClient;
      if (typeof window !== "undefined" && window.supabaseClient) return window.supabaseClient;
      try {
        // eslint-disable-next-line no-undef
        if (typeof supabaseClient !== "undefined" && supabaseClient) return supabaseClient;
      } catch (e) {
        /* not defined at all — fall through */
      }
      return null;
    }

    connectedCallback() {
      this._matchId = this.getAttribute("match-id");

      if (!this._matchId) {
        this._renderMessage("No match-id provided");
        return;
      }
      if (!this._getSupabase()) {
        this._renderMessage("supabaseClient not found — set el.supabaseClient or load supabase-client.js before fab-scoreboard.js");
        return;
      }
      if (!window.ScoreboardCore) {
        this._renderMessage("ScoreboardCore not found — load scoreboard-core.js before fab-scoreboard.js");
        return;
      }

      this._renderMessage("Loading match…");
      this._boot();
    }

    disconnectedCallback() {
      if (this._clockTimer) clearInterval(this._clockTimer);
      if (this._tickerTimer) clearInterval(this._tickerTimer);
      if (this._channel) this._getSupabase().removeChannel(this._channel);
    }

    async _boot() {
      await this._loadAll();
      if (!this._match) {
        this._renderMessage("Match not found");
        return;
      }
      this._restoreLayout();
      this._renderAll();
      this._startClock();
      this._startTicker();
      this._subscribeRealtime();
    }

    _renderMessage(msg) {
      this.shadowRoot.querySelector(".sb").innerHTML = `<div class="sb-msg">${msg}</div>`;
    }

    _restoreLayout() {
      this.shadowRoot.innerHTML = TEMPLATE;
    }

    async _loadAll() {
      const sb = this._getSupabase();
      const [{ data: club }, { data: teams }, { data: players }, { data: match }] = await Promise.all([
        sb.from("club_profile").select("name").eq("id", 1).single(),
        sb.from("teams").select("*"),
        sb.from("players").select("*").eq("is_active", true).order("full_name"),
        sb.from("matches").select("*").eq("id", this._matchId).single(),
      ]);

      this._clubName = (club && club.name) || "Our Club";
      this._teams = teams || [];
      this._players = players || [];
      this._match = match || null;

      if (!this._match) return;

      const [{ data: g }, { data: c }, { data: s }, { data: l }] = await Promise.all([
        sb.from("match_goals").select("*").eq("match_id", this._matchId).order("minute"),
        sb.from("match_cards").select("*").eq("match_id", this._matchId).order("minute"),
        sb.from("match_substitutions").select("*").eq("match_id", this._matchId).order("minute"),
        sb.from("match_lineups").select("*").eq("match_id", this._matchId),
      ]);
      this._goals = g || [];
      this._cards = c || [];
      this._subs = s || [];
      this._lineups = l || [];
    }

    _teamName(id) {
      const t = this._teams.find((t) => t.id === id);
      return t ? t.name : "Unknown team";
    }
    _playerName(id) {
      const p = this._players.find((p) => p.id === id);
      return p ? p.team_name || p.full_name : "Unknown";
    }

    _subscribeRealtime() {
      const sb = this._getSupabase();
      this._channel = sb
        .channel(`fab-scoreboard-${this._matchId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${this._matchId}` }, () => this._reloadAndRender())
        .on("postgres_changes", { event: "*", schema: "public", table: "match_goals", filter: `match_id=eq.${this._matchId}` }, () => this._reloadAndRender())
        .on("postgres_changes", { event: "*", schema: "public", table: "match_cards", filter: `match_id=eq.${this._matchId}` }, () => this._reloadAndRender())
        .on("postgres_changes", { event: "*", schema: "public", table: "match_substitutions", filter: `match_id=eq.${this._matchId}` }, () => this._reloadAndRender())
        .on("postgres_changes", { event: "*", schema: "public", table: "match_lineups", filter: `match_id=eq.${this._matchId}` }, () => this._reloadAndRender())
        .subscribe((status, err) => {
          console.log("[fab-scoreboard] realtime channel status:", status, err || "");
        });
    }

    async _reloadAndRender() {
      await this._loadAll();
      if (!this._match) return;
      this._renderAll();
      this._startTicker();
    }

    _startClock() {
      if (this._clockTimer) clearInterval(this._clockTimer);
      this._clockTimer = setInterval(() => this._renderClockAndPhase(), CLOCK_TICK_MS);
    }

    _startTicker() {
      if (this._tickerTimer) clearInterval(this._tickerTimer);
      this._tickerIdx = 0;
      this._rebuildTickerItems();
      this._renderTickerFrame(false);
      this._tickerTimer = setInterval(() => {
        this._tickerIdx = (this._tickerIdx + 1) % this._tickerItems.length;
        this._renderTickerFrame(true);
      }, TICKER_ROTATE_MS);
    }

    _rebuildTickerItems() {
      const core = window.ScoreboardCore;
      const minute = core.currentMinute(this._match);
      const starterNames = this._lineups.filter((l) => l.is_starter).map((l) => this._playerName(l.player_id));

      const events = [
        ...this._goals.map((g) => ({
          minute: g.minute,
          text: g.is_opponent_goal
            ? `⚽ GOAL — ${this._teamName(this._match.opponent_team_id)}`
            : `⚽ GOAL — ${this._playerName(g.scorer_id)}${g.assist_id ? ` (assist: ${this._playerName(g.assist_id)})` : ""}`,
        })),
        ...this._cards.map((c) => ({
          minute: c.minute,
          text: `${c.card_type === "yellow" ? "🟨" : "🟥"} ${this._playerName(c.player_id)}`,
        })),
        ...this._subs.map((s) => ({
          minute: s.minute,
          text: `🔄 ${this._playerName(s.player_out_id)} → ${this._playerName(s.player_in_id)}`,
        })),
      ];

      this._tickerItems = core.buildTickerItems({
        phase: this._match.live_state,
        minute,
        starterNames,
        events,
      });
    }

    _renderTickerFrame(animate) {
      const track = this.shadowRoot.querySelector(".sb-ticker-track");
      if (!track) return;
      const text = this._tickerItems[this._tickerIdx] || "";
      if (!animate) {
        track.textContent = text;
        return;
      }
      track.classList.add("fade");
      setTimeout(() => {
        track.textContent = text;
        track.classList.remove("fade");
      }, 250);
    }

    _renderAll() {
      if (!this._match) return;
      const core = window.ScoreboardCore;
      const m = this._match;

      const opponentName = this._teamName(m.opponent_team_id);
      const homeSide = m.is_home ? this._clubName : opponentName;
      const awaySide = m.is_home ? opponentName : this._clubName;
      this.shadowRoot.querySelector(".sb-teams").textContent = `${homeSide} vs ${awaySide}`;

      const isLive = core.isLivePhase(m.live_state);
      this.shadowRoot.querySelector(".live-dot").classList.toggle("pulsing", isLive);
      this.shadowRoot.querySelector(".sb-live-label").textContent = isLive
        ? "Live"
        : m.live_state === "not_started"
        ? ""
        : core.phaseLabel(m.live_state);

      const score = core.computeScore(this._goals, m.is_home);
      this.shadowRoot.querySelector(".sb-score").textContent = `${score.home} – ${score.away}`;

      const ourCounts = core.cardCounts(this._cards);
      const ourSide = m.is_home ? "home" : "away";
      const oppSide = m.is_home ? "away" : "home";
      this._renderBadges(ourSide, ourCounts);
      this._renderBadges(oppSide, { yellow: 0, red: 0 });

      this._renderClockAndPhase();
    }

    _renderBadges(side, counts) {
      const core = window.ScoreboardCore;
      const container = this.shadowRoot.querySelector(`.sb-cards.${side}`);
      if (!container) return;

      const red = core.formatCardBadge(counts.red, "🟥");
      const yellow = core.formatCardBadge(counts.yellow, "🟨");
      const parts = [];

      [
        ["red", red],
        ["yellow", yellow],
      ].forEach(([kind, badge]) => {
        if (!badge) return;
        const key = `${side}-${kind}`;
        const prev = this._prevBadgeCounts[key];
        const pulse = prev !== undefined && prev !== badge.count;
        this._prevBadgeCounts[key] = badge.count;
        parts.push(`<span class="badge${pulse ? " pulse" : ""}">${badge.text}</span>`);
      });

      container.innerHTML = parts.join("");
    }

    _renderClockAndPhase() {
      if (!this._match) return;
      const core = window.ScoreboardCore;
      const clockEl = this.shadowRoot.querySelector(".sb-clock");
      if (!clockEl) return;
      clockEl.textContent = core.displayClock(this._match);
      clockEl.classList.toggle("live", core.isLivePhase(this._match.live_state));
      this.shadowRoot.querySelector(".sb-phase").textContent = core.phaseLabel(this._match.live_state);
    }
  }

  if (!customElements.get("fab-scoreboard")) {
    customElements.define("fab-scoreboard", FabScoreboard);
  }
})();