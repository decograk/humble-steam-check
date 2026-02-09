const apiKeyInput = document.getElementById("apiKey");
const steamIdInput = document.getElementById("steamId");
const saveBtn = document.getElementById("save");
const refreshBtn = document.getElementById("refresh");
const statusEl = document.getElementById("status");
const statsEl = document.getElementById("stats");

function setStatus(text, type = "setup") {
  statusEl.textContent = text;
  statusEl.className = `status status--${type}`;
}

async function loadSettings() {
  const stored = await browser.storage.local.get([
    "apiKey", "steamId", "libraryCache", "wishlistCache", "lastFetch",
  ]);

  if (stored.apiKey) apiKeyInput.value = stored.apiKey;
  if (stored.steamId) steamIdInput.value = stored.steamId;

  if (!stored.apiKey || !stored.steamId) {
    setStatus("⚙️ Enter your Steam API key and ID below to get started.", "setup");
    return;
  }

  if (stored.libraryCache) {
    const owned = stored.libraryCache.length;
    const wishlisted = stored.wishlistCache?.length || 0;
    const ago = stored.lastFetch
      ? Math.round((Date.now() - stored.lastFetch) / 1000 / 60)
      : "?";
    setStatus(`✓ Connected — ${owned} games, ${wishlisted} wishlisted`, "ok");
    statsEl.textContent = `Last synced ${ago} min ago`;
  } else {
    setStatus("⚙️ Configured but not synced yet. Hit Save & Sync.", "setup");
  }
}

saveBtn.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  const steamId = steamIdInput.value.trim();

  if (!apiKey || !steamId) {
    setStatus("❌ Both fields are required.", "error");
    return;
  }

  if (!/^\d{17}$/.test(steamId)) {
    setStatus("❌ Steam ID should be 17 digits (64-bit ID).", "error");
    return;
  }

  setStatus("⏳ Saving and syncing...", "setup");
  await browser.storage.local.set({ apiKey, steamId });

  const result = await browser.runtime.sendMessage({ type: "refreshLibrary" });
  if (result.error) {
    setStatus(`❌ ${result.error}`, "error");
  } else {
    setStatus(
      `✓ Synced! ${result.owned.length} games, ${result.wishlist.length} wishlisted`,
      "ok"
    );
    statsEl.textContent = "Just now";
  }
});

refreshBtn.addEventListener("click", async () => {
  setStatus("⏳ Refreshing...", "setup");
  const result = await browser.runtime.sendMessage({ type: "refreshLibrary" });
  if (result.error) {
    setStatus(`❌ ${result.error}`, "error");
  } else {
    setStatus(
      `✓ Refreshed! ${result.owned.length} games, ${result.wishlist.length} wishlisted`,
      "ok"
    );
    statsEl.textContent = "Just now";
  }
});

// Auto-save fields on change so they survive popup close
apiKeyInput.addEventListener("input", () => {
  browser.storage.local.set({ apiKey: apiKeyInput.value.trim() });
});
steamIdInput.addEventListener("input", () => {
  browser.storage.local.set({ steamId: steamIdInput.value.trim() });
});

loadSettings();
