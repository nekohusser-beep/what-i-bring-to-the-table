const CACHE = 'wibt-v12-2';
const ASSETS = [
  './',
  './index.html',
  './credits.html',
  './css/app.css',
  './data/pantry-chips.json',
  './data/recipes.json',
  './data/starter-pantry.json',
  './fonts/Nunito-Variable.ttf',
  './fonts/nunito-latin-400.woff2',
  './fonts/nunito-latin-600.woff2',
  './fonts/nunito-latin-700.woff2',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './images/avocado-cucumber-sandwich.webp',
  './images/avocado-egg-toast.webp',
  './images/avocado-toast.webp',
  './images/baked-potato-bar.webp',
  './images/banana-oat-bowl.webp',
  './images/bbq-chicken-sheet.webp',
  './images/bbq-pulled-chicken.webp',
  './images/bean-avocado-tostadas.webp',
  './images/bean-cheddar-tortilla-skillet.webp',
  './images/bean-cheese-enchiladas.webp',
  './images/bean-rice-bowls.webp',
  './images/beef-cabbage-skillet.webp',
  './images/beef-soft-tacos.webp',
  './images/beef-stew.webp',
  './images/beef-stroganoff.webp',
  './images/black-bean-burritos.webp',
  './images/blt-sandwich.webp',
  './images/breakfast-for-dinner.webp',
  './images/caprese-chicken.webp',
  './images/caprese-sandwich.webp',
  './images/cheeseburger-pasta.webp',
  './images/cheesy-quesadillas.webp',
  './images/chicken-fajitas.webp',
  './images/chicken-mayo-wrap.webp',
  './images/chicken-noodle-soup.webp',
  './images/chicken-parm-skillet.webp',
  './images/chicken-salad-sandwich.webp',
  './images/chicken-soy-veg-rice.webp',
  './images/chicken-tortilla-soup.webp',
  './images/chicken-veggie-stirfry.webp',
  './images/chickpea-curry.webp',
  './images/chili-mac.webp',
  './images/chopped-chickpea-salad.webp',
  './images/corn-chowder.webp',
  './images/cottage-pie.webp',
  './images/cream-cheese-cucumber-sandwich.webp',
  './images/creamy-potato-veg-soup.webp',
  './images/creamy-tomato-soup.webp',
  './images/cucumber-hummus-plate.webp',
  './images/cucumber-tomato-salad.webp',
  './images/egg-fried-rice.webp',
  './images/egg-mayo-rice-bowl.webp',
  './images/egg-salad-sandwich.webp',
  './images/garlic-butter-pasta.webp',
  './images/greek-cucumber-bowl.webp',
  './images/grilled-cheese.webp',
  './images/ham-cheese-sandwich.webp',
  './images/ham-egg-fried-rice.webp',
  './images/honey-garlic-salmon.webp',
  './images/honey-mustard-chicken.webp',
  './images/hummus-avocado-toast.webp',
  './images/hummus-veggie-wrap.webp',
  './images/lemon-chicken-potatoes.webp',
  './images/lemon-salmon-broccoli-rice.webp',
  './images/lentil-soup.webp',
  './images/mac-cheese-stovetop.webp',
  './images/mayo-potato-salad.webp',
  './images/mixed-veg-fried-rice.webp',
  './images/mozzarella-tomato-pasta.webp',
  './images/mushroom-rice.webp',
  './images/omelette-dinner.webp',
  './images/open-face-avocado-mayo.webp',
  './images/pancake-supper.webp',
  './images/pb-banana-sandwich.webp',
  './images/peanut-noodle-bowl.webp',
  './images/pizza-night.webp',
  './images/pork-chop-apples.webp',
  './images/quesadilla-simple.webp',
  './images/quinoa-veggie-bowl.webp',
  './images/ramen-upgrade.webp',
  './images/roti-ish-wraps.webp',
  './images/salmon-rice-bowl.webp',
  './images/sausage-pepper-pasta.webp',
  './images/sausage-white-beans.webp',
  './images/sesame-cucumber-chicken.webp',
  './images/sheet-pan-sausage-veg.webp',
  './images/shrimp-garlic-pasta.webp',
  './images/simple-scrambled-eggs.webp',
  './images/skillet-chicken-rice.webp',
  './images/sloppy-joes.webp',
  './images/spaghetti-meat-sauce.webp',
  './images/spinach-egg-bake.webp',
  './images/sweet-potato-black-bean.webp',
  './images/taco-night-beef.webp',
  './images/teriyaki-chicken-bowl.webp',
  './images/tofu-veggie-stirfry.webp',
  './images/tuna-avocado-bowl.webp',
  './images/tuna-mayo-sandwich.webp',
  './images/tuna-melt-skillet.webp',
  './images/tuna-pasta-warm.webp',
  './images/tuna-salad-sandwich.webp',
  './images/turkey-avocado-wrap.webp',
  './images/turkey-chili.webp',
  './images/turkey-club-wrap.webp',
  './images/turkey-meatballs.webp',
  './images/veggie-club-sandwich.webp',
  './images/veggie-lasagna.webp',
  './images/weeknight-spaghetti.webp',
  './images/white-bean-soup.webp',
  './images/yogurt-chicken.webp',
  './images/zucchini-boat-turkey.webp',
  './js/app.js',
  './js/match.js',
  './js/nutrition.js',
  './manifest.json',
  './privacy.html'
];
// Install: fetch every file straight from the origin (a throwaway query string skips any
// CDN/HTTP cache copy of the old version) and store it under its normal address.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => {
      const bust = u + (u.indexOf('?') === -1 ? '?' : '&') + 'sw=' + CACHE;
      return fetch(bust, { cache: 'reload' }).then((res) => {
        if (!res.ok) throw new Error('install fetch failed: ' + u);
        return c.put(u, res);
      });
    }))).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Read only from the current version's cache so an older cache can never answer.
  e.respondWith(
    caches.open(CACHE).then((c) => c.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }).catch(() => cached)))
  );
});
