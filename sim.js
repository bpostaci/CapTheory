/* ==========================================================
   CAP Laboratuvarı — sahte (mock) ama çalışan dağıtık veritabanı motoru
   Zaman birimi: simülasyon saniyesi
   ========================================================== */
const KEY = 'bakiye';
const HOP_NODE = 1.0, HOP_CLIENT = 0.8;
const QUORUM_TIMEOUT = 2.6, CLIENT_TIMEOUT = 8, PENDING_TTL = 6;
const NODE_DEFS = [
  { id: 'N1', city: 'İstanbul', cityEn: 'Istanbul', x: 300, y: 190 },
  { id: 'N2', city: 'New York', cityEn: 'New York', x: 700, y: 190 },
  { id: 'N3', city: 'Londra',   cityEn: 'London',   x: 500, y: 470 }
];
const CLIENT_DEFS = [
  { id: 'CA', name: 'İstemci A', nameEn: 'Client A', node: 'N1', color: '#5aa9ff' },
  { id: 'CB', name: 'İstemci B', nameEn: 'Client B', node: 'N3', color: '#ffb347' }
];
const MT = {
  W_REQ: { l: 'YAZ', e: 'WRITE', c: '#4f8cff' }, R_REQ: { l: 'OKU', e: 'READ', c: '#a970ff' }, RESP: { l: 'CEVAP', e: 'REPLY', c: '#22c55e' },
  PREP: { l: 'HAZIRLA', e: 'PREPARE', c: '#ff9f43' }, PREP_ACK: { l: 'ONAY', e: 'ACK', c: '#22c55e' }, COMMIT: { l: 'KESİNLEŞTİR', e: 'COMMIT', c: '#14b8a6' },
  ABORT: { l: 'İPTAL', e: 'ABORT', c: '#ff5d6c' }, RQ: { l: 'SORGU', e: 'QUERY', c: '#c084fc' }, RQ_R: { l: 'CEVAP', e: 'REPLY', c: '#c084fc' },
  REPL: { l: 'REPLİKA', e: 'REPLICA', c: '#facc15' }, SYNC: { l: 'SENKRON', e: 'SYNC', c: '#38bdf8' }
};
const mtl = type => tx(MT[type].l, MT[type].e);
const MODE_INFO = {
  CP: { color: '#4f8cff', name: bi('CP — Tutarlılık öncelikli', 'CP — Consistency first'),
    rule: bi('Yazma/okuma için <b>çoğunluk (2/3)</b> gerekir. Çoğunluğa ulaşamayan düğüm <b>hata döner</b>.',
      'Reads and writes need a <b>majority (2/3)</b>. A node that cannot reach a majority <b>returns an error</b>.') },
  AP: { color: '#22c55e', name: bi('AP — Erişilebilirlik öncelikli', 'AP — Availability first'),
    rule: bi('Her düğüm <b>yerelde</b> yazar/okur ve hemen cevap verir; kopyalama arka planda yapılır.',
      'Every node reads/writes <b>locally</b> and answers at once; replication happens in the background.') },
  CA: { color: '#f5b041', name: bi('CA — Bölünme yok varsayımı', 'CA — Assumes no partitions'),
    rule: bi('Yazma için <b>tüm düğümler (3/3)</b> onaylamalı; okuma yerelden. Bölünmeye dayanıksız.',
      'A write needs <b>all nodes (3/3)</b> to ack; reads are local. Not partition tolerant.') }
};
const keyName = () => tx('bakiye', 'balance');
const originName = (o, lang = LANG) => (o === 'init' ? (lang === 'en' ? 'initial' : 'başlangıç') : o);
const TIMEOUT_ERR = bi('Zaman aşımı — yanıt yok', 'Timeout — no response');

let S = null, SPEED = 1, PAUSED = false;

function newState(mode) {
  const s = {
    t: 0, mode,
    nodes: NODE_DEFS.map(d => ({ ...d, up: true, store: { [KEY]: 'w0' }, pending: {}, outbox: [], flashT: -9, waits: {} })),
    clients: CLIENT_DEFS.map(c => ({ ...c, bubble: null, last: null })),
    cuts: new Set(), msgs: [], timers: [], ops: {}, mseq: 0, wseq: 0, oseq: 0,
    writes: { w0: { id: 'w0', key: KEY, value: 100, ts: 0, origin: 'init', basedOn: null, acked: true, lost: false } },
    latest: { [KEY]: 'w0' }, bursts: [], reachMap: {}, samples: [], events: [], modeMarks: [{ t: 0, mode }],
    lastSample: -1, conflictPairs: new Set(), logs: [],
    stats: { req: 0, ok: 0, fail: 0, reads: 0, fresh: 0, stale: 0, lost: 0, conflicts: 0, wLat: 0, wN: 0, rLat: 0, rN: 0 }
  };
  return s;
}

/* ---------- yardımcılar ---------- */
const isNode = id => id && id[0] === 'N';
const node = id => S.nodes.find(n => n.id === id);
const client = id => S.clients.find(c => c.id === id);
const lk = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
const W = id => S.writes[id];
const majority = () => Math.floor(S.nodes.length / 2) + 1;
const peersOf = id => S.nodes.filter(n => n.id !== id).map(n => n.id);
const needFor = mode => (mode === 'CA' ? S.nodes.length : majority());
const fmt = v => `${v} ₺`;
function reach(a, b) { const A = node(a), B = node(b); return A.up && B.up && !S.cuts.has(lk(a, b)); }
function reachCount(id) { return S.nodes.filter(m => m.id !== id && reach(id, m.id)).length; }
function nodeVal(id) { return W(node(id).store[KEY]); }
function computeReach() { const m = {}; for (const a of S.nodes) for (const b of S.nodes) if (a.id < b.id) m[lk(a.id, b.id)] = reach(a.id, b.id); return m; }
const clientName = c => (LANG === 'en' ? c.nameEn : c.name);
const cityOf = (n, lang = LANG) => (lang === 'en' ? n.cityEn : n.city);
function nameOf(id, lang = LANG) { if (isNode(id)) return `${id} (${cityOf(node(id), lang)})`; const c = client(id); return lang === 'en' ? c.nameEn : c.name; }
const DAT = { N1: "'e", N2: "'ye", N3: "'e" };
const toN = id => id + (DAT[id] || "'e");

/* every log entry is stored in both languages so the UI can switch at any time */
function log(cls, tr, en) {
  const e = { t: S.t, cls, tr, en: en == null ? tr : en };
  S.logs.push(e); if (S.logs.length > 400) S.logs.shift();
  if (typeof onLog === 'function') onLog(e);
}

/* ---------- zamanlayıcılar ---------- */
function addTimer(d, fn, bg = false, owner = null) { const t = { at: S.t + d, fn, bg, owner, done: false }; S.timers.push(t); return t; }
function cancelTimer(t) { if (t) t.done = true; }
function later(d, fn) { return addTimer(d, fn, false, null); }

/* ---------- mesajlar ---------- */
function send(from, to, type, data, dur) {
  if (dur == null) dur = (isNode(from) && isNode(to)) ? HOP_NODE : HOP_CLIENT;
  const m = { id: ++S.mseq, from, to, type, data: data || {}, t0: S.t, dur, mid: false, gone: false };
  S.msgs.push(m);
  return m;
}

function step(dt) {
  S.t += dt;
  for (const m of S.msgs) {
    if (m.gone) continue;
    const p = (S.t - m.t0) / m.dur;
    if (!m.mid && p >= 0.5) {
      m.mid = true;
      if (isNode(m.from) && isNode(m.to) && S.cuts.has(lk(m.from, m.to))) { drop(m, 'cut'); continue; }
    }
    if (p >= 1) {
      m.gone = true;
      if (isNode(m.to) && !node(m.to).up) { drop(m, 'down'); continue; }
      deliver(m);
    }
  }
  S.msgs = S.msgs.filter(m => !m.gone);
  S.timers.sort((a, b) => a.at - b.at);
  for (const tm of S.timers.slice()) { if (!tm.done && tm.at <= S.t) { tm.done = true; tm.fn(); } }
  S.timers = S.timers.filter(t => !t.done);
  S.bursts = S.bursts.filter(b => S.t - b.t < 1.2);
  sample();
}

function isIdle() {
  return S.msgs.length === 0 && !S.timers.some(t => !t.done && !t.bg) && !Object.values(S.ops).some(o => !o.done);
}
function fastForward() { let i = 0; while (!isIdle() && i++ < 20000) step(0.02); }

function drop(m, reason) {
  m.gone = true;
  S.bursts.push({ from: m.from, to: m.to, frac: reason === 'cut' ? 0.5 : 1, t: S.t });
  const why = reason === 'cut' ? 'bağlantı kopuk' : 'hedef düğüm çökmüş';
  const whyEn = reason === 'cut' ? 'link is cut' : 'target node is down';
  if (m.type === 'REPL' && node(m.from).up) {
    addOutbox(m.from, m.to, m.data.wid);
    const v = fmt(W(m.data.wid).value);
    log('drop', `📮 ${m.from}: ${toN(m.to)} giden REPLİKA (${v}) ulaşamadı (${why}) → <b>kuyruğa alındı</b>, bağlantı gelince teslim edilecek.`,
      `📮 ${m.from}: REPLICA (${v}) for ${m.to} could not be delivered (${whyEn}) → <b>queued</b>, will be delivered when the link is back.`);
  } else {
    log('drop', `✕ ${MT[m.type].l} mesajı ${m.from} → ${m.to} kayboldu (${why}).`,
      `✕ ${MT[m.type].e} message ${m.from} → ${m.to} was lost (${whyEn}).`);
  }
}

function addOutbox(from, to, wid) {
  const n = node(from), w = W(wid);
  const ex = n.outbox.find(e => e.to === to && W(e.wid).key === w.key);
  if (ex) { if (w.ts > W(ex.wid).ts) ex.wid = wid; } else n.outbox.push({ to, wid });
}
function flushOutbox(from, to) {
  const n = node(from); const items = n.outbox.filter(e => e.to === to);
  if (!items.length) return;
  n.outbox = n.outbox.filter(e => e.to !== to);
  log('sync', `📮 ${from}: kuyruktaki ${items.length} güncelleme ${toN(to)} iletiliyor (<i>hinted handoff</i>).`,
    `📮 ${from}: forwarding ${items.length} queued update(s) to ${to} (<i>hinted handoff</i>).`);
  for (const e of items) send(from, to, 'REPL', { wid: e.wid, hint: true });
}

/* ---------- yazma kayıtları ---------- */
function newWrite(value, origin, basedOn) {
  const id = 'w' + (++S.wseq);
  S.writes[id] = { id, key: KEY, value, ts: +S.t.toFixed(2), origin, basedOn, acked: false, lost: false };
  return S.writes[id];
}
function markLatest(wid) { const w = W(wid), cur = W(S.latest[w.key]); if (!cur || w.ts >= cur.ts) S.latest[w.key] = wid; }
function isAncestor(a, b) { let x = W(b).basedOn; while (x) { if (x === a) return true; x = W(x).basedOn; } return false; }
function newer(a, b) { return a.ts > b.ts || (a.ts === b.ts && a.origin > b.origin); }

function applyTs(nid, wid, logIt) {
  const n = node(nid), inc = W(wid), cur = W(n.store[inc.key]);
  if (cur && cur.id === inc.id) return false;
  if (!cur || newer(inc, cur)) {
    n.store[inc.key] = wid; n.flashT = S.t;
    if (logIt) log('sync', `🔄 ${nid} senkronize oldu: ${fmt(cur.value)} → <b>${fmt(inc.value)}</b>`,
      `🔄 ${nid} synchronized: ${fmt(cur.value)} → <b>${fmt(inc.value)}</b>`);
    return true;
  }
  return false;
}

function applyAP(nid, wid, how) {
  const n = node(nid), inc = W(wid), cur = W(n.store[inc.key]);
  if (inc.lost || cur.id === inc.id) return false;
  if (cur.lost || isAncestor(cur.id, inc.id)) {
    n.store[inc.key] = wid; n.flashT = S.t;
    if (how === 'hint' || how === 'sync') log('sync', `🔄 ${nid} güncellendi: ${fmt(cur.value)} → <b>${fmt(inc.value)}</b>`,
      `🔄 ${nid} updated: ${fmt(cur.value)} → <b>${fmt(inc.value)}</b>`);
    return true;
  }
  if (isAncestor(inc.id, cur.id)) return false;
  const incWins = newer(inc, cur), win = incWins ? inc : cur, lose = incWins ? cur : inc;
  const pk = [inc.id, cur.id].sort().join('~');
  if (!S.conflictPairs.has(pk)) {
    S.conflictPairs.add(pk); S.stats.conflicts++;
    const a = `${fmt(cur.value)} [${originName(cur.origin, 'tr')}, t=${cur.ts}]`, b = `${fmt(inc.value)} [${originName(inc.origin, 'tr')}, t=${inc.ts}]`;
    const aE = `${fmt(cur.value)} [${originName(cur.origin, 'en')}, t=${cur.ts}]`, bE = `${fmt(inc.value)} [${originName(inc.origin, 'en')}, t=${inc.ts}]`;
    log('conflict', `⚔ <b>ÇAKIŞMA</b> (${nid}): ${a} ile ${b} birbirinden habersiz yazıldı. <b>Son yazan kazanır (LWW)</b> → ${fmt(win.value)}`,
      `⚔ <b>CONFLICT</b> (${nid}): ${aE} and ${bE} were written without knowing about each other. <b>Last write wins (LWW)</b> → ${fmt(win.value)}`);
  } else {
    log('conflict', `⚔ ${nid} aynı çakışmayı çözdü → ${fmt(win.value)}`, `⚔ ${nid} resolved the same conflict → ${fmt(win.value)}`);
  }
  if (!lose.lost) {
    lose.lost = true; S.stats.lost++;
    if (lose.acked) log('err', `😱 <b>KAYIP GÜNCELLEME:</b> ${fmt(lose.value)} yazmasına “başarılı” denmişti ama artık hiçbir düğümde yok!`,
      `😱 <b>LOST UPDATE:</b> the ${fmt(lose.value)} write was acknowledged as “successful”, but it no longer exists on any node!`);
  }
  if (incWins) { n.store[inc.key] = wid; n.flashT = S.t; return true; }
  return false;
}

/* ---------- istemci işlemleri ---------- */
function newOp(kind, cid, extra) {
  const c = client(cid);
  const op = { id: 'op' + (++S.oseq), kind, cid, nid: c.node, mode: S.mode, start: S.t, done: false, ...extra };
  S.ops[op.id] = op; return op;
}
function clientWrite(cid, value) {
  value = Math.round(Number(value)); if (!isFinite(value)) return;
  const c = client(cid), op = newOp('W', cid, { value });
  c.bubble = { kind: 'wait', text: bi(`⏳ Yaz: ${fmt(value)}`, `⏳ Write: ${fmt(value)}`) };
  log('client', `✍ ${c.name} → ${c.node}: “bakiye = ${fmt(value)}” yaz`, `✍ ${c.nameEn} → ${c.node}: write “balance = ${fmt(value)}”`);
  send(cid, c.node, 'W_REQ', { op: op.id, value });
  op.ctimer = addTimer(CLIENT_TIMEOUT, () => { if (!op.done) clientFinish(op, { ok: false, err: TIMEOUT_ERR }); });
}
function clientRead(cid) {
  const c = client(cid), op = newOp('R', cid, {});
  c.bubble = { kind: 'wait', text: bi('⏳ Okunuyor…', '⏳ Reading…') };
  log('client', `👁 ${c.name} → ${c.node}: bakiye kaç?`, `👁 ${c.nameEn} → ${c.node}: what is the balance?`);
  send(cid, c.node, 'R_REQ', { op: op.id });
  op.ctimer = addTimer(CLIENT_TIMEOUT, () => { if (!op.done) clientFinish(op, { ok: false, err: TIMEOUT_ERR }); });
}
function attachClient(cid, nid) {
  const c = client(cid); if (c.node === nid) return; c.node = nid; c.bubble = null;
  log('client', `🔌 ${c.name} artık ${nameOf(nid, 'tr')} düğümüne bağlı.`, `🔌 ${c.nameEn} is now connected to ${nameOf(nid, 'en')}.`);
}

function clientFinish(op, r) {
  op.done = true; cancelTimer(op.ctimer);
  const c = client(op.cid), lat = S.t - op.start, st = S.stats, L = lat.toFixed(1);
  st.req++;
  let kind, text, logTr, logEn;
  if (r.ok) {
    st.ok++;
    if (op.kind === 'W') {
      st.wLat += lat; st.wN++; kind = 'ok';
      text = bi(`✓ Yazıldı: ${fmt(op.value)} · ${L} sn`, `✓ Written: ${fmt(op.value)} · ${L} s`);
      logTr = `✓ ${c.name}: yazma başarılı (${fmt(op.value)}) — ${L} sn`;
      logEn = `✓ ${c.nameEn}: write succeeded (${fmt(op.value)}) — ${L} s`;
    } else {
      st.reads++; st.rLat += lat; st.rN++;
      if (r.fresh) {
        st.fresh++; kind = 'ok';
        text = bi(`✓ Okundu: ${fmt(r.value)} · ${L} sn`, `✓ Read: ${fmt(r.value)} · ${L} s`);
        logTr = `✓ ${c.name}: okudu → <b>${fmt(r.value)}</b> (güncel)`;
        logEn = `✓ ${c.nameEn}: read → <b>${fmt(r.value)}</b> (fresh)`;
      } else {
        st.stale++; kind = 'stale';
        text = bi(`⚠ ${fmt(r.value)} — ESKİ! (güncel: ${fmt(r.latestVal)})`, `⚠ ${fmt(r.value)} — STALE! (latest: ${fmt(r.latestVal)})`);
        logTr = `⚠ ${c.name}: okudu → <b>${fmt(r.value)}</b> ama güncel değer ${fmt(r.latestVal)}! <b>ESKİ OKUMA (C ihlali)</b>`;
        logEn = `⚠ ${c.nameEn}: read → <b>${fmt(r.value)}</b> but the latest value is ${fmt(r.latestVal)}! <b>STALE READ (C violated)</b>`;
      }
    }
  } else {
    st.fail++; kind = 'fail';
    const eTr = tl(r.err, 'tr'), eEn = tl(r.err, 'en');
    text = bi(`✗ HATA: ${eTr}`, `✗ ERROR: ${eEn}`);
    logTr = `✗ ${c.name}: ${op.kind === 'W' ? 'yazma' : 'okuma'} <b>BAŞARISIZ</b> — ${eTr} <span class="muted">(A ihlali)</span>`;
    logEn = `✗ ${c.nameEn}: ${op.kind === 'W' ? 'write' : 'read'} <b>FAILED</b> — ${eEn} <span class="muted">(A violated)</span>`;
  }
  c.bubble = { kind, text };
  c.last = { kind, text: bi(`${op.kind === 'W' ? 'Yazma' : 'Okuma'} @ ${op.nid}: ${text.tr}`, `${op.kind === 'W' ? 'Write' : 'Read'} @ ${op.nid}: ${text.en}`) };
  S.events.push({ t: S.t, cid: op.cid, kind, op: op.kind });
  log(kind === 'ok' ? 'ok' : kind === 'stale' ? 'stale' : 'err', logTr, logEn);
}

/* ---------- teslimat ---------- */
function deliver(m) {
  const d = m.data, op = d.op ? S.ops[d.op] : null;
  switch (m.type) {
    case 'W_REQ': if (op.mode === 'AP') apWrite(m.to, op); else coordWrite(m.to, op); break;
    case 'R_REQ': if (op.mode === 'CP') coordRead(m.to, op); else localRead(m.to, op); break;
    case 'RESP': if (!op.done) clientFinish(op, d); break;
    case 'PREP': {
      const n = node(m.to); n.pending[d.wid] = { wid: d.wid };
      addTimer(PENDING_TTL, () => { delete n.pending[d.wid]; }, true, m.to);
      send(m.to, m.from, 'PREP_ACK', { op: d.op, wid: d.wid });
      break;
    }
    case 'PREP_ACK':
      if (op.phase === 'prep') { op.acks.add(m.from); node(op.nid).flashT = S.t; checkWrite(op); }
      else if (op.phase === 'committed') send(m.to, m.from, 'COMMIT', { wid: d.wid });
      else send(m.to, m.from, 'ABORT', { wid: d.wid });
      break;
    case 'COMMIT': delete node(m.to).pending[d.wid]; applyTs(m.to, d.wid, false); break;
    case 'ABORT': delete node(m.to).pending[d.wid]; break;
    case 'RQ': send(m.to, m.from, 'RQ_R', { op: d.op, wid: node(m.to).store[KEY] }); break;
    case 'RQ_R': if (!op.qdone) { op.resps.push({ from: m.from, wid: d.wid }); checkRead(op); } break;
    case 'REPL': applyAP(m.to, d.wid, d.hint ? 'hint' : 'repl'); break;
    case 'SYNC': if (S.mode === 'AP') applyAP(m.to, d.wid, 'sync'); else applyTs(m.to, d.wid, true); break;
  }
}

function respond(nid, op, r) { send(nid, op.cid, 'RESP', { op: op.id, ...r }); }
function readResult(wid) {
  const w = W(wid), lt = W(S.latest[w.key]);
  return { ok: true, value: w.value, wid, fresh: wid === lt.id || w.value === lt.value, latestVal: lt.value };
}

/* CP / CA: iki aşamalı yazma */
function coordWrite(nid, op) {
  const n = node(nid), w = newWrite(op.value, nid, n.store[KEY]);
  op.wid = w.id; op.acks = new Set([nid]); op.need = needFor(op.mode); op.phase = 'prep';
  n.pending[w.id] = { wid: w.id };
  log('net', `${nid} koordinatör: ${op.mode === 'CA' ? '<b>tüm</b> düğümlerden' : '<b>çoğunluktan</b>'} onay istiyor (gerekli ${op.need}/${S.nodes.length}) <span class="tag prep">HAZIRLA</span>`,
    `${nid} coordinator: asking ${op.mode === 'CA' ? '<b>all</b> nodes' : 'a <b>majority</b>'} to ack (need ${op.need}/${S.nodes.length}) <span class="tag prep">PREPARE</span>`);
  for (const p of peersOf(nid)) send(nid, p, 'PREP', { op: op.id, wid: w.id });
  n.waits[op.id] = { start: S.t, dur: QUORUM_TIMEOUT, label: () => `${tx('onay', 'acks')} ${op.acks.size}/${op.need}` };
  op.qtimer = addTimer(QUORUM_TIMEOUT, () => abortWrite(op), false, nid);
  checkWrite(op);
}
function checkWrite(op) {
  if (op.phase !== 'prep' || op.acks.size < op.need) return;
  op.phase = 'committed'; cancelTimer(op.qtimer);
  const n = node(op.nid); delete n.waits[op.id]; delete n.pending[op.wid];
  applyTs(op.nid, op.wid, false);
  W(op.wid).acked = true; markLatest(op.wid);
  for (const a of op.acks) if (a !== op.nid) send(op.nid, a, 'COMMIT', { wid: op.wid });
  log('ok', `✅ ${op.nid}: ${op.acks.size}/${S.nodes.length} onay geldi → yazma <b>kesinleşti</b> (${fmt(op.value)}) <span class="tag commit">KESİNLEŞTİR</span>`,
    `✅ ${op.nid}: ${op.acks.size}/${S.nodes.length} acks received → write <b>committed</b> (${fmt(op.value)}) <span class="tag commit">COMMIT</span>`);
  respond(op.nid, op, { ok: true, value: op.value, wid: op.wid });
}
function abortWrite(op) {
  if (op.phase !== 'prep') return;
  op.phase = 'aborted';
  const n = node(op.nid); delete n.waits[op.id]; delete n.pending[op.wid];
  for (const a of op.acks) if (a !== op.nid) send(op.nid, a, 'ABORT', { wid: op.wid });
  const k = `(${op.acks.size}/${op.need})`;
  const why = op.mode === 'CA' ? bi(`Tüm düğümler onaylamadı ${k}`, `Not all nodes acked ${k}`) : bi(`Çoğunluk sağlanamadı ${k}`, `No majority reached ${k}`);
  log('err', `⛔ ${op.nid}: ${why.tr} → yazma <b>İPTAL</b>. <b class="cC">C korundu</b>, <b class="cA">A feda edildi</b>.`,
    `⛔ ${op.nid}: ${why.en} → write <b>ABORTED</b>. <b class="cC">C preserved</b>, <b class="cA">A sacrificed</b>.`);
  respond(op.nid, op, { ok: false, err: why });
}

/* CP: çoğunluk okuması */
function coordRead(nid, op) {
  const n = node(nid);
  op.need = majority(); op.resps = [{ from: nid, wid: n.store[KEY] }]; op.qdone = false;
  log('net', `${nid}: güncel değerden emin olmak için çoğunluğa soruyor (${op.need}/${S.nodes.length}) <span class="tag rq">SORGU</span>`,
    `${nid}: asking a majority to be sure it has the latest value (${op.need}/${S.nodes.length}) <span class="tag rq">QUERY</span>`);
  for (const p of peersOf(nid)) send(nid, p, 'RQ', { op: op.id });
  n.waits[op.id] = { start: S.t, dur: QUORUM_TIMEOUT, label: () => `${tx('yanıt', 'replies')} ${op.resps.length}/${op.need}` };
  op.qtimer = addTimer(QUORUM_TIMEOUT, () => {
    if (op.qdone) return; op.qdone = true; delete n.waits[op.id];
    const k = `(${op.resps.length}/${op.need})`, why = bi(`Çoğunluğa ulaşılamadı ${k}`, `Could not reach a majority ${k}`);
    log('err', `⛔ ${nid}: ${why.tr} → okuma reddedildi. Eski veri vermektense <b>hata</b> veriyor.`,
      `⛔ ${nid}: ${why.en} → read rejected. It returns an <b>error</b> rather than possibly stale data.`);
    respond(nid, op, { ok: false, err: why });
  }, false, nid);
  checkRead(op);
}
function checkRead(op) {
  if (op.qdone || op.resps.length < op.need) return;
  op.qdone = true; cancelTimer(op.qtimer);
  const n = node(op.nid); delete n.waits[op.id];
  let best = W(op.resps[0].wid);
  for (const r of op.resps) { const w = W(r.wid); if (newer(w, best)) best = w; }
  if (best.id !== n.store[KEY]) { log('sync', `🩹 ${op.nid}: kendi kopyası eskiymiş → <i>read repair</i>`, `🩹 ${op.nid}: its own copy was stale → <i>read repair</i>`); applyTs(op.nid, best.id, true); }
  respond(op.nid, op, readResult(best.id));
}

/* AP / CA: yerel işlemler */
function apWrite(nid, op) {
  const n = node(nid), w = newWrite(op.value, nid, n.store[KEY]);
  op.wid = w.id; n.store[KEY] = w.id; n.flashT = S.t;
  w.acked = true; markLatest(w.id);
  log('ok', `⚡ ${nid}: yerelde yazdı ve <b>hemen onayladı</b>; diğerlerine arka planda kopyalıyor <span class="tag repl">REPLİKA</span>`,
    `⚡ ${nid}: wrote locally and <b>acked immediately</b>; replicating to the others in the background <span class="tag repl">REPLICA</span>`);
  respond(nid, op, { ok: true, value: op.value, wid: w.id });
  for (const p of peersOf(nid)) send(nid, p, 'REPL', { wid: w.id });
}
function localRead(nid, op) { respond(nid, op, readResult(node(nid).store[KEY])); }

/* ---------- ağ ve düğüm olayları ---------- */
function checkConnectivity() {
  const now = computeReach();
  for (const k in now) if (now[k] && S.reachMap[k] === false) onReconnect(...k.split('|'));
  S.reachMap = now;
}
function onReconnect(a, b) {
  log('net', `🔗 ${a} ↔ ${b} yeniden haberleşebiliyor.`, `🔗 ${a} ↔ ${b} can talk to each other again.`);
  flushOutbox(a, b); flushOutbox(b, a);
  if (S.mode !== 'AP') {
    log('sync', `🔄 ${a} ↔ ${b}: veriler karşılaştırılıyor <span class="tag sync">SENKRON</span>`, `🔄 ${a} ↔ ${b}: comparing data <span class="tag sync">SYNC</span>`);
    send(a, b, 'SYNC', { wid: node(a).store[KEY] }); send(b, a, 'SYNC', { wid: node(b).store[KEY] });
  }
}
function toggleNode(id) {
  const n = node(id); n.up = !n.up;
  if (!n.up) {
    for (const t of S.timers) if (t.owner === id) t.done = true;
    n.waits = {}; n.pending = {};
    log('part', `💥 ${nameOf(id, 'tr')} <b>ÇÖKTÜ</b>. (Diskteki veri korunuyor.)`, `💥 ${nameOf(id, 'en')} <b>CRASHED</b>. (Data on its disk is kept.)`);
  } else log('net', `♻ ${nameOf(id, 'tr')} yeniden ayağa kalktı.`, `♻ ${nameOf(id, 'en')} is back up.`);
  checkConnectivity();
}
function toggleLink(a, b) {
  const k = lk(a, b);
  if (S.cuts.has(k)) { S.cuts.delete(k); log('net', `🔧 ${a}–${b} bağlantısı onarıldı.`, `🔧 ${a}–${b} link repaired.`); }
  else { S.cuts.add(k); log('part', `⚡ ${a}–${b} bağlantısı <b>KOPTU</b>.`, `⚡ ${a}–${b} link <b>CUT</b>.`); }
  checkConnectivity();
}
function isolate(id) {
  S.cuts = new Set(peersOf(id).map(p => lk(id, p)));
  const rest = peersOf(id).join(', ');
  log('part', `⚡ <b>AĞ BÖLÜNMESİ!</b> ${nameOf(id, 'tr')} diğerlerinden koptu → [${rest}] | [${id}]`,
    `⚡ <b>NETWORK PARTITION!</b> ${nameOf(id, 'en')} is cut off from the others → [${rest}] | [${id}]`);
  checkConnectivity();
}
function healAll() {
  const had = S.cuts.size > 0 || S.nodes.some(n => !n.up);
  S.cuts = new Set();
  for (const n of S.nodes) if (!n.up) { n.up = true; log('net', `♻ ${nameOf(n.id, 'tr')} yeniden ayağa kalktı.`, `♻ ${nameOf(n.id, 'en')} is back up.`); }
  if (had) log('net', '🔧 Ağ onarıldı — tüm bağlantılar sağlam.', '🔧 Network repaired — all links are healthy.');
  checkConnectivity();
}
function setMode(m) {
  if (S.mode === m) return;
  S.mode = m; S.modeMarks.push({ t: S.t, mode: m });
  log('step', `🔁 Sistem modu değişti: <b>${MODE_INFO[m].name.tr}</b>`, `🔁 System mode changed: <b>${MODE_INFO[m].name.en}</b>`);
}

/* ---------- grafik için örnekleme ---------- */
function sample() {
  if (S.t - S.lastSample < 0.25) return;
  S.lastSample = S.t;
  const vals = S.nodes.map(n => nodeVal(n.id).value);
  S.samples.push({ t: S.t, cut: S.cuts.size > 0, down: S.nodes.some(n => !n.up), div: new Set(vals).size > 1 });
  if (S.samples.length > 800) S.samples.shift();
}

function resetSim(mode) {
  S = newState(mode || 'CP');
  S.reachMap = computeReach();
  if (typeof onReset === 'function') onReset();
}
