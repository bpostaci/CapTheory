/* ==========================================================
   Arayüz: senaryo rehberi, kontroller, teori, quiz, ana döngü
   ========================================================== */
const RUN = { sc: null, idx: 0, queue: [], auto: false, autoAt: 0, focus: [] };

/* ---------- günlük ---------- */
function logRow(e) {
  const d = document.createElement('div');
  d.className = 'le ' + e.cls;
  d.innerHTML = `<span class="lt">${e.t.toFixed(1)}s</span><span>${LANG === 'en' ? e.en : e.tr}</span>`;
  return d;
}
function onLog(e) {
  const box = $('log'); if (!box) return;
  box.prepend(logRow(e));
  while (box.children.length > 250) box.lastChild.remove();
}
function rebuildLog() {
  const box = $('log'); if (!box) return;
  const frag = document.createDocumentFragment();
  for (const e of S.logs.slice(-250).reverse()) frag.appendChild(logRow(e));
  box.innerHTML = ''; box.appendChild(frag);
}
function onReset() {
  $('log').innerHTML = ''; lastHash = '';
  buildClientPanel();
}

/* ---------- istemci paneli ---------- */
function buildClientPanel(keep) {
  $('clientPanel').innerHTML = S.clients.map(c => `
    <div class="cc" style="--cc:${c.color}">
      <div class="cc-h"><b>👤 ${clientName(c)}</b><label>${tx('bağlı düğüm', 'connected to')}
        <select data-cnode="${c.id}">${S.nodes.map(n => `<option value="${n.id}" ${n.id === c.node ? 'selected' : ''}>${n.id} · ${cityOf(n)}</option>`).join('')}</select></label></div>
      <div class="cc-r"><input type="number" id="val-${c.id}" value="${keep && keep[c.id] != null ? keep[c.id] : c.id === 'CA' ? 150 : 200}" step="10"><span class="unit">₺</span>
        <button class="btn sm blue" data-cw="${c.id}">${tx('✍ Yaz', '✍ Write')}</button><button class="btn sm purple" data-cr="${c.id}">${tx('👁 Oku', '👁 Read')}</button></div>
      <div class="cc-last" id="last-${c.id}">${tx('Son işlem: —', 'Last op: —')}</div>
    </div>`).join('');
}

/* ---------- senaryo çalıştırıcı ---------- */
const FREE = () => tx('SERBEST', 'FREE');
function busy() { return RUN.queue.length > 0 || !isIdle(); }
function renderScList() {
  $('scList').innerHTML = SCENARIOS.map(sc => `
    <div class="sc-item${RUN.sc && RUN.sc.id === sc.id ? ' active' : ''}" data-sc="${sc.id}">
      <span class="ic">${sc.icon}</span><div><b>${scF(sc, 'title')}</b><small>${scF(sc, 'sub')}</small></div><span class="mb ${sc.mode}">${sc.id === 'lab' ? FREE() : sc.mode}</span></div>`).join('');
}
function loadScenario(id) {
  const sc = SCENARIOS.find(s => s.id === id) || SCENARIOS[0];
  RUN.sc = sc; RUN.queue = []; RUN.auto = false;
  resetSim(sc.mode);
  renderScList();
  gotoStep(0);
}
function showStep(i) {
  const sc = RUN.sc, st = sc.steps[i], tip = stF(sc, i, 'tip');
  RUN.idx = i; RUN.focus = st.focus || [];
  $('gMode').className = 'mb ' + sc.mode; $('gMode').textContent = sc.id === 'lab' ? FREE() : sc.mode;
  $('gTitle').textContent = `${sc.icon} ${scF(sc, 'title')}`;
  $('gDots').innerHTML = sc.steps.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'cur' : ''}" data-dot="${k}" title="${tx('Adım', 'Step')} ${k + 1}"></i>`).join('');
  $('gStepTitle').textContent = `${i + 1}/${sc.steps.length} · ${stF(sc, i, 'title')}`;
  $('gText').innerHTML = stF(sc, i, 'text');
  $('gTip').style.display = tip ? 'block' : 'none'; $('gTip').innerHTML = tip || '';
}
function logStep(sc, i) {
  log('step', `▶ Adım ${i + 1}: ${stF(sc, i, 'title', 'tr')}`, `▶ Step ${i + 1}: ${stF(sc, i, 'title', 'en')}`);
}
function gotoStep(i) {
  const st = RUN.sc.steps[i];
  logStep(RUN.sc, i);
  RUN.queue = (st.actions || []).slice();
  RUN.autoAt = 0;
  showStep(i);
}
function replayTo(k) {
  const sc = RUN.sc; RUN.queue = [];
  resetSim(sc.mode);
  for (let i = 0; i <= k; i++) {
    logStep(sc, i);
    for (const fn of (sc.steps[i].actions || [])) { fn(); fastForward(); }
  }
  lastHash = ''; RUN.autoAt = 0;
  showStep(k);
}
function nextStep() { if (!RUN.sc || busy() || RUN.idx >= RUN.sc.steps.length - 1) return; gotoStep(RUN.idx + 1); }
function prevStep() { if (!RUN.sc || RUN.idx === 0) return; RUN.auto = false; replayTo(RUN.idx - 1); }
function pump() { if (RUN.queue.length && isIdle()) { const fn = RUN.queue.shift(); fn(); } }

function updateGuide(nowMs) {
  if (!RUN.sc) return;
  const last = RUN.idx >= RUN.sc.steps.length - 1, b = busy();
  $('gNext').disabled = b || last; $('gPrev').disabled = RUN.idx === 0;
  $('gNext').textContent = last ? tx('🏁 Bitti', '🏁 Done') : tx('İleri ▶', 'Next ▶');
  $('gAuto').classList.toggle('on', RUN.auto); $('gAuto').textContent = RUN.auto ? tx('⏸ Oto', '⏸ Auto') : tx('⏵ Oto', '⏵ Auto');
  let msg;
  if (PAUSED) msg = tx('⏸ Simülasyon duraklatıldı (Boşluk ile devam).', '⏸ Simulation paused (press Space to resume).');
  else if (b) msg = tx('⏳ Simülasyon çalışıyor… mesajları izleyin.', '⏳ Simulation running… watch the messages.');
  else if (last) msg = RUN.sc.id === 'lab' ? tx('🧪 Serbest mod: sağdaki panelden ve sahneden deneyin.', '🧪 Free mode: experiment with the right panel and the stage.')
    : tx('🏁 Senaryo bitti. Başka bir senaryo seçin.', '🏁 Scenario finished. Pick another one.');
  else msg = tx('✓ Hazır — “İleri ▶” ile devam edin.', '✓ Ready — continue with “Next ▶”.');
  if (RUN.auto && !b && !last && !PAUSED) {
    if (!RUN.autoAt) RUN.autoAt = nowMs + Math.min(9000, 2500 + stF(RUN.sc, RUN.idx, 'text').replace(/<[^>]+>/g, '').length * 25);
    const left = Math.max(0, (RUN.autoAt - nowMs) / 1000).toFixed(1);
    msg = tx(`⏵ Otomatik: ${left} sn sonra sonraki adım…`, `⏵ Auto: next step in ${left} s…`);
    if (nowMs >= RUN.autoAt) nextStep();
  }
  if (RUN.auto && last) RUN.auto = false;
  if ($('gStatus').textContent !== msg) $('gStatus').textContent = msg;
}

/* ---------- sekmeler ---------- */
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  if (name === 'sim') { lastHash = ''; }
  window.scrollTo({ top: 0 });
}
const simVisible = () => $('tab-sim').classList.contains('active');

/* ---------- teori üçgeni ---------- */
let TRI_SEL = null;
function showTri(k) {
  TRI_SEL = k;
  document.querySelectorAll('.tri-v,.tri-e').forEach(g => g.classList.toggle('sel', g.dataset.k === k));
  const i = triF(k);
  $('triInfo').innerHTML = `<h3 style="color:${i.col}">${i.t}</h3>${i.h}
    <div class="gnav"><button class="btn primary" data-open-sc="${i.sc}">${tx('▶ Simülasyonda izle', '▶ Watch in simulator')}</button></div>`;
}
function triIntro() {
  TRI_SEL = null;
  $('triInfo').innerHTML = tx(`<h3>Üçgeni keşfedin</h3>
    <p>Dağıtık bir veritabanı üç özellik ister: <b class="cC">C</b>, <b class="cA">A</b> ve <b class="cP">P</b>. Üçgenin her <b>kenarı</b> bir sistem tipini temsil eder: o kenarın iki ucundaki özellikleri garanti eder, karşı köşedekini feda eder.</p>
    <div class="ex">💡 Kritik nokta: <b>P</b> pratikte zorunludur (ağlar kopar). Bu yüzden gerçek seçim <b>CP</b> ile <b>AP</b> arasındadır.</div>
    <p class="muted">Soldaki üçgende bir köşeye veya kenara tıklayın.</p>`,
  `<h3>Explore the triangle</h3>
    <p>A distributed database wants three properties: <b class="cC">C</b>, <b class="cA">A</b> and <b class="cP">P</b>. Each <b>edge</b> of the triangle is a system type: it guarantees the two properties at its ends and sacrifices the opposite corner.</p>
    <div class="ex">💡 Key point: in practice <b>P</b> is mandatory (networks do fail). So the real choice is between <b>CP</b> and <b>AP</b>.</div>
    <p class="muted">Click a corner or an edge of the triangle on the left.</p>`);
}

/* ---------- quiz ---------- */
let QSCORE = 0, QDONE = 0, QANS = [];
function renderQuiz(keep) {
  if (!keep) QANS = [];
  QSCORE = 0; QDONE = 0; updateScore();
  $('quizBox').innerHTML = QUIZ.map((_, i) => {
    const q = quizF(i);
    return `
    <div class="panel qcard" data-q="${i}"><div class="qn">${tx('Soru', 'Question')} ${i + 1} / ${QUIZ.length}</div><h4>${q.q}</h4>
      <div class="opts">${q.o.map((o, j) => `<button class="opt" data-qa="${i}:${j}">${String.fromCharCode(65 + j)}) ${o}</button>`).join('')}</div>
      <div class="qexp" style="display:none"></div></div>`;
  }).join('');
  QANS.forEach((j, i) => { if (j != null) answer(i, j, true); });
}
function answer(i, j, replay) {
  const q = quizF(i), card = document.querySelector(`.qcard[data-q="${i}"]`);
  const btns = card.querySelectorAll('.opt'); if (btns[0].disabled) return;
  if (!replay) QANS[i] = j;
  btns.forEach((b, k) => { b.disabled = true; if (k === q.a) b.classList.add('right'); else if (k === j) b.classList.add('wrong'); });
  const ok = j === q.a; if (ok) QSCORE++; QDONE++;
  const ex = card.querySelector('.qexp'); ex.style.display = 'block';
  ex.innerHTML = `${ok ? tx('✅ <b>Doğru!</b>', '✅ <b>Correct!</b>') : tx('❌ <b>Yanlış.</b>', '❌ <b>Wrong.</b>')} ${q.e}
    <div class="gnav"><button class="btn sm" data-open-sc="${q.sc}">${tx('🧪 Simülasyonda gör ▶', '🧪 See it in the simulator ▶')}</button></div>`;
  updateScore();
}
function updateScore() {
  let t = `${tx('Puan', 'Score')}: ${QSCORE} / ${QUIZ.length}`;
  if (QDONE === QUIZ.length) t += QSCORE === QUIZ.length ? tx(' 🏆 Mükemmel!', ' 🏆 Perfect!') : QSCORE >= 6 ? tx(' 🎉 Çok iyi!', ' 🎉 Great job!') : tx(' 📘 Teoriye bir göz atın', ' 📘 Have another look at the theory');
  $('qScore').textContent = t; $('qBar').style.width = (QSCORE / QUIZ.length * 100) + '%';
}

/* ---------- dil değiştirme ---------- */
function setLang(l) {
  if (l !== 'tr' && l !== 'en') return;
  LANG = l;
  try { localStorage.setItem('capLang', l); } catch (e) { /* file:// */ }
  applyStaticLang();
  const keep = {}; for (const c of S.clients) { const v = $('val-' + c.id); if (v) keep[c.id] = v.value; }
  buildClientPanel(keep);
  renderScList();
  if (RUN.sc) showStep(RUN.idx);
  rebuildLog();
  lastHash = ''; renderStatic(true); renderMetrics(); renderChart();
  if (TRI_SEL) showTri(TRI_SEL); else triIntro();
  renderQuiz(true);
  updateClock();
}

/* ---------- olay bağlama ---------- */
function bind() {
  document.addEventListener('click', e => {
    const t = e.target;
    const open = t.closest('[data-open-sc]');
    if (open) { showTab('sim'); loadScenario(open.dataset.openSc); return; }
    const lg = t.closest('[data-lang]'); if (lg) { setLang(lg.dataset.lang); return; }
    const tab = t.closest('.tabs button'); if (tab) { showTab(tab.dataset.tab); return; }
    const sc = t.closest('[data-sc]'); if (sc) { loadScenario(sc.dataset.sc); return; }
    const dot = t.closest('[data-dot]');
    if (dot) { const k = +dot.dataset.dot; if (k < RUN.idx) { RUN.auto = false; replayTo(k); } else if (k === RUN.idx + 1) nextStep(); return; }
    const tri = t.closest('.tri-v,.tri-e'); if (tri) { showTri(tri.dataset.k); return; }
    const qa = t.closest('[data-qa]'); if (qa) { const [i, j] = qa.dataset.qa.split(':').map(Number); answer(i, j); return; }
    const md = t.closest('#modeSeg button'); if (md) { setMode(md.dataset.mode); return; }
    const iso = t.closest('[data-iso]'); if (iso) { isolate(iso.dataset.iso); return; }
    const cw = t.closest('[data-cw]'); if (cw) { clientWrite(cw.dataset.cw, $('val-' + cw.dataset.cw).value); return; }
    const cr = t.closest('[data-cr]'); if (cr) { clientRead(cr.dataset.cr); return; }
    const nd = t.closest('[data-node]'); if (nd) { toggleNode(nd.dataset.node); return; }
    const ln = t.closest('[data-link]'); if (ln) { toggleLink(...ln.dataset.link.split('|')); return; }
  });
  document.addEventListener('change', e => {
    const s = e.target.closest('select[data-cnode]'); if (s) attachClient(s.dataset.cnode, s.value);
  });
  $('gNext').onclick = nextStep; $('gPrev').onclick = prevStep;
  $('gAuto').onclick = () => { RUN.auto = !RUN.auto; RUN.autoAt = 0; };
  $('gRestart').onclick = () => RUN.sc && loadScenario(RUN.sc.id);
  $('btnHeal').onclick = () => healAll();
  $('btnPause').onclick = togglePause;
  $('btnReset').onclick = () => RUN.sc ? loadScenario(RUN.sc.id) : resetSim(S.mode);
  $('speed').oninput = e => { SPEED = +e.target.value; $('speedVal').textContent = SPEED + '×'; };
  $('qReset').onclick = () => renderQuiz();
  document.addEventListener('keydown', e => {
    if (!simVisible() || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight') { nextStep(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { prevStep(); e.preventDefault(); }
    else if (e.key === ' ') { togglePause(); e.preventDefault(); }
  });
}
function togglePause() { PAUSED = !PAUSED; $('btnPause').textContent = PAUSED ? '▶' : '⏸'; $('btnPause').classList.toggle('on', PAUSED); }

/* ---------- AP uyarı butonu + tooltip ---------- */
let warnHideT = 0;
function placeWarn() {
  const btn = $('apWarn'), tip = $('apWarnTip'), st = btn.closest('.stage').getBoundingClientRect(), b = btn.getBoundingClientRect();
  const top = b.bottom - st.top + 9, w = Math.min(660, st.width - 24), left = Math.max(12, Math.min(b.left - st.left, st.width - w - 12));
  tip.style.top = top + 'px';
  tip.style.left = left + 'px';
  tip.style.setProperty('--ax', Math.max(14, Math.min(w - 26, b.left + b.width / 2 - st.left - left - 6)) + 'px');
  $('apWarnIn').style.maxHeight = Math.max(160, st.height - top - 10) + 'px';
}
function openWarn() {
  clearTimeout(warnHideT);
  if ($('apWarn').hidden) return;
  placeWarn(); $('apWarnTip').classList.add('open'); $('apWarn').setAttribute('aria-expanded', 'true');
}
function closeWarn(force) {
  clearTimeout(warnHideT);
  const tip = $('apWarnTip');
  if (force) tip.classList.remove('pinned');
  if (tip.classList.contains('pinned')) return;
  tip.classList.remove('open'); $('apWarn').setAttribute('aria-expanded', 'false');
}
function bindWarn() {
  const btn = $('apWarn'), tip = $('apWarnTip'), later = () => { clearTimeout(warnHideT); warnHideT = setTimeout(() => closeWarn(), 220); };
  for (const el of [btn, tip]) { el.addEventListener('mouseenter', openWarn); el.addEventListener('mouseleave', later); }
  btn.addEventListener('focus', openWarn); btn.addEventListener('blur', later);
  btn.addEventListener('click', () => {
    const pin = !tip.classList.contains('pinned');
    tip.classList.toggle('pinned', pin); pin ? openWarn() : closeWarn(true);
  });
  document.addEventListener('click', e => { if (!e.target.closest('#apWarn,#apWarnTip')) closeWarn(true); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWarn(true); });
  window.addEventListener('resize', () => { if (tip.classList.contains('open')) placeWarn(); });
}

/* ---------- ana döngü ---------- */
let lastNow = performance.now(), lastMetrics = 0, lastChart = 0;
function updateClock() { $('clock').textContent = `t = ${S.t.toFixed(1)} ${SEC()} · ${SPEED}×${PAUSED ? ' · ⏸' : ''}`; }
function frame(now) {
  const dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
  if (!PAUSED) { let sim = dt * SPEED; while (sim > 1e-9) { const d = Math.min(0.02, sim); step(d); sim -= d; } }
  pump();
  if (simVisible()) {
    renderStatic(); renderMsgs(); renderOverlay(now);
    updateClock();
    if (now - lastMetrics > 150) { renderMetrics(); lastMetrics = now; }
    if (now - lastChart > 120) { renderChart(); lastChart = now; }
  }
  updateGuide(now);
  requestAnimationFrame(frame);
}

function init() {
  applyStaticLang();
  bind(); bindWarn(); triIntro(); renderQuiz();
  loadScenario('normal');
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get('sc')) {
    showTab('sim'); loadScenario(hp.get('sc'));
    const k = Math.min(+hp.get('step') || 0, RUN.sc.steps.length - 1); if (k > 0) replayTo(k);
  }
  else if (hp.has('sim')) showTab('sim');
  else if (hp.has('quiz')) showTab('quiz');
  requestAnimationFrame(frame);
}
init();
