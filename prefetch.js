/* Fetch the next HTML document on intent, without running its scripts.
   Keep this small progressive enhancement shared with louppe.eu. */
(function () {
  var supportsRules = typeof HTMLScriptElement !== "undefined" &&
    typeof HTMLScriptElement.supports === "function" && HTMLScriptElement.supports("speculationrules");
  var probe = document.createElement("link");
  var supportsHint = probe.relList && typeof probe.relList.supports === "function" &&
    probe.relList.supports("prefetch");
  if (!supportsRules && !supportsHint) return;

  var seen = new Set();
  var pending = new Map();
  var delay = 100;
  var limit = 8;

  function canPrefetch() {
    var connection = navigator.connection;
    return navigator.onLine !== false && !(connection &&
      (connection.saveData || /^(slow-)?2g$/.test(connection.effectiveType)));
  }

  // GitHub Pages serves both /coffee and /coffee.html, and directory indexes.
  function pagePath(path) {
    return path.replace(/\/index\.html$/, "/").replace(/\.html$/, "").replace(/\/$/, "") || "/";
  }

  function destination(link) {
    if (!link || link.closest("[data-no-prefetch]") || link.hasAttribute("download") ||
        (link.target && link.target !== "_self") || /\bexternal\b/.test(link.rel)) return null;
    var url;
    try { url = new URL(link.href, location.href); } catch (error) { return null; }
    if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin ||
        url.username || url.password) return null;
    // Skip assets, redirects, and URLs that could represent actions or searches.
    if (/\.[^/]+$/.test(url.pathname) && !url.pathname.endsWith(".html")) return null;
    if (/^\/(?:privacy(?:\.html)?|louppe(?:\/(?:index\.html)?)?)$/.test(url.pathname)) return null;
    if (Array.from(url.searchParams.keys()).some(function (key) {
      return key !== "look" && key !== "seed";
    })) return null;
    if (pagePath(url.pathname) === pagePath(location.pathname) && url.search === location.search) return null;
    url.hash = "";
    return url.href;
  }

  function prefetch(link) {
    if (!canPrefetch() || seen.size >= limit) return;
    var href = destination(link);
    if (!href || seen.has(href)) return;
    seen.add(href);
    if (supportsRules) {
      var rules = document.createElement("script");
      rules.type = "speculationrules";
      rules.textContent = JSON.stringify({ prefetch: [{ urls: [href], eagerness: "immediate" }] });
      document.head.appendChild(rules);
    } else {
      var hint = document.createElement("link");
      hint.rel = "prefetch";
      hint.as = "document";
      hint.href = href;
      document.head.appendChild(hint);
    }
  }

  function anchor(event) {
    return event.target && event.target.closest ? event.target.closest("a[href]") : null;
  }

  function cancel(link) {
    clearTimeout(pending.get(link));
    pending.delete(link);
  }

  function schedule(link) {
    if (!link || !canPrefetch() || !destination(link) || pending.has(link)) return;
    pending.set(link, setTimeout(function () {
      pending.delete(link);
      // Read the URL again: appearance controls may have changed it during hover.
      prefetch(link);
    }, delay));
  }

  document.addEventListener("pointerover", function (event) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    var link = anchor(event);
    if (link && !link.contains(event.relatedTarget)) schedule(link);
  });
  document.addEventListener("pointerout", function (event) {
    var link = anchor(event);
    if (link && !link.contains(event.relatedTarget)) cancel(link);
  });
  document.addEventListener("focusin", function (event) { schedule(anchor(event)); });
  document.addEventListener("focusout", function (event) { cancel(anchor(event)); });
  document.addEventListener("pointerdown", function (event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = anchor(event);
    cancel(link);
    prefetch(link);
  }, { passive: true });
})();
