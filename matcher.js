/**
 * Matching logic — resolves Humble Bundle games to Steam app IDs,
 * with fuzzy string fallback and DLC/edition awareness.
 */

var __humbleSteamCheck = (() => {
  /**
   * Normalize a game name for fuzzy comparison.
   */
  function normalizeName(name) {
    return name
      .toLowerCase()
      .replace(/[™®©]/g, "")
      .replace(/:\s*/g, " ")
      .replace(/\s*-\s*/g, " ")
      .replace(/['']/g, "'")
      .replace(/[^a-z0-9\s']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Strip edition/variant suffixes for base-game matching.
   */
  function stripEdition(name) {
    return name
      .replace(/\b(edition|deluxe|goty|game of the year|complete|definitive|remastered|enhanced|reloaded|ultimate|gold|premium|platinum|standard|special|directors cut|collection|anthology|bundle|pack)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Simple similarity score (Dice coefficient on bigrams).
   */
  function similarity(a, b) {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const bigrams = (str) => {
      const set = new Map();
      for (let i = 0; i < str.length - 1; i++) {
        const bi = str.substring(i, i + 2);
        set.set(bi, (set.get(bi) || 0) + 1);
      }
      return set;
    };

    const aBi = bigrams(a);
    const bBi = bigrams(b);
    let intersection = 0;

    for (const [bi, count] of aBi) {
      if (bBi.has(bi)) {
        intersection += Math.min(count, bBi.get(bi));
      }
    }

    return (2 * intersection) / (a.length - 1 + (b.length - 1));
  }

  const FUZZY_THRESHOLD = 0.85;

  /**
   * Check if two names are a valid fuzzy match.
   */
  function isFuzzyMatch(a, b) {
    const score = similarity(a, b);
    if (score < FUZZY_THRESHOLD) return false;

    // Reject if the names differ only by a number
    const aNumbers = a.match(/\d+/g) || [];
    const bNumbers = b.match(/\d+/g) || [];
    const aWithout = a.replace(/\d+/g, "").trim();
    const bWithout = b.replace(/\d+/g, "").trim();
    if (aWithout === bWithout && JSON.stringify(aNumbers) !== JSON.stringify(bNumbers)) {
      return false;
    }

    // Reject if one string is a prefix of the other (different sequel/variant)
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length <= b.length ? b : a;
    if (longer.startsWith(shorter + " ") || (longer.startsWith(shorter) && longer.length - shorter.length <= 3)) {
      return false;
    }
    // Also reject if they share a long common prefix but diverge (e.g. "x tycoon 3" vs "x tycoon world")
    const aWords = a.split(" ");
    const bWords = b.split(" ");
    let common = 0;
    while (common < aWords.length && common < bWords.length && aWords[common] === bWords[common]) common++;
    if (common > 0 && common < aWords.length && common < bWords.length) {
      // They diverge — if the shared prefix is most of both strings, the differing part matters
      const commonStr = aWords.slice(0, common).join(" ");
      if (commonStr.length / a.length > 0.6 && commonStr.length / b.length > 0.6) {
        return false;
      }
    }

    return true;
  }

  /**
   * Try to extract the base game name from a DLC title.
   * e.g. "Just Cause 3 DLC: Sky Fortress" → "just cause 3"
   * e.g. "Just Cause 4: Neon Racer Pack" → "just cause 4"
   */
  function extractBaseName(normalizedName) {
    // Pattern: "game name dlc something"
    const dlcMatch = normalizedName.match(/^(.+?)\s+dlc\b/);
    if (dlcMatch) return dlcMatch[1].trim();

    // Pattern: "game name [separator] dlc name" where separator created a space
    // After normalization, "Game: DLC Name" becomes "game dlc name"
    // But "Just Cause 4: Neon Racer Pack" becomes "just cause 4 neon racer pack"
    // We need to check if a known game is a prefix
    return null;
  }

  /**
   * Match a Humble game against the user's Steam library.
   *
   * Returns:
   *   { status: 'owned', match }       — exact game owned
   *   { status: 'wishlisted', match }   — exact game wishlisted
   *   { status: 'base_owned', match }   — DLC/edition whose base game is owned
   *   { status: 'not_owned' }           — no match
   */
  function matchGame(humbleGame, ownedGames, wishlistGames) {
    // Strategy 1: Direct app ID match
    if (humbleGame.steamAppId) {
      const ownedMatch = ownedGames.find((g) => g.appId === humbleGame.steamAppId);
      if (ownedMatch) return { status: "owned", match: ownedMatch };

      const wishMatch = wishlistGames.find((g) => g.appId === humbleGame.steamAppId);
      if (wishMatch) return { status: "wishlisted", match: wishMatch };
    }

    const normalizedHumble = normalizeName(humbleGame.name);
    const strippedHumble = stripEdition(normalizedHumble);

    // Strategy 2: Exact or fuzzy name match
    for (const game of ownedGames) {
      const normalizedOwned = normalizeName(game.name);
      const strippedOwned = stripEdition(normalizedOwned);

      // Exact match
      if (normalizedHumble === normalizedOwned) return { status: "owned", match: game };
      // Edition-stripped match (e.g. "just cause 4 reloaded" → "just cause 4")
      if (strippedHumble === strippedOwned) return { status: "owned", match: game };
      // Fuzzy match
      if (isFuzzyMatch(normalizedHumble, normalizedOwned)) return { status: "owned", match: game };
      if (isFuzzyMatch(strippedHumble, strippedOwned)) return { status: "owned", match: game };
    }

    for (const game of wishlistGames) {
      const normalizedWish = normalizeName(game.name);
      const strippedWish = stripEdition(normalizedWish);

      if (normalizedHumble === normalizedWish) return { status: "wishlisted", match: game };
      if (strippedHumble === strippedWish) return { status: "wishlisted", match: game };
      if (isFuzzyMatch(normalizedHumble, normalizedWish)) return { status: "wishlisted", match: game };
      if (isFuzzyMatch(strippedHumble, strippedWish)) return { status: "wishlisted", match: game };
    }

    // Strategy 3: DLC/edition — check if the base game is owned
    // Check if any owned game name is a prefix of this item
    // But NOT if the suffix is just an edition/remaster word (those are different products)
    const EDITION_SUFFIXES = /^(edition|deluxe|goty|game of the year|complete|definitive|remastered|remaster|enhanced|reloaded|ultimate|gold|premium|platinum|standard|special|directors cut|collection|anthology|bundle|pack|classic|hd|4k)(\s|$)/i;
    const baseName = extractBaseName(normalizedHumble);
    for (const game of ownedGames) {
      const normalizedOwned = normalizeName(game.name);
      // Direct prefix: "just cause 4" is prefix of "just cause 4 neon racer pack"
      if (normalizedHumble.startsWith(normalizedOwned + " ")) {
        const suffix = normalizedHumble.slice(normalizedOwned.length + 1);
        // If suffix is just an edition word, skip — it's a different product
        if (EDITION_SUFFIXES.test(suffix)) continue;
        return { status: "base_owned", match: game };
      }
      // Also check extracted base name
      if (baseName && (baseName === normalizedOwned || isFuzzyMatch(baseName, normalizedOwned))) {
        return { status: "base_owned", match: game };
      }
    }

    return { status: "not_owned" };
  }

  return { matchGame, normalizeName, similarity, stripEdition };
})();
