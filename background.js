/**
 * Background script — handles Steam API calls and library caching.
 *
 * Listens for messages from content script and popup.
 * Caches the user's Steam library in extension storage.
 */

const STEAM_API_BASE = "https://api.steampowered.com";
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

/**
 * Fetch the user's owned games from Steam Web API.
 * Returns a Map of appId -> game name.
 */
async function fetchOwnedGames(apiKey, steamId) {
  const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Steam API error: ${resp.status}`);
  const data = await resp.json();
  const games = data?.response?.games || [];
  return games.map((g) => ({ appId: g.appid, name: g.name }));
}

/**
 * Fetch the user's wishlist from Steam store.
 * Steam wishlist API is paginated, returns up to 50 per page.
 */
async function fetchWishlist(steamId) {
  const games = [];
  let page = 0;
  while (true) {
    const url = `https://store.steampowered.com/wishlist/profiles/${steamId}/wishlistdata/?p=${page}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) break;
      const text = await resp.text();
      // Steam returns HTML or empty when wishlist is private/empty
      if (!text || text.trimStart().startsWith("<") || text.trimStart().startsWith("[]")) break;
      const data = JSON.parse(text);
      if (!data || typeof data !== "object" || Object.keys(data).length === 0) break;
      for (const [appId, info] of Object.entries(data)) {
        games.push({ appId: parseInt(appId), name: info.name });
      }
      page++;
    } catch (e) {
      console.warn("[Humble Steam Check] Wishlist fetch failed (may be private):", e.message);
      break;
    }
  }
  return games;
}

/**
 * Get cached library or fetch fresh from Steam.
 */
async function getLibrary() {
  const stored = await browser.storage.local.get([
    "apiKey",
    "steamId",
    "libraryCache",
    "wishlistCache",
    "lastFetch",
  ]);

  if (!stored.apiKey || !stored.steamId) {
    return { error: "not_configured" };
  }

  const now = Date.now();
  if (stored.libraryCache && stored.lastFetch && now - stored.lastFetch < CACHE_TTL_MS) {
    return {
      owned: stored.libraryCache,
      wishlist: stored.wishlistCache || [],
    };
  }

  try {
    const owned = await fetchOwnedGames(stored.apiKey, stored.steamId);
    const wishlist = await fetchWishlist(stored.steamId);

    await browser.storage.local.set({
      libraryCache: owned,
      wishlistCache: wishlist,
      lastFetch: now,
    });

    return { owned, wishlist };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Force refresh the library cache.
 */
async function refreshLibrary() {
  await browser.storage.local.remove(["libraryCache", "wishlistCache", "lastFetch"]);
  return getLibrary();
}

// Message handler
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getLibrary") {
    getLibrary().then(sendResponse);
    return true; // async response
  }
  if (msg.type === "refreshLibrary") {
    refreshLibrary().then(sendResponse);
    return true;
  }
});
