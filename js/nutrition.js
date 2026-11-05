(function (global) {
  function formatNutrition(n) {
    if (!n) return null;
    return {
      calories: Math.round(n.cal),
      protein: round1(n.protein) + ' g',
      carbs: round1(n.carbs) + ' g',
      fat: round1(n.fat) + ' g',
      fiber: round1(n.fiber) + ' g',
      sugar: round1(n.sugar) + ' g',
      sodium: Math.round(n.sodium) + ' mg',
    };
  }
  function round1(x) { return Math.round((x || 0) * 10) / 10; }
  function neverAllergenFree(text) {
    return !/allergen[\s-]*free/i.test(text || '');
  }
  global.WIBTNutrition = { formatNutrition, neverAllergenFree, round1 };
})(typeof window !== 'undefined' ? window : globalThis);
if (typeof module !== 'undefined') module.exports = globalThis.WIBTNutrition;
