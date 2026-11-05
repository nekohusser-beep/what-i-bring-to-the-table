/** Matching: rank by selected non-staple overlap; never show zero-overlap; garnish-aware Missing-2/3. */
(function (global) {
  const STAPLE_IDS = new Set(['salt', 'black-pepper', 'olive-oil', 'vegetable-oil', 'water', 'butter', 'onion', 'garlic']);
  const GARNISH_IDS = new Set([
    'lemon', 'lime', 'honey', 'basil', 'oregano', 'cilantro', 'green-onion',
    'sesame-seeds', 'sesame-oil', 'paprika', 'mustard', 'ginger', 'jalapeno',
  ]);

  function requiredIngredients(recipe) {
    return (recipe.ingredients || []).filter((ing) => !ing.optional && !ing.staple && !STAPLE_IDS.has(ing.id));
  }

  function selectedNonStaples(pantrySet) {
    return [...pantrySet].filter((id) => !STAPLE_IDS.has(id));
  }

  function matchRecipe(recipe, pantrySet) {
    const required = requiredIngredients(recipe);
    const missing = required.filter((ing) => !pantrySet.has(ing.id));
    const have = required.filter((ing) => pantrySet.has(ing.id));
    const selectedNS = selectedNonStaples(pantrySet);
    const requiredIds = new Set(required.map((i) => i.id));
    const usedSelected = selectedNS.filter((id) => requiredIds.has(id));
    const usedCore = usedSelected.filter((id) => !GARNISH_IDS.has(id));
    const usedGarnish = usedSelected.filter((id) => GARNISH_IDS.has(id));
    return {
      recipe,
      missingCount: missing.length,
      missing,
      have,
      haveCount: have.length,
      exact: missing.length === 0,
      missing1: missing.length === 1,
      usedSelected,
      usedSelectedCount: usedSelected.length,
      usedCore,
      usedCoreCount: usedCore.length,
      usedGarnishCount: usedGarnish.length,
    };
  }

  function applyFilters(matches, opts) {
    opts = opts || {};
    if (opts.avoidAllergens && opts.avoidAllergens.length) {
      const avoid = new Set(opts.avoidAllergens);
      matches = matches.filter((m) => {
        const hard = m.recipe.allergens || [];
        const poss = m.recipe.possibleAllergens || [];
        return !hard.some((a) => avoid.has(a)) && !poss.some((a) => avoid.has(a));
      });
    }
    if (opts.kidFriendly) matches = matches.filter((m) => (m.recipe.tags || []).includes('kid-friendly'));
    if (opts.leq30) matches = matches.filter((m) => (m.recipe.tags || []).includes('leq-30') || m.recipe.cookMinutes <= 30);
    if (opts.vegetarian) matches = matches.filter((m) => (m.recipe.tags || []).includes('vegetarian'));
    if (opts.favoritesOnly && opts.favoriteIds) {
      const fav = new Set(opts.favoriteIds);
      matches = matches.filter((m) => fav.has(m.recipe.id));
    }
    return matches;
  }

  function sortMatches(matches) {
    // Core overlap weighted 3× garnish; Exact first; then Missing-1; then Missing-2/3 by core.
    const score = (m) => m.usedCoreCount * 3 + m.usedGarnishCount - m.missingCount;
    matches.sort((a, b) => {
      if (a.exact !== b.exact) return a.exact ? -1 : 1;
      if (a.missingCount !== b.missingCount && (a.missingCount <= 1 || b.missingCount <= 1)) {
        return a.missingCount - b.missingCount;
      }
      if (a.usedCoreCount !== b.usedCoreCount) return b.usedCoreCount - a.usedCoreCount;
      if (score(a) !== score(b)) return score(b) - score(a);
      if (a.usedSelectedCount !== b.usedSelectedCount) return b.usedSelectedCount - a.usedSelectedCount;
      if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
      return a.recipe.cookMinutes - b.recipe.cookMinutes;
    });
    return matches;
  }

  function findDinners(recipes, pantryIds, opts) {
    opts = opts || {};
    const pantrySet = new Set(pantryIds || []);
    const selectedNS = selectedNonStaples(pantrySet);
    const selectedCore = selectedNS.filter((id) => !GARNISH_IDS.has(id));
    let matches = recipes.map((r) => matchRecipe(r, pantrySet));

    if (selectedNS.length > 0) {
      matches = matches.filter((m) => m.usedSelectedCount >= 1);
    }
    if (opts.minHave) {
      matches = matches.filter((m) => m.haveCount >= opts.minHave);
    }

    const maxMissing = opts.maxMissing == null ? 1 : opts.maxMissing;
    matches = matches.filter((m) => m.missingCount <= maxMissing);

    // Missing-2/3: do not keep cards whose only overlap is a garnish (lemon/honey/herbs).
    // When she picked ≥3 non-staples, require ≥1 core overlap for Missing-2/3.
    matches = matches.filter((m) => {
      if (m.missingCount <= 1) return true;
      if (m.usedCoreCount >= 1) return true;
      if (selectedCore.length >= 3) return false;
      // small pantry: allow only if usedSelectedCount >= 2 (not a lone garnish)
      return m.usedSelectedCount >= 2;
    });

    matches = applyFilters(matches, opts);
    sortMatches(matches);

    const limit = opts.limit == null ? 5 : opts.limit;
    return matches.slice(0, limit);
  }

  function findClosest(recipes, pantryIds, opts) {
    opts = opts || {};
    const pantrySet = new Set(pantryIds || []);
    const selectedNS = selectedNonStaples(pantrySet);
    let matches = recipes.map((r) => matchRecipe(r, pantrySet));
    if (selectedNS.length > 0) {
      matches = matches.filter((m) => m.usedSelectedCount >= 1);
      // Prefer core overlap in closest mode too
      const withCore = matches.filter((m) => m.usedCoreCount >= 1);
      if (withCore.length) matches = withCore;
    } else {
      matches = matches.filter((m) => m.missingCount <= 3);
    }
    matches = applyFilters(matches, opts);
    sortMatches(matches);
    const limit = opts.limit == null ? 5 : opts.limit;
    return matches.slice(0, limit);
  }

  function suggestUnlocks(recipes, pantryIds, opts) {
    opts = opts || {};
    const pantrySet = new Set(pantryIds || []);
    const limit = opts.limit == null ? 3 : opts.limit;
    const nameById = opts.nameById || {};
    const candidates = new Map();
    for (const r of recipes) {
      for (const ing of requiredIngredients(r)) {
        if (!pantrySet.has(ing.id) && !STAPLE_IDS.has(ing.id)) {
          if (!candidates.has(ing.id)) candidates.set(ing.id, ing.name || nameById[ing.id] || ing.id);
        }
      }
    }
    const scored = [];
    for (const [chip, name] of candidates.entries()) {
      const expanded = new Set(pantrySet);
      expanded.add(chip);
      let unlocks = 0;
      for (const r of recipes) {
        const before = matchRecipe(r, pantrySet);
        const after = matchRecipe(r, expanded);
        const usesChip = requiredIngredients(r).some((i) => i.id === chip);
        if (!usesChip) continue;
        if (after.missingCount <= 1 && before.missingCount > 1) unlocks++;
        else if (after.exact && !before.exact && before.missingCount === 1) unlocks++;
      }
      if (unlocks > 0) scored.push({ id: chip, name, unlocks });
    }
    scored.sort((a, b) => b.unlocks - a.unlocks || a.name.localeCompare(b.name));
    return scored.slice(0, limit);
  }

  function groceryMissing(recipesOrMatches, pantryIds) {
    const pantrySet = new Set(pantryIds || []);
    const need = new Map();
    for (const item of recipesOrMatches) {
      const recipe = item.recipe || item;
      for (const ing of requiredIngredients(recipe)) {
        if (!pantrySet.has(ing.id)) {
          if (!need.has(ing.id)) need.set(ing.id, { id: ing.id, name: ing.name, recipes: [] });
          need.get(ing.id).recipes.push(recipe.name);
        }
      }
    }
    return [...need.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  global.WIBTMatch = {
    requiredIngredients,
    matchRecipe,
    findDinners,
    findClosest,
    suggestUnlocks,
    groceryMissing,
    selectedNonStaples,
    STAPLE_IDS,
    GARNISH_IDS,
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined') module.exports = globalThis.WIBTMatch;
