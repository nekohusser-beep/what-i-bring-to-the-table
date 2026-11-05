(function () {
  const STORAGE_KEY = 'wibt-v7';
  const LEGACY_STORAGE_KEYS = ['wibt-v3', 'wibt-v1'];
  const ALLERGENS = ['milk','egg','peanut','tree-nut','wheat','soy','fish','shellfish','sesame'];
  // UI-only: kid favorites sticker (does not change recipe data / matching).
  const KID_FAVORITE_IDS = new Set([
    'mac-cheese-stovetop', 'taco-night-beef', 'beef-soft-tacos', 'pizza-night',
    'cheesy-quesadillas', 'pancake-supper', 'sloppy-joes', 'black-bean-burritos',
    'bean-cheese-enchiladas', 'chili-mac', 'baked-potato-bar', 'cheeseburger-pasta',
    'grilled-cheese', 'pb-banana-sandwich', 'blt-sandwich', 'tuna-salad-sandwich',
    'egg-salad-sandwich', 'ham-cheese-sandwich', 'avocado-toast', 'turkey-avocado-wrap',
    'quesadilla-simple', 'chicken-salad-sandwich', 'weeknight-spaghetti', 'chicken-mayo-wrap',
    'simple-scrambled-eggs', 'tuna-mayo-sandwich', 'chicken-soy-veg-rice'
  ]);
  const CHIP_EMOJI = {
    'chicken-breast':'🍗','chicken-thighs':'🍗','rotisserie-chicken':'🍗','ground-turkey':'🦃','ground-beef':'🥩',
    'pork-chops':'🥩','sausage':'🌭','bacon':'🥓','ham':'🥩','salmon':'🐟','tuna-canned':'🐟','shrimp':'🦐',
    'eggs':'🥚','milk':'🥛','butter':'🧈','cheddar':'🧀','mozzarella':'🧀','parmesan':'🧀','ricotta':'🧀','yogurt':'🥛',
    'rice':'🍚','pasta':'🍝','lasagna-noodles':'🍝','ramen-noodles':'🍜','bread':'🍞','tortillas':'🌮','pizza-dough':'🍕','flour':'🌾',
    'onion':'🧅','garlic':'🧄','potato':'🥔','potatoes':'🥔','sweet-potato':'🍠','carrot':'🥕','celery':'🥬','broccoli':'🥦',
    'bell-pepper':'🫑','spinach':'🥬','lettuce':'🥬','cabbage':'🥬','tomato':'🍅','cucumber':'🥒','zucchini':'🥒',
    'corn':'🌽','green-beans':'🫛','mushroom':'🍄','mushrooms':'🍄','avocado':'🥑','apple':'🍎','lime':'🍋','lemon':'🍋','ginger':'🫚',
    'black-beans':'🫘','pinto-beans':'🫘','chickpeas':'🫘','lentils':'🫘','tofu':'🧈',
    'frozen-peas':'🟢','green-onion':'🧅','basil':'🌿','oregano':'🌿','cilantro':'🌿',
    'salsa':'🫙','pasta-sauce':'🍅','bbq-sauce':'🫙','soy-sauce':'🫙','honey':'🍯','peanut-butter':'🥜','mayo':'🫙','hummus':'🧆','banana':'🍌','cream-cheese':'🧀','oats':'🥣','quinoa':'🥗','cream':'🥛','jalapeno':'🌶️','beans-canned':'🫘','frozen-mixed-veg':'🥦',
    'olive-oil':'🫒','vegetable-oil':'🫙','sesame-oil':'🫙','sesame-seeds':'🌱','mayonnaise':'🫙','mustard':'🟡',
    'chili-powder':'🌶️','cumin':'🌿','paprika':'🌶️','salt':'🧂','black-pepper':'🖤',
    'broth-chicken':'🥣','broth-beef':'🥣','canned-tomatoes':'🍅','coconut-milk':'🥥','cornstarch':'⚪',
    'almonds':'🌰','walnuts':'🌰','brown-sugar':'🟤','ketchup':'🍅','pickles':'🥒','coleslaw-mix':'🥬'
  };
  function chipEmoji(id) { return CHIP_EMOJI[id] || '🍽️'; }
  function prefersReducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (_) { return false; }
  }
  function celebratePick() {
    if (prefersReducedMotion()) { toast('You did it! Nice pick.'); return; }
    const layer = document.createElement('div');
    layer.className = 'confetti-burst';
    layer.setAttribute('aria-hidden', 'true');
    const colors = ['#c62828', '#f5c542', '#1f7a70', '#fff8e7', '#8e0000', '#ffd966'];
    for (let i = 0; i < 18; i++) {
      const bit = document.createElement('span');
      bit.className = 'confetti-piece';
      bit.style.left = (8 + Math.random() * 84) + 'vw';
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 120) + 'ms';
      bit.style.transform = 'rotate(' + (Math.random() * 90) + 'deg)';
      layer.appendChild(bit);
    }
    document.body.appendChild(layer);
    toast('You did it! Nice pick.');
    setTimeout(() => layer.remove(), 1000);
  }

  const state = {
    pantry: new Set(),
    favorites: new Set(),
    plan: [],
    groceryChecked: new Set(),
    avoid: new Set(),
    filters: { kidFriendly: false, leq30: false, vegetarian: false },
    recipes: [],
    chips: [],
    starter: [],
    lastMatches: [],
    closestMode: false,
    view: 'home',
    selected: null,
    search: '',
    wakeLock: null,
    firstRunDone: false,
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  let toastTimer = null;

  function readStorageObject(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }
  function loadState() {
    try {
      let raw = readStorageObject(STORAGE_KEY);
      let migratedFrom = null;
      if (!raw) {
        for (const key of LEGACY_STORAGE_KEYS) {
          const legacy = readStorageObject(key);
          if (legacy) { raw = legacy; migratedFrom = key; break; }
        }
      }
      raw = raw || {};
      (Array.isArray(raw.pantry) ? raw.pantry : []).forEach((id) => state.pantry.add(id));
      (Array.isArray(raw.favorites) ? raw.favorites : []).forEach((id) => state.favorites.add(id));
      state.plan = Array.isArray(raw.plan) ? raw.plan.filter((id) => typeof id === 'string') : [];
      (Array.isArray(raw.groceryChecked) ? raw.groceryChecked : []).forEach((id) => state.groceryChecked.add(id));
      (Array.isArray(raw.avoid) ? raw.avoid : []).forEach((id) => state.avoid.add(id));
      state.filters = Object.assign(state.filters, raw.filters && typeof raw.filters === 'object' ? raw.filters : {});
      state.firstRunDone = !!raw.firstRunDone;
      if (migratedFrom) {
        // Persist under the new key immediately so users keep pantry/favorites after upgrade.
        saveState();
      }
    } catch (_) {
      // ignore corrupt storage; keep empty defaults
    }
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        pantry: [...state.pantry],
        favorites: [...state.favorites],
        plan: state.plan,
        groceryChecked: [...state.groceryChecked],
        avoid: [...state.avoid],
        filters: state.filters,
        firstRunDone: state.firstRunDone,
      }));
      // Clear legacy keys after a successful write so state does not diverge.
      for (const key of LEGACY_STORAGE_KEYS) {
        try { localStorage.removeItem(key); } catch (_) {}
      }
    } catch (_) {
      toast('Could not save on this phone. You can keep cooking; changes may not stick.');
    }
  }

  async function boot() {
    loadState();
    let recipesPack, chips, starter;
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch('data/recipes.json'),
        fetch('data/pantry-chips.json'),
        fetch('data/starter-pantry.json'),
      ]);
      if (!r1.ok || !r2.ok || !r3.ok) throw new Error('fetch not ok');
      recipesPack = await r1.json();
      chips = await r2.json();
      starter = await r3.json();
    } catch (_) {
      const app = $('.app') || document.body;
      const msg = document.createElement('p');
      msg.className = 'empty';
      msg.setAttribute('role', 'alert');
      msg.textContent = 'Could not load recipes. Check your connection and reload.';
      app.prepend(msg);
      return;
    }
    state.recipes = recipesPack.recipes || [];
    state.chips = chips || [];
    state.starter = starter.items || [];
    // Do NOT auto-tick starter. User opts in via the button.
    // Legacy pantry/favorites already migrated in loadState (wibt-v3 / wibt-v1 → wibt-v7).
    try {
      if (!state.firstRunDone) {
        state.firstRunDone = true;
        saveState();
      }
    } catch (_) {}

    bind();
    try { history.replaceState({ screen: 'home' }, '', '#home'); } catch (_) {}
    navigate('home', { skipHistory: true });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  function bind() {
    $('#btn-dinner').addEventListener('click', onDinner);
    $('#btn-advanced').addEventListener('click', () => navigate('advanced'));
    $('#btn-back-home').addEventListener('click', () => navigate('home'));
    $('#btn-back-results').addEventListener('click', () => { releaseWake(); navigate('results'); });
    $('#btn-back-adv').addEventListener('click', () => navigate('home'));
    $('#chip-search').addEventListener('input', (e) => { state.search = e.target.value.trim().toLowerCase(); renderChips(); });
    $('#btn-starter').addEventListener('click', () => {
      state.starter.forEach((id) => state.pantry.add(id));
      saveState();
      renderHome();
      toast('Yum — pantry starter is ready!');
    });
    $('#btn-clear-pantry').addEventListener('click', () => {
      state.pantry.clear();
      saveState();
      renderHome();
    });
    $('#btn-fav-cook').addEventListener('click', toggleFavoriteSelected);
    $('#btn-add-plan').addEventListener('click', () => {
      if (!state.selected) return;
      if (state.plan.length >= 5) return toast('Weekly plan holds up to 5 dinners.');
      if (!state.plan.includes(state.selected.id)) state.plan.push(state.selected.id);
      saveState(); toast('Added to this week — nice!');
    });
    window.addEventListener('popstate', (e) => {
      const name = (e.state && e.state.screen) || 'home';
      navigate(name, { skipHistory: true });
    });
  }

  function hideToast() {
    const el = $('#toast');
    if (el) el.classList.remove('show');
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  }

  function navigate(name, opts) {
    opts = opts || {};
    hideToast();
    const prev = state.view;
    state.view = name;
    $$('.screen').forEach((s) => s.classList.toggle('active', s.dataset.screen === name));
    if (!opts.skipHistory) {
      try {
        const url = '#' + name;
        if (!history.state || history.state.screen !== name) {
          if (prev === name) history.replaceState({ screen: name }, '', url);
          else history.pushState({ screen: name }, '', url);
        } else {
          history.replaceState({ screen: name }, '', url);
        }
      } catch (_) {}
    }
    if (name === 'home') renderHome();
    else if (name === 'results') renderResults();
    else if (name === 'advanced') renderAdvanced();
    if (name !== 'cook') releaseWake();
  }

  function renderHome() {
    $('#pantry-count').textContent = state.pantry.size ? (state.pantry.size + ' picked') : 'Tap a few foods';
    renderChips();
    $('#btn-dinner').disabled = state.pantry.size === 0;
  }

  function renderChips() {
    const box = $('#chips');
    const q = state.search;
    const list = state.chips.filter((c) => !q || c.name.toLowerCase().includes(q) || c.id.includes(q));
    if (!list.length) {
      box.innerHTML = '<div class="empty"><span class="empty-emoji" aria-hidden="true">🔎</span><strong>No matches</strong>Try another spelling — or clear the search.</div>';
      return;
    }
    box.innerHTML = list.map((c) => {
      const on = state.pantry.has(c.id) ? 'on' : '';
      return `<button type="button" class="chip ${on}" data-id="${escapeHtml(c.id)}" aria-pressed="${!!on}"><span class="chip-emoji" aria-hidden="true">${chipEmoji(c.id)}</span>${escapeHtml(c.name)}</button>`;
    }).join('');
    $$('.chip', box).forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (state.pantry.has(id)) state.pantry.delete(id); else state.pantry.add(id);
      if (!prefersReducedMotion()) {
        btn.classList.remove('pop');
        void btn.offsetWidth;
        btn.classList.add('pop');
      }
      saveState(); renderHome();
    }));
  }

  function onDinner() {
    const baseOpts = {
      limit: 5,
      avoidAllergens: [...state.avoid],
      kidFriendly: state.filters.kidFriendly,
      leq30: state.filters.leq30,
      vegetarian: state.filters.vegetarian,
    };
    let matches = WIBTMatch.findDinners(state.recipes, [...state.pantry], {
      ...baseOpts,
      maxMissing: 1,
    });
    // If fewer than 3 close matches, widen to missing-3 so a small pantry still helps (C-059).
    // Overlap filter still applies — never random unrelated dinners.
    let closestMode = false;
    if (matches.length < 3) {
      const wider = WIBTMatch.findDinners(state.recipes, [...state.pantry], {
        ...baseOpts,
        maxMissing: 3,
        minHave: 1,
      });
      if (wider.length > matches.length) matches = wider;
    }
    if (!matches.length) {
      matches = WIBTMatch.findClosest(state.recipes, [...state.pantry], baseOpts);
      closestMode = matches.length > 0;
    }
    state.lastMatches = matches;
    state.closestMode = closestMode;
    navigate('results');
    if (!matches.length) toast('Almost! Add a couple more ingredients and try again.');
  }

  function containsLine(recipe) {
    if (!recipe) return '';
    const hard = recipe.allergens || [];
    const poss = recipe.possibleAllergens || [];
    const optionalNutGarnish = (recipe.ingredients || []).some((ing) => ing.optional && (ing.id === 'almonds' || ing.id === 'walnuts'));
    const labels = hard.map((a) => {
      if (a === 'tree-nut' && optionalNutGarnish) return 'tree-nut (optional garnish)';
      return a;
    });
    const possLabels = poss.map((a) => a + ' (possible — nice to have)');
    if (!labels.length && !possLabels.length) return '';
    const bits = [];
    if (labels.length) bits.push(`<strong>Contains:</strong> ${escapeHtml(labels.join(', '))}`);
    if (possLabels.length) bits.push(`<strong>Possible:</strong> ${escapeHtml(possLabels.join(', '))}`);
    return `<div class="contains">${bits.join(' · ')}</div>`;
  }

  function avoidConflict(recipe) {
    if (!recipe || !state.avoid.size) return false;
    const all = [...(recipe.allergens || []), ...(recipe.possibleAllergens || [])];
    return all.some((a) => state.avoid.has(a));
  }

  function renderResults() {
    const box = $('#results-cards');
    if (!state.lastMatches.length) {
      box.innerHTML = '<div class="empty"><span class="empty-emoji" aria-hidden="true">🥗</span><strong>No dinners yet</strong>Nothing here uses the foods you picked. Try adding bread, eggs, cheese, tortillas, chicken, or rice — or tap Start with a basic pantry.</div>';
      return;
    }
    let banner = '';
    if (state.closestMode) {
      const addSet = new Map();
      state.lastMatches.forEach((m) => {
        (m.missing || []).forEach((ing) => {
          if (!addSet.has(ing.id)) addSet.set(ing.id, ing.name);
        });
      });
      const adds = [...addSet.values()].slice(0, 6);
      const addLine = adds.length
        ? ' Add ' + adds.join(', ') + ' to get closer.'
        : '';
      banner = '<div class="closest-banner" role="status"><strong>Here\'s the closest we\'ve got</strong><span>These use some of what you picked, but you\'re missing a few things.' + escapeHtml(addLine) + '</span></div>';
    }
    const exactCount = state.lastMatches.filter((m) => m.exact).length;
    let unlockBanner = '';
    if (exactCount < 3 && WIBTMatch.suggestUnlocks) {
      const tips = WIBTMatch.suggestUnlocks(state.recipes, [...state.pantry], { limit: 3 });
      if (tips.length) {
        unlockBanner = '<div class="unlock-banner" role="status"><strong>Add a little more</strong>' +
          tips.map((t) => `<button type="button" class="unlock-chip" data-id="${escapeHtml(t.id)}">Add ${escapeHtml(t.name)} to unlock ${t.unlocks} more dinner${t.unlocks===1?'':'s'}</button>`).join('') +
          '</div>';
      }
    }
    box.innerHTML = banner + unlockBanner + state.lastMatches.map((m) => {
      let badge;
      if (m.exact) badge = '<span class="badge exact">You have everything</span>';
      else if (m.missingCount === 1) badge = `<span class="badge missing">Missing 1: ${escapeHtml(m.missing[0].name)}</span>`;
      else badge = `<span class="badge missing">Missing ${m.missingCount}: ${escapeHtml(m.missing.map((x) => x.name).join(', '))}</span>`;
      const ready = `<span class="badge ready">Ready in ${m.recipe.cookMinutes} min</span>`;
      const kid = KID_FAVORITE_IDS.has(m.recipe.id) ? '<span class="kid-sticker">Kid Favorite</span>' : '';
      const warn = avoidConflict(m.recipe) ? '<div class="warn">Conflicts with your avoid list.</div>' : '';
      const photo = m.recipe.photo
        ? `<img class="card-photo" src="${escapeHtml(m.recipe.photo)}" alt="${escapeHtml(m.recipe.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="card-emoji-fallback" style="display:none;background:${escapeHtml(m.recipe.color)}">${m.recipe.emoji || ''}</div>`
        : `<div class="card-emoji-fallback" style="display:flex;background:${escapeHtml(m.recipe.color)}">${m.recipe.emoji || ''}</div>`;
      return `<button type="button" class="card" data-id="${escapeHtml(m.recipe.id)}">
        ${kid}
        <div class="card-media">${photo}</div>
        <div class="card-body">
          <h2>${escapeHtml(m.recipe.name)}</h2>
          <div class="meta">${ready}${badge}</div>
          ${containsLine(m.recipe)}
          ${warn}
        </div>
      </button>`;
    }).join('');
    $$('.card', box).forEach((card) => card.addEventListener('click', () => {
      celebratePick();
      openCook(card.dataset.id);
    }));
    $$('.unlock-chip', box).forEach((btn) => btn.addEventListener('click', () => {
      state.pantry.add(btn.dataset.id);
      saveState();
      onDinner();
    }));
  }

  function openCook(id) {
    const recipe = state.recipes.find((r) => r.id === id);
    if (!recipe) return;
    state.selected = recipe;
    navigate('cook');
    requestWake();
    const match = WIBTMatch.matchRecipe(recipe, state.pantry);
    const missingIds = new Set(match.missing.map((m) => m.id));
    const hero = $('#cook-hero');
    if (hero) {
      hero.hidden = false;
      if (recipe.photo) {
        hero.innerHTML = '';
        const img = document.createElement('img');
        img.src = recipe.photo;
        img.alt = recipe.name || '';
        img.addEventListener('error', () => {
          hero.innerHTML = `<div class="cook-hero-fallback" style="background:${escapeHtml(recipe.color || '#c4784a')}">${recipe.emoji || ''}</div>`;
        });
        hero.appendChild(img);
      } else {
        hero.innerHTML = `<div class="cook-hero-fallback" style="background:${escapeHtml(recipe.color || '#c4784a')}">${recipe.emoji || ''}</div>`;
      }
    }
    $('#cook-title').textContent = recipe.name;
    $('#cook-meta').innerHTML = `<span class="badge ready">Ready in ${recipe.cookMinutes} min</span><span class="badge exact">Serves ${recipe.servings}</span>${KID_FAVORITE_IDS.has(recipe.id) ? '<span class="badge kid">Kid Favorite</span>' : ''}`;
    const containsEl = $('#cook-contains');
    if (containsEl) {
      containsEl.innerHTML = containsLine(recipe) + (avoidConflict(recipe) ? '<div class="warn">Conflicts with your avoid list.</div>' : '');
    }
    const tempEl = $('#cook-temp');
    if (tempEl) {
      const temps = recipe.safeTemp || [];
      tempEl.innerHTML = temps.length ? `<div class="temp-note">${temps.map((t) => escapeHtml(t)).join('<br>')}</div>` : '';
    }
    const needList = recipe.ingredients.filter((ing) => !ing.optional);
    const niceList = recipe.ingredients.filter((ing) => ing.optional);
    const li = (ing) => {
      const cls = missingIds.has(ing.id) ? 'need' : (ing.staple || state.pantry.has(ing.id) ? 'have' : 'need');
      const label = missingIds.has(ing.id) ? ' (need)' : '';
      const qty = [ing.quantity, ing.unit].filter(Boolean).join(' ');
      return `<li class="${cls}">${escapeHtml(qty)} ${escapeHtml(ing.name)}${label}</li>`;
    };
    let ingsHtml = needList.map(li).join('');
    if (niceList.length) {
      ingsHtml += `<li class="nice-to-have"><details open><summary>Nice to have</summary><ul>${niceList.map(li).join('')}</ul></details></li>`;
    }
    $('#cook-ings').innerHTML = ingsHtml;
    $('#cook-steps').innerHTML = recipe.steps.map((s, idx) => `<li data-step="${idx}"><span class="step-text">${escapeHtml(s)}</span></li>`).join('');
    $$('#cook-steps li').forEach((li) => li.addEventListener('click', () => {
      li.classList.toggle('done');
      const mark = li.querySelector('.step-sticker');
      if (li.classList.contains('done')) {
        if (!mark) {
          const star = document.createElement('span');
          star.className = 'step-sticker';
          star.textContent = 'Sticker!';
          li.appendChild(star);
        }
        if ([...$$('#cook-steps li')].every((x) => x.classList.contains('done'))) {
          toast('You did it! Dinner hero.');
        }
      } else if (mark) {
        mark.remove();
      }
    }));
    $('#btn-fav-cook').textContent = state.favorites.has(recipe.id) ? '♥ Saved' : '♡ Save';
  }

  function toggleFavoriteSelected() {
    if (!state.selected) return;
    const id = state.selected.id;
    if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
    saveState();
    $('#btn-fav-cook').textContent = state.favorites.has(id) ? '♥ Saved' : '♡ Save';
  }

  function renderAdvanced() {
    const box = $('#advanced');
    const selected = state.selected || (state.lastMatches[0] && state.lastMatches[0].recipe) || state.recipes[0];
    const nut = selected && selected.nutrition;
    const fmt = WIBTNutrition.formatNutrition(nut);

    const filterHtml = `
      <div class="panel">
        <h3>Filters</h3>
        <div class="filters">
          ${toggleBtn('filter-kid', 'Kid-friendly', state.filters.kidFriendly)}
          ${toggleBtn('filter-30', 'Under 30 min', state.filters.leq30)}
          ${toggleBtn('filter-veg', 'Vegetarian', state.filters.vegetarian)}
        </div>
        <h3 style="margin-top:14px">Avoid allergens</h3>
        <p class="disclaimer">We hide recipes that list these ingredients. This is not medical advice and never means a dish is free of allergens.</p>
        <div class="filters" id="allergen-filters">
          ${ALLERGENS.map((a) => toggleBtn('alg-'+a, a, state.avoid.has(a))).join('')}
        </div>
      </div>`;

    const nutriHtml = `
      <div class="panel">
        <h3>Nutrition (estimates)</h3>
        <p style="margin:0 0 8px;color:var(--muted);font-size:0.9rem">${escapeHtml(selected ? selected.name : '')} · per serving</p>
        <div class="nutri-grid">
          ${fmt ? `
            <div class="nutri-item"><span>Calories</span><strong>${fmt.calories}</strong></div>
            <div class="nutri-item"><span>Protein</span><strong>${fmt.protein}</strong></div>
            <div class="nutri-item"><span>Carbs</span><strong>${fmt.carbs}</strong></div>
            <div class="nutri-item"><span>Fat</span><strong>${fmt.fat}</strong></div>
            <div class="nutri-item"><span>Fiber</span><strong>${fmt.fiber}</strong></div>
            <div class="nutri-item"><span>Sugar</span><strong>${fmt.sugar}</strong></div>
            <div class="nutri-item"><span>Sodium</span><strong>${fmt.sodium}</strong></div>
          ` : '<p class="empty">Open a recipe first for nutrition.</p>'}
        </div>
        <p class="disclaimer">Estimates based on USDA FoodData Central. Not medical advice. Actual values vary by brand and prep. Allergy tags are ingredient heuristics, not lab tests. Cross-contact possible. Source credit: USDA FDC${selected && selected.fdcIds && selected.fdcIds.length ? ' (FDC IDs: ' + selected.fdcIds.slice(0,8).join(', ') + ')' : ''}.</p>
        ${selected ? containsLine(selected) : ''}
      </div>`;

    const planRecipes = state.plan.map((id) => state.recipes.find((r) => r.id === id)).filter(Boolean);
    const groceryAll = WIBTMatch.groceryMissing(planRecipes.length ? planRecipes : state.lastMatches, [...state.pantry]);

    const planHtml = `
      <div class="panel">
        <h3>Weekly plan (up to 5)</h3>
        <ul class="plan-list">
          ${planRecipes.length ? planRecipes.map((r) => {
            const warn = avoidConflict(r) ? ' <span class="warn">Avoid conflict</span>' : '';
            return `<li><span>${escapeHtml(r.name)}${warn}<br>${containsLine(r)}</span><button type="button" class="toggle" data-rm="${escapeHtml(r.id)}">Remove</button></li>`;
          }).join('') : '<li class="empty">Add dinners from Cook mode.</li>'}
        </ul>
      </div>`;

    const groceryHtml = `
      <div class="panel">
        <h3>Grocery list (missing only)</h3>
        <ul class="grocery-list" id="grocery-list">
          ${groceryAll.length ? groceryAll.map((g) => {
            const checked = state.groceryChecked.has(g.id);
            return `<li class="${checked ? 'checked' : ''}"><label><input type="checkbox" data-g="${escapeHtml(g.id)}" ${checked ? 'checked' : ''}> <span class="${checked ? 'strike' : ''}">${escapeHtml(g.name)}</span></label>
              <span style="color:var(--muted);font-size:0.8rem">${escapeHtml(g.recipes.slice(0,2).join(', '))}</span>
              ${checked ? `<button type="button" class="toggle" data-add-pantry="${escapeHtml(g.id)}">Add to pantry</button>` : ''}
            </li>`;
          }).join('') : '<li class="empty">Nothing missing for your plan or last matches.</li>'}
        </ul>
        <button type="button" class="cta" id="btn-share-grocery" style="margin-top:10px">Share list</button>
      </div>`;

    const favHtml = `
      <div class="panel">
        <h3>Favorites</h3>
        <ul class="plan-list">
          ${[...state.favorites].length ? [...state.favorites].map((id) => {
            const r = state.recipes.find((x) => x.id === id);
            if (!r) return '';
            const warn = avoidConflict(r) ? '<div class="warn">Conflicts with your avoid list.</div>' : '';
            return `<li><button type="button" class="secondary" style="text-align:left;margin:0;padding:0" data-open="${escapeHtml(r.id)}">${escapeHtml(r.name)}</button>${containsLine(r)}${warn}</li>`;
          }).join('') : '<li class="empty">Heart a recipe while cooking to save it here.</li>'}
        </ul>
      </div>`;

    const dataHtml = `
      <div class="panel">
        <h3>Your data (stays on this phone)</h3>
        <button type="button" class="cta" id="btn-export">Export JSON</button>
        <button type="button" class="secondary" id="btn-import">Import JSON</button>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
        <p class="disclaimer">Privacy: pantry, favorites, and plans are stored only in this browser. Nothing is sent to a server.</p>
      </div>`;

    box.innerHTML = filterHtml + nutriHtml + planHtml + groceryHtml + favHtml + dataHtml;

    $('#filter-kid').addEventListener('click', () => { state.filters.kidFriendly = !state.filters.kidFriendly; saveState(); renderAdvanced(); });
    $('#filter-30').addEventListener('click', () => { state.filters.leq30 = !state.filters.leq30; saveState(); renderAdvanced(); });
    $('#filter-veg').addEventListener('click', () => { state.filters.vegetarian = !state.filters.vegetarian; saveState(); renderAdvanced(); });
    ALLERGENS.forEach((a) => {
      const el = document.getElementById('alg-' + a);
      if (!el) return;
      el.addEventListener('click', () => {
        if (state.avoid.has(a)) state.avoid.delete(a); else state.avoid.add(a);
        saveState(); renderAdvanced();
      });
    });
    $$('[data-rm]', box).forEach((btn) => btn.addEventListener('click', () => {
      state.plan = state.plan.filter((id) => id !== btn.dataset.rm);
      saveState(); renderAdvanced();
    }));
    $$('[data-g]', box).forEach((cb) => cb.addEventListener('change', () => {
      if (cb.checked) state.groceryChecked.add(cb.dataset.g); else state.groceryChecked.delete(cb.dataset.g);
      saveState(); renderAdvanced();
    }));
    $$('[data-add-pantry]', box).forEach((btn) => btn.addEventListener('click', () => {
      state.pantry.add(btn.dataset.addPantry);
      state.groceryChecked.delete(btn.dataset.addPantry);
      saveState(); renderAdvanced(); toast('Added to pantry.');
    }));
    $$('[data-open]', box).forEach((btn) => btn.addEventListener('click', () => openCook(btn.dataset.open)));
    $('#btn-share-grocery').addEventListener('click', shareGrocery);
    $('#btn-export').addEventListener('click', exportData);
    $('#btn-import').addEventListener('click', () => $('#import-file').click());
    $('#import-file').addEventListener('change', importData);
  }

  function toggleBtn(id, label, on) {
    return `<button type="button" class="toggle ${on ? 'on' : ''}" id="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
  }

  async function shareGrocery() {
    const planRecipes = state.plan.map((id) => state.recipes.find((r) => r.id === id)).filter(Boolean);
    const grocery = WIBTMatch.groceryMissing(planRecipes.length ? planRecipes : state.lastMatches, [...state.pantry])
      .filter((g) => !state.groceryChecked.has(g.id));
    const text = 'Grocery (missing only) — What I Bring to the Table\n' + grocery.map((g) => '• ' + g.name).join('\n');
    try {
      if (navigator.share) await navigator.share({ title: 'Grocery list', text });
      else {
        await navigator.clipboard.writeText(text);
        toast('List copied.');
      }
    } catch (err) {
      if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) return;
      try { await navigator.clipboard.writeText(text); toast('List copied.'); } catch (e) { toast('Could not share.'); }
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({
      pantry: [...state.pantry], favorites: [...state.favorites], plan: state.plan,
      groceryChecked: [...state.groceryChecked], avoid: [...state.avoid], filters: state.filters,
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'what-i-bring-data.json';
    a.click();
  }

  function importData(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result);
        const known = new Set(state.chips.map((c) => c.id).concat(state.recipes.map((r) => r.id)));
        const cleanIds = (arr) => (Array.isArray(arr) ? arr : []).filter((id) => typeof id === 'string' && known.has(id));
        state.pantry = new Set(cleanIds(raw.pantry));
        state.favorites = new Set(cleanIds(raw.favorites));
        state.plan = cleanIds(raw.plan).slice(0, 5);
        state.groceryChecked = new Set(cleanIds(raw.groceryChecked));
        state.avoid = new Set((Array.isArray(raw.avoid) ? raw.avoid : []).filter((a) => ALLERGENS.includes(a)));
        if (raw.filters && typeof raw.filters === 'object') {
          state.filters = Object.assign(state.filters, {
            kidFriendly: !!raw.filters.kidFriendly,
            leq30: !!raw.filters.leq30,
            vegetarian: !!raw.filters.vegetarian,
          });
        }
        saveState(); toast('Imported.'); renderAdvanced();
      } catch (_) { toast('Import failed. File was not valid JSON.'); }
    };
    reader.readAsText(file);
  }

  async function requestWake() {
    try {
      if ('wakeLock' in navigator) state.wakeLock = await navigator.wakeLock.request('screen');
    } catch (_) {}
  }
  function releaseWake() {
    if (state.wakeLock) { state.wakeLock.release().catch(() => {}); state.wakeLock = null; }
  }

  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      toastTimer = null;
    }, 1800);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
