# Privacy Policy — Humble Steam Check

**Last updated:** February 8, 2026

## What data does this extension collect?

None. Humble Steam Check does not collect, transmit, or store any data on external servers. There is no analytics, telemetry, or tracking of any kind.

## What data is stored locally?

The extension stores the following in your browser's local storage (`browser.storage.local`), which never leaves your device:

- **Steam API key** — entered by you in the extension popup
- **Steam ID** — entered by you in the extension popup
- **Game library cache** — a list of game names and app IDs fetched from the Steam API
- **Wishlist cache** — a list of wishlisted game names and app IDs fetched from Steam
- **Last sync timestamp**

This data is used solely to match games on Humble Bundle pages against your Steam library.

## What network requests does the extension make?

The extension makes requests only to:

- **api.steampowered.com** — to fetch your owned games list (using your API key)
- **store.steampowered.com** — to fetch your wishlist (using your Steam ID)

These requests go directly from your browser to Steam's servers. No data passes through any intermediary or third-party server.

## Third-party services

The extension does not use any third-party services, analytics platforms, or advertising networks.

## Data sharing

Your data is never shared with anyone. The extension author has no access to your Steam API key, Steam ID, or game library.

## Data deletion

All stored data can be removed by:
1. Clearing the extension's storage via your browser settings, or
2. Uninstalling the extension

## Contact

Questions? Open an issue at the extension's repository or email grak@deco.sh.
