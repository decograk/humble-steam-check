# <img src="icons/icon-readme.png" width="32" height="32" alt="icon"> Humble Steam Check

A Firefox extension that shows which games on Humble Bundle pages are already in your Steam library.

![Badge example](https://img.shields.io/badge/status-beta-blue)

## What It Does

When you browse a Humble Bundle page, the extension marks each game with a badge:

- **✓ Owned** (green) — You own this game on Steam
- **⊕ Base Owned** (blue) — You own the base game; this is DLC for it
- **★ Wishlisted** (gold) — This game is on your Steam wishlist
- **✗ Not Owned** (red) — Not found in your Steam library

## How It Works

1. Fetches your Steam library via the Steam Web API
2. Scans the Humble Bundle page for game titles
3. Matches games by Steam app ID when available, fuzzy name matching as fallback
4. Recognizes DLC and edition variants (Reloaded, GOTY, Deluxe, etc.)
5. Caches your library for 1 hour to minimize API calls

## Setup

1. Install the extension (see [Installation](#installation))
2. Click the extension icon in your toolbar
3. Get your **Steam API key** at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
4. Find your **Steam ID** (64-bit) at [steamdb.info/calculator](https://steamdb.info/calculator/)
5. Paste both into the popup and click **Save & Sync**
6. Browse Humble Bundle — badges appear automatically!

## Installation

### Firefox (from source)
1. Download the Firefox zip from the [latest release](https://git.deco.sh/signal-works/humble-steam-check/releases) or clone this repo
2. Open `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on"**
4. Select `manifest.json` from the extracted directory

### Firefox Add-ons
[![AMO](https://img.shields.io/badge/Firefox-Install%20from%20AMO-orange)](https://addons.mozilla.org/en-US/firefox/addon/humble-steam-check/)

Install from [addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/humble-steam-check/).

### Chrome (from source)
1. Download the Chrome zip from the [latest release](https://git.deco.sh/signal-works/humble-steam-check/releases)
2. Unzip it
3. Open `chrome://extensions` and enable **Developer Mode**
4. Click **"Load unpacked"** and select the unzipped folder

Chrome Web Store submission is planned after AMO approval.

## Important Notes

- **DLC detection is limited.** Steam's API doesn't report individual DLC ownership. DLC items show "⊕ Base Owned" if you own the parent game, but you may already own the DLC too — we just can't confirm it.
- **Matching isn't perfect.** Game names sometimes differ between Humble and Steam. The fuzzy matcher handles most cases, but edge cases exist.
- **Wishlist requires a public profile.** If your Steam wishlist is set to private, wishlist badges won't appear.

## Privacy

- Your Steam API key is stored **locally** in the browser extension storage
- The key is **only sent to Steam's API** — nowhere else
- No analytics, no tracking, no external servers

## Development

No build step — plain JavaScript, runs as-is.

```
humble-steam-check/
├── manifest.json       # WebExtension manifest v3
├── background.js       # Steam API calls, library caching
├── content.js          # Humble Bundle page scanning + badge injection
├── matcher.js          # Name matching (app ID, fuzzy, DLC/edition)
├── popup.html/js       # Settings UI
├── styles.css          # Badge styles
└── icons/              # Extension icons
```

## Contributing

Found a bug or a game that doesn't match correctly? [Open an issue on GitHub](https://github.com/decograk/humble-steam-check/issues) with the Humble Bundle page URL and your Steam game name.

Pull requests are welcome on [GitHub](https://github.com/decograk/humble-steam-check). The primary repo is hosted on [git.deco.sh](https://git.deco.sh/signal-works/humble-steam-check); GitHub is a mirror for community contributions.

## License

MIT
