/* ==========================================================
   Dil desteği / Language support (TR · EN)
   ========================================================== */
let LANG = (() => {
  const h = new URLSearchParams(location.hash.slice(1)).get('lang');
  if (h === 'tr' || h === 'en') return h;
  try { const s = localStorage.getItem('capLang'); if (s === 'tr' || s === 'en') return s; } catch (e) { /* file:// */ }
  return /^tr/i.test(navigator.language || 'tr') ? 'tr' : 'en';
})();

const tx = (tr, en) => (LANG === 'en' ? en : tr);
const bi = (tr, en) => ({ tr, en });
const tl = (o, lang = LANG) => (o && typeof o === 'object' && 'tr' in o ? (o[lang] != null ? o[lang] : o.tr) : o);
const SEC = () => tx('sn', 's');

/* content accessors: Turkish lives in content.js, English overlays in content.en.js */
function enScenario(sc) { return typeof SCENARIOS_EN !== 'undefined' ? SCENARIOS_EN[sc.id] : null; }
function scF(sc, f, lang = LANG) { const e = lang === 'en' && enScenario(sc); return (e && e[f]) || sc[f]; }
function stF(sc, i, f, lang = LANG) {
  const e = lang === 'en' && enScenario(sc), s = e && e.steps && e.steps[i];
  return (s && s[f]) || sc.steps[i][f];
}
function triF(k) { return LANG === 'en' && typeof TRI_INFO_EN !== 'undefined' ? { ...TRI_INFO[k], ...TRI_INFO_EN[k] } : TRI_INFO[k]; }
function quizF(i) { return LANG === 'en' && typeof QUIZ_EN !== 'undefined' ? { ...QUIZ[i], ...QUIZ_EN[i] } : QUIZ[i]; }

/* static markup: elements carry Turkish inline and English in data-en / data-en-title */
function applyStaticLang() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-en]').forEach(el => {
    if (el.dataset.tr == null) el.dataset.tr = el.innerHTML;
    el.innerHTML = LANG === 'en' ? el.dataset.en : el.dataset.tr;
  });
  document.querySelectorAll('[data-en-title]').forEach(el => {
    if (el.dataset.trTitle == null) el.dataset.trTitle = el.getAttribute('title') || '';
    el.setAttribute('title', LANG === 'en' ? el.dataset.enTitle : el.dataset.trTitle);
  });
  document.title = tx('CAP Teoremi — İnteraktif Eğitim Simülatörü', 'CAP Theorem — Interactive Learning Simulator');
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === LANG));
}
