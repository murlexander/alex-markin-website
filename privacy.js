(function () {
  var key = "alex-markin:analytics-consent";
  var maxAge = 180 * 24 * 60 * 60 * 1000;
  var measurementId = "G-6JZ3GQEVFL";
  var choice = null;
  try {
    choice = JSON.parse(localStorage.getItem(key));
    if (!choice || choice.version !== 1 || typeof choice.at !== "number" ||
        choice.at > Date.now() || Date.now() - choice.at > maxAge) choice = null;
  } catch (error) { choice = null; }

  function loadAnalytics() {
    // Preview and copied deployments must never send traffic to the live property.
    if (location.hostname !== "alex-markin.com" || location.protocol !== "https:") return;
    if (document.querySelector("script[data-analytics]")) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      cookie_expires: 15552000,
      cookie_update: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var script = document.createElement("script");
    script.async = true;
    script.dataset.analytics = "";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
    document.head.appendChild(script);
  }

  function clearAnalyticsCookies() {
    document.cookie.split(";").forEach(function (part) {
      var name = part.trim().split("=")[0];
      if (!/^_ga(?:_|$)/.test(name)) return;
      var host = location.hostname;
      ["", "; domain=" + host, "; domain=." + host].forEach(function (domain) {
        document.cookie = name + "=; Max-Age=0; path=/" + domain + "; SameSite=Lax";
      });
    });
  }

  if (!choice || !choice.allowed) clearAnalyticsCookies();

  // Cookie-free visit counts (Cloudflare Web Analytics); no consent needed, live site only.
  (function loadVisitCounter() {
    if (location.hostname !== "alex-markin.com" || location.protocol !== "https:") return;
    if (document.querySelector("script[data-cf-beacon]")) return;
    var beacon = document.createElement("script");
    beacon.defer = true;
    beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
    beacon.setAttribute("data-cf-beacon", '{"token": "2047200eeeca4f5b9400baae09a34d87"}');
    document.head.appendChild(beacon);
  })();

  function save(allowed) {
    var wasAllowed = !!(choice && choice.allowed);
    choice = { version: 1, allowed: allowed, at: Date.now() };
    try { localStorage.setItem(key, JSON.stringify(choice)); }
    catch (error) { /* no durable choice; ask again on a later visit */ }
    panel.hidden = true;
    control.setAttribute("aria-expanded", "false");
    updatePanel();
    if (allowed) {
      loadAnalytics();
    } else {
      clearAnalyticsCookies();
      if (wasAllowed) location.reload();
    }
  }

  var showPanel = !choice || new URLSearchParams(location.search).has("privacy");
  var control = document.createElement("button");
  control.type = "button";
  control.className = "privacy-control copy-markdown";
  control.setAttribute("aria-controls", "analytics-choice");
  control.setAttribute("aria-expanded", String(showPanel));
  control.textContent = "privacy";

  var copy = document.querySelector(".footer [data-copy-markdown]");
  if (copy) {
    var utilities = document.createElement("div");
    utilities.className = "footer-utilities";
    copy.parentNode.insertBefore(utilities, copy);
    utilities.appendChild(copy);
    utilities.appendChild(control);
    document.body.classList.add("privacy-has-footer");
  } else {
    var tools = document.createElement("div");
    tools.className = "privacy-tools";
    tools.appendChild(control);
    document.body.appendChild(tools);
  }

  var panel = document.createElement("section");
  panel.id = "analytics-choice";
  panel.className = "privacy-panel";
  panel.setAttribute("aria-label", "privacy and analytics");
  panel.innerHTML = '<p class="privacy-question">allow google analytics to count visits?</p>' +
    '<details class="privacy-more"><summary>details</summary><p>google gets your page, ip and device details and sets <code>_ga</code>/<code>_ga_*</code> cookies (six months). alex markin · <a href="mailto:a@alex-markin.com">a@alex-markin.com</a> (controller). github pages logs ip for security (legitimate interest; <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">policy</a>). cloudflare web analytics counts visits without cookies or fingerprinting (legitimate interest; <a href="https://www.cloudflare.com/web-analytics/">about</a>). choice: 180 days; site look: this session. analytics data: up to 14 months; google may process outside the eea (<a href="https://policies.google.com/privacy/frameworks">safeguards</a>). withdraw anytime. email for access, correction, deletion, restriction, objection or portability; complain to <a href="https://www.datatilsynet.dk/borger/klage">datatilsynet</a>.</p></details>' +
    '<div class="privacy-actions"><button type="button" data-choice="no">no thanks</button><button type="button" data-choice="yes">allow analytics</button></div>';
  var noButton = panel.querySelector('[data-choice="no"]');
  var yesButton = panel.querySelector('[data-choice="yes"]');
  function updatePanel() {
    var allowed = !!(choice && choice.allowed);
    panel.querySelector(".privacy-question").textContent = allowed
      ? "google analytics is on. turn it off?"
      : "allow google analytics to count visits?";
    noButton.textContent = allowed ? "turn off analytics" : "no thanks";
    yesButton.textContent = allowed ? "keep analytics on" : "allow analytics";
  }
  updatePanel();
  panel.hidden = !showPanel;
  document.body.appendChild(panel);

  control.addEventListener("click", function () {
    panel.hidden = !panel.hidden;
    control.setAttribute("aria-expanded", String(!panel.hidden));
  });
  noButton.addEventListener("click", function () { save(false); });
  yesButton.addEventListener("click", function () { save(true); });

  if (choice && choice.allowed) loadAnalytics();

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[href]");
    if (!link || !choice || !choice.allowed || typeof window.gtag !== "function" ||
        location.hostname !== "alex-markin.com" || location.protocol !== "https:") return;
    if (link.getAttribute("href").indexOf("mailto:") !== 0) return;
    // Count intent without sending the email address or message contents.
    window.gtag("event", "contact_click", { send_to: measurementId });
  });
})();
