// scoreboard-core.js
/**
 * ScoreboardCore
 * Pure, framework-free logic for the FAB live scoreboard.
 * No DOM access here — safe to reuse in the admin app, the public site,
 * or unit tests. Exposes a single global: window.ScoreboardCore
 *
 * Identical file, shared byte-for-byte between the admin dashboard and
 * the public site codebases.
 */
(function (global) {
  "use strict";

  const PHASE_LABELS = {
    not_started: "Not Started",
    first_half: "First Half — Live",
    half_time: "Half Time",
    second_half: "Second Half — Live",
    extra_time: "Extra Time — Live",
    full_time: "Full Time",
  };

  const LIVE_PHASES = ["first_half", "second_half", "extra_time"];

  function isLivePhase(state) {
    return LIVE_PHASES.includes(state);
  }

  function phaseLabel(state) {
    return PHASE_LABELS[state] || "";
  }

  // ---------------------------------------------------------------------
  // Clock
  // ---------------------------------------------------------------------
  function currentMinute(match) {
    if (!match) return null;
    if (match.live_state === "first_half" && match.first_half_started_at) {
      return Math.floor((Date.now() - new Date(match.first_half_started_at).getTime()) / 60000) + 1;
    }
    if (match.live_state === "second_half" && match.second_half_started_at) {
      return (
        (match.half_length_minutes || 45) +
        Math.floor((Date.now() - new Date(match.second_half_started_at).getTime()) / 60000) +
        1
      );
    }
    if (match.live_state === "extra_time" && match.extra_time_started_at) {
      const base = (match.half_length_minutes || 0) + (match.second_half_length_minutes || 0);
      return base + Math.floor((Date.now() - new Date(match.extra_time_started_at).getTime()) / 60000) + 1;
    }
    return null;
  }

  function elapsedSeconds(match) {
    if (!match) return null;
    if (match.live_state === "first_half" && match.first_half_started_at) {
      return Math.floor((Date.now() - new Date(match.first_half_started_at).getTime()) / 1000);
    }
    if (match.live_state === "second_half" && match.second_half_started_at) {
      const half1Sec = (match.half_length_minutes || 45) * 60;
      return half1Sec + Math.floor((Date.now() - new Date(match.second_half_started_at).getTime()) / 1000);
    }
    if (match.live_state === "extra_time" && match.extra_time_started_at) {
      const baseSec = ((match.half_length_minutes || 0) + (match.second_half_length_minutes || 0)) * 60;
      return baseSec + Math.floor((Date.now() - new Date(match.extra_time_started_at).getTime()) / 1000);
    }
    return null;
  }

  function formatMMSS(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // Displays as MM:SS while live, otherwise HT / FT / —
  function displayClock(match) {
    if (!match) return "—";
    if (match.live_state === "not_started") return "—";
    if (match.live_state === "half_time") return "HT";
    if (match.live_state === "full_time") return "FT";
    const sec = elapsedSeconds(match);
    return sec === null ? "—" : formatMMSS(sec);
  }

  // ---------------------------------------------------------------------
  // Minute-with-stoppage display (e.g. "20'" during play, "20+3'"
  // once a phase runs past its configured length). Additive — does
  // not replace currentMinute/elapsedSeconds/displayClock above,
  // which keep their existing (uncapped) behaviour so nothing that
  // already depends on them changes. Use this wherever a football-
  // style minute label (not MM:SS) is wanted, e.g. a home-page card.
  //
  // Extra time has no configured length field on `matches` yet
  // (only half_length_minutes / second_half_length_minutes exist),
  // so it falls back to the old uncapped running count. Add an
  // `extra_time_length_minutes` column and pass it through if you
  // want stoppage notation during extra time too.
  // ---------------------------------------------------------------------
  function formatStoppageMinute(elapsedInPhase, phaseLength, baseMinutes) {
    if (elapsedInPhase <= phaseLength) return `${baseMinutes + elapsedInPhase}'`;
    return `${baseMinutes + phaseLength}+${elapsedInPhase - phaseLength}'`;
  }

  function minuteWithStoppage(match) {
    if (!match) return "";
    if (match.live_state === "half_time") return "HT";
    if (match.live_state === "full_time") return "FT";
    if (match.live_state === "not_started") return "";

    const halfLen = match.half_length_minutes || 45;
    const secondLen = match.second_half_length_minutes || halfLen;

    if (match.live_state === "first_half" && match.first_half_started_at) {
      const elapsed = Math.floor((Date.now() - new Date(match.first_half_started_at).getTime()) / 60000) + 1;
      return formatStoppageMinute(elapsed, halfLen, 0);
    }
    if (match.live_state === "second_half" && match.second_half_started_at) {
      const elapsed = Math.floor((Date.now() - new Date(match.second_half_started_at).getTime()) / 60000) + 1;
      return formatStoppageMinute(elapsed, secondLen, halfLen);
    }
    if (match.live_state === "extra_time" && match.extra_time_started_at) {
      const base = halfLen + secondLen;
      const elapsed = Math.floor((Date.now() - new Date(match.extra_time_started_at).getTime()) / 60000) + 1;
      const extraLen = match.extra_time_length_minutes || null;
      if (extraLen) return formatStoppageMinute(elapsed, extraLen, base);
      // No configured extra-time length — same long-standing
      // uncapped behaviour as before.
      return `${base + elapsed}'`;
    }
    return "";
  }

  // ---------------------------------------------------------------------
  // Score
  // ---------------------------------------------------------------------
  function computeScore(goals, isHome) {
    const our = (goals || []).filter((g) => !g.is_opponent_goal).length;
    const opp = (goals || []).filter((g) => g.is_opponent_goal).length;
    return {
      home: isHome ? our : opp,
      away: isHome ? opp : our,
      our,
      opp,
    };
  }

  // ---------------------------------------------------------------------
  // Card badges
  // Rule (per design notes): 0 -> hidden, 1 -> icon only, >1 -> icon + number
  // ---------------------------------------------------------------------
  function formatCardBadge(count, icon) {
    if (!count || count <= 0) return null;
    if (count === 1) return { text: icon, count };
    return { text: `${count}${icon}`, count };
  }

  function cardCounts(cards) {
    const yellow = (cards || []).filter((c) => c.card_type === "yellow").length;
    const red = (cards || []).filter((c) => c.card_type === "red").length;
    return { yellow, red };
  }

  // ---------------------------------------------------------------------
  // Ticker timing
  // Starting XI only shows during the first live minute of the first half.
  // Individual goal/card/sub events are shown for a fixed window
  // (handled in fab-scoreboard.js, which tracks arrival time per event).
  // ---------------------------------------------------------------------
  function shouldShowLineup(phase, minute) {
    return phase === "first_half" && minute !== null && minute <= 1;
  }

  global.ScoreboardCore = {
    phaseLabel,
    isLivePhase,
    currentMinute,
    elapsedSeconds,
    formatMMSS,
    displayClock,
    minuteWithStoppage,
    computeScore,
    formatCardBadge,
    cardCounts,
    shouldShowLineup,
  };
})(window);