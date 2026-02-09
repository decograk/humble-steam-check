/**
 * Content script — runs on Humble Bundle pages.
 * Finds game titles, matches against Steam library, injects badges.
 */

(() => {
  const { matchGame, normalizeName } = __humbleSteamCheck;

  const BADGE_CLASS = "hsc-badge";
  const PROCESSED_ATTR = "data-hsc-processed";

  /**
   * Extract game info from Humble Bundle page elements.
   */
  function extractGamesFromPage() {
    const games = [];
    const seen = new Set();

    const selectors = [
      ".item-title",
      ".content-choice-title .entity-title",
      ".dd-image-box-caption .dd-image-box-text",
      ".entity-title",
      "[class*='content-choice'] [class*='title']",
      ".game-name h4",
      ".game-name",
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (el.hasAttribute(PROCESSED_ATTR)) continue;

        const name = el.textContent?.trim();
        if (!name || name.length < 2 || seen.has(name)) continue;
        seen.add(name);

        // Try to find Steam app ID from nearby links or data attributes
        let steamAppId = null;
        const parent = el.closest("a, [data-app-id], [data-steam-app-id]");
        if (parent) {
          steamAppId =
            parseInt(parent.dataset.appId) ||
            parseInt(parent.dataset.steamAppId) ||
            null;

          if (!steamAppId) {
            const steamLink =
              parent.querySelector('a[href*="store.steampowered.com/app/"]') ||
              el.closest('[href*="store.steampowered.com/app/"]');
            if (steamLink) {
              const match = steamLink.href.match(/\/app\/(\d+)/);
              if (match) steamAppId = parseInt(match[1]);
            }
          }
        }

        // Find the tier-item-view parent for badge placement
        const card = el.closest(".tier-item-view") || el.closest("a") || el.parentElement;
        games.push({ name, steamAppId, element: el, card });
      }
    }

    return games;
  }

  /**
   * Inject a badge on a game card.
   */
  function injectBadge(game, status, matchName) {
    const { element, card } = game;
    if (element.hasAttribute(PROCESSED_ATTR)) return;
    element.setAttribute(PROCESSED_ATTR, "true");

    const badge = document.createElement("div");
    badge.className = `${BADGE_CLASS} ${BADGE_CLASS}--${status}`;

    if (status === "owned") {
      badge.textContent = "✓ Owned";
      badge.title = `In your Steam library${matchName ? ` as "${matchName}"` : ""}`;
    } else if (status === "base_owned") {
      badge.textContent = "⊕ Base Owned";
      badge.title = `You own the base game${matchName ? ` "${matchName}"` : ""} — can't confirm if you have this specific DLC`;
    } else if (status === "wishlisted") {
      badge.textContent = "★ Wishlisted";
      badge.title = `On your Steam wishlist${matchName ? ` as "${matchName}"` : ""}`;
    } else if (status === "not_owned") {
      badge.textContent = "✗ Not Owned";
      badge.title = "Not found in your Steam library";
    }

    // Place badge on the card, not inside the small span
    const target = card || element.parentElement;
    target.style.position = "relative";
    badge.style.position = "absolute";
    badge.style.top = "8px";
    badge.style.right = "8px";
    badge.style.zIndex = "1000";
    target.appendChild(badge);
  }

  /**
   * Main: fetch library, scan page, inject badges.
   */
  async function run() {
    const response = await browser.runtime.sendMessage({ type: "getLibrary" });

    if (response.error === "not_configured") {
      console.log("[Humble Steam Check] Not configured — open extension popup to set up.");
      return;
    }
    if (response.error) {
      console.error("[Humble Steam Check]", response.error);
      return;
    }

    const { owned = [], wishlist = [] } = response;
    console.log(
      `[Humble Steam Check] Library: ${owned.length} owned, ${wishlist.length} wishlisted`
    );

    const scan = () => {
      const games = extractGamesFromPage();
      let matched = 0;
      for (const game of games) {
        const result = matchGame(game, owned, wishlist);
        injectBadge(game, result.status, result.match?.name);
        if (result.status !== "not_owned") {
          matched++;
          console.log(`[Humble Steam Check] ✓ "${game.name}" → ${result.status} as "${result.match?.name}"`);
        } else {
          console.debug(`[Humble Steam Check] ✗ "${game.name}" (normalized: "${normalizeName(game.name)}")`);
        }
      }
      if (games.length > 0) {
        console.log(
          `[Humble Steam Check] Scanned ${games.length} games, ${matched} matched`
        );
      }
    };

    // Initial scan
    scan();

    // Re-scan on DOM changes (Humble loads content dynamically)
    const observer = new MutationObserver(() => {
      clearTimeout(observer._debounce);
      observer._debounce = setTimeout(scan, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  run();
})();
