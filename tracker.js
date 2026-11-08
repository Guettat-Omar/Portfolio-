/* Visitor analytics → Supabase `events` table (insert-only).
   Records: session start, every tracked click (CV, LinkedIn, email, GitHub…),
   time actually spent with the tab visible, scroll depth, and who the visitor
   is IF they are identifiable (personal ?r= link, or they typed their name). */
(function () {
  const C = window.SITE_CONFIG || {};
  const enabled = C.supabaseUrl && !C.supabaseUrl.includes("YOUR-PROJECT");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  // DNT respected; "og_ignore" is set from admin.html so YOUR visits aren't counted
  const dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1" || store.get("og_ignore") === "1";
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() :
    Date.now().toString(36) + Math.random().toString(36).slice(2));

  // Stable per-browser id (returning visitors) + per-visit session id
  let visitorId = store.get("og_vid");
  if (!visitorId) { visitorId = uid(); store.set("og_vid", visitorId); }
  const sessionId = uid();

  // ?r=valeo-sarah  → personal link you sent to a specific recruiter
  const params = new URLSearchParams(location.search);
  let ref = params.get("r") || params.get("ref");
  if (ref) store.set("og_ref", ref); else ref = store.get("og_ref");
  if (ref && params.has("r")) {          // keep URL clean after capture
    params.delete("r"); params.delete("ref");
    const q = params.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
  }
  let declaredName = store.get("og_name");
  let declaredCompany = store.get("og_company");

  // Visible-time counter (ignores time the tab sits in the background)
  let visibleMs = 0, lastVisibleAt = document.visibilityState === "visible" ? Date.now() : null;
  const activeSeconds = () =>
    Math.round((visibleMs + (lastVisibleAt ? Date.now() - lastVisibleAt : 0)) / 1000);
  let maxScroll = 0;
  addEventListener("scroll", () => {
    const h = document.documentElement;
    const pct = Math.round(100 * (h.scrollTop + innerHeight) / h.scrollHeight);
    if (pct > maxScroll) maxScroll = Math.min(100, pct);
  }, { passive: true });

  function send(type, label, extra) {
    const row = {
      session_id: sessionId,
      visitor_id: visitorId,
      event_type: type,
      label: label || null,
      ref_tag: ref || null,
      visitor_name: declaredName || null,
      visitor_company: declaredCompany || null,
      duration_s: activeSeconds(),
      scroll_pct: maxScroll,
      page: location.pathname,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: screen.width + "x" + screen.height,
      meta: extra || null
    };
    if (!enabled || dnt) { console.debug("[track]", row); return; }
    fetch(C.supabaseUrl + "/rest/v1/events", {
      method: "POST",
      keepalive: true,                       // survives tab close
      headers: {
        "Content-Type": "application/json",
        apikey: C.supabaseAnonKey,
        Authorization: "Bearer " + C.supabaseAnonKey,
        Prefer: "return=minimal"
      },
      body: JSON.stringify(row)
    }).catch(() => {});
  }

  // Lifecycle
  send("visit", document.title);
  const ping = setInterval(() => {
    if (document.visibilityState === "visible") send("ping");
  }, 30000);
  setTimeout(() => clearInterval(ping), 30 * 60 * 1000); // stop pinging after 30 min

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (lastVisibleAt) { visibleMs += Date.now() - lastVisibleAt; lastVisibleAt = null; }
      send("leave");                         // fires on tab switch / close / mobile background
    } else {
      lastVisibleAt = Date.now();
    }
  });

  // Any element with data-track="cv_download" etc. is logged on click
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-track]");
    if (el) send("click", el.dataset.track, { href: el.getAttribute("href") });
  }, true);

  // Section views (which parts of the page they actually read)
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const id = en.target.id;
      if (en.isIntersecting && id && !seen.has(id)) { seen.add(id); send("section", id); }
    });
  }, { threshold: 0.45 });
  addEventListener("DOMContentLoaded", () =>
    document.querySelectorAll("section[id]").forEach((s) => io.observe(s)));

  // Public API for the optional "who are you?" form
  window.OGTrack = {
    identify(name, company) {
      declaredName = (name || "").trim().slice(0, 80) || null;
      declaredCompany = (company || "").trim().slice(0, 80) || null;
      if (declaredName) store.set("og_name", declaredName);
      if (declaredCompany) store.set("og_company", declaredCompany);
      send("identify", declaredName, { company: declaredCompany });
    },
    known: () => !!declaredName || !!ref,
    send
  };
})();
