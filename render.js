/* ==========================================================
   Çizim: SVG sahnesi, göstergeler, zaman grafiği
   ========================================================== */
const NW = 210, NH = 160, CW = 128, CH = 56;
const CLIENT_SLOTS = { N1: [[85, 260], [85, 420]], N2: [[915, 260], [915, 420]], N3: [[760, 585], [240, 585]] };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- geometri ---------- */
function clientPos(c) {
  const same = S.clients.filter(x => x.node === c.node);
  const slots = CLIENT_SLOTS[c.node]; const p = slots[Math.min(same.indexOf(c), slots.length - 1)];
  return { x: p[0], y: p[1] };
}
function box(id) {
  if (isNode(id)) { const n = node(id); return { x: n.x, y: n.y, w: NW, h: NH }; }
  const p = clientPos(client(id)); return { x: p.x, y: p.y, w: CW, h: CH };
}
function borderPoint(b, tx, ty, pad = 4) {
  const dx = tx - b.x, dy = ty - b.y;
  const s = Math.min((b.w / 2 + pad) / Math.abs(dx || 1e-9), (b.h / 2 + pad) / Math.abs(dy || 1e-9));
  return [b.x + dx * s, b.y + dy * s];
}
function segment(a, b) { const A = box(a), B = box(b); return [borderPoint(A, B.x, B.y), borderPoint(B, A.x, A.y)]; }
function along(a, b, f, off = 0) {
  const [p, q] = segment(a, b); const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
  return [p[0] + dx * f + (-dy / L) * off, p[1] + dy * f + (dx / L) * off];
}
const CENTROID = [500, 283];

/* ---------- statik katmanlar ---------- */
let lastHash = '';
function staticHash() {
  return JSON.stringify([LANG, S.mode, [...S.cuts].sort(),
    S.nodes.map(n => [n.up, n.store[KEY], W(n.store[KEY]).lost, Object.keys(n.pending).join(), n.outbox.length]),
    S.clients.map(c => [c.node, c.bubble && tl(c.bubble.text), c.bubble && c.bubble.kind])]);
}
function renderStatic(force) {
  const h = staticHash(); if (!force && h === lastHash) return; lastHash = h;
  renderLinks(); renderNodes(); renderClients();
  const mi = MODE_INFO[S.mode];
  $('modeBanner').style.setProperty('--mc', mi.color);
  $('modeBanner').innerHTML = `<b style="color:${mi.color}">${tl(mi.name)}</b><br>${tl(mi.rule)}`;
  const aw = $('apWarn'); aw.hidden = S.mode !== 'AP';
  if (aw.hidden) closeWarn(true); else if ($('apWarnTip').classList.contains('open')) placeWarn();
  document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('active', b.dataset.mode === S.mode));
}

function renderLinks() {
  let s = '';
  for (let i = 0; i < S.nodes.length; i++) for (let j = i + 1; j < S.nodes.length; j++) {
    const a = S.nodes[i].id, b = S.nodes[j].id, k = lk(a, b), cut = S.cuts.has(k);
    const [p, q] = segment(a, b);
    s += `<g class="link${cut ? ' cut' : ''}" data-link="${k}">
      <line class="hit" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>
      <line class="wire" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>`;
    if (!cut && node(a).up && node(b).up) s += `<line class="flow" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>`;
    if (cut) {
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
      const ux = dx / L, uy = dy / L; let nx = -uy, ny = ux;
      if ((CENTROID[0] - mx) * nx + (CENTROID[1] - my) * ny > 0) { nx = -nx; ny = -ny; }
      let pts = [];
      for (let t = -26; t <= 26; t += 8.66) { const z = (Math.round((t + 26) / 8.66) % 2 ? 6 : -6); pts.push(`${mx + nx * t + ux * z},${my + ny * t + uy * z}`); }
      const px = mx + nx * 46, py = my + ny * 46;
      s += `<polyline class="wall" points="${pts.join(' ')}" filter="url(#glow)"/>
        <rect class="cut-pill" x="${px - 42}" y="${py - 12}" width="84" height="24" rx="12"/>
        <text class="cut-txt" x="${px}" y="${py + 4}" text-anchor="middle">${tx('⚡ KOPUK', '⚡ CUT')}</text>`;
    }
    s += '</g>';
  }
  $('gLinks').innerHTML = s;
}

function nodeStatus(n) {
  if (!n.up) return ['down', tx('ÇÖKTÜ', 'DOWN')];
  const r = reachCount(n.id);
  if (r === 0) return ['iso', tx('İZOLE', 'ISOLATED')];
  if (r < S.nodes.length - 1) return ['part', tx('KISMİ', 'PARTIAL')];
  return ['ok', tx('AKTİF', 'ACTIVE')];
}
function renderNodes() {
  let s = '';
  for (const n of S.nodes) {
    const x0 = n.x - NW / 2, y0 = n.y - NH / 2, [st, stTxt] = nodeStatus(n);
    const w = W(n.store[KEY]), r = n.up ? reachCount(n.id) : 0, total = S.nodes.length;
    const cls = !n.up ? ' down' : st === 'iso' ? ' iso' : st === 'part' ? ' part' : '';
    let q;
    if (!n.up) q = `<text class="quorum qbad" x="${x0 + 12}" y="${y0 + 147}">${tx('💤 Çevrimdışı — istek alamaz', '💤 Offline — cannot serve')}</text>`;
    else if (S.mode === 'AP') q = `<text class="quorum qind" x="${x0 + 12}" y="${y0 + 147}">${tx(`⚡ Bağımsız · ${r} komşuya ulaşıyor`, `⚡ Independent · reaches ${r} peer${r === 1 ? '' : 's'}`)}</text>`;
    else {
      const need = needFor(S.mode), have = r + 1, ok = have >= need;
      const qn = S.mode === 'CA' ? tx('Tam onay', 'All-ack') : tx('Çoğunluk', 'Majority');
      q = `<text class="quorum ${ok ? 'qok' : 'qbad'}" x="${x0 + 12}" y="${y0 + 147}">👥 ${qn} ${have}/${total} ${ok ? '✓' : `✗ (${tx('gerekli', 'need')} ${need})`}</text>`;
    }
    const pend = Object.keys(n.pending).map(id => fmt(W(id).value));
    const pw = Math.max(60, stTxt.length * 7 + 14), px = x0 + NW - 10 - pw;
    s += `<g class="node${cls}" data-node="${n.id}">
      <rect class="card" x="${x0}" y="${y0}" width="${NW}" height="${NH}" rx="14"/>
      <path class="head" d="M${x0 + 1} ${y0 + 34} V${y0 + 14} Q${x0 + 1} ${y0 + 1} ${x0 + 14} ${y0 + 1} H${x0 + NW - 14} Q${x0 + NW - 1} ${y0 + 1} ${x0 + NW - 1} ${y0 + 14} V${y0 + 34} Z"/>
      <text class="nid" x="${x0 + 12}" y="${y0 + 23}">${n.id}</text>
      <text class="city" x="${x0 + 46}" y="${y0 + 23}">${cityOf(n)}</text>
      <rect class="pill ${st}" x="${px}" y="${y0 + 9}" width="${pw}" height="17" rx="8.5"/>
      <text class="pilltxt" x="${px + pw / 2}" y="${y0 + 21}">${stTxt}</text>
      <path class="cyl-body" d="M${x0 + 16} ${y0 + 52} V${y0 + 92} A20 7 0 0 0 ${x0 + 56} ${y0 + 92} V${y0 + 52} Z"/>
      <path class="cyl-line" d="M${x0 + 16} ${y0 + 66} A20 7 0 0 0 ${x0 + 56} ${y0 + 66} M${x0 + 16} ${y0 + 79} A20 7 0 0 0 ${x0 + 56} ${y0 + 79}"/>
      <ellipse class="cyl-top" cx="${x0 + 36}" cy="${y0 + 52}" rx="20" ry="7"/>
      <text class="dbk" x="${x0 + 70}" y="${y0 + 55}">🔑 ${keyName()}</text>
      <text class="val${w.lost ? ' lost' : ''}" x="${x0 + 70}" y="${y0 + 86}">${fmt(w.value)}</text>
      <text class="ver" x="${x0 + 70}" y="${y0 + 103}">${tx('sürüm', 'version')} t=${w.ts}s · ${esc(originName(w.origin))}</text>
      ${pend.length ? `<text class="pend" x="${x0 + 16}" y="${y0 + 121}">${tx(`⏳ hazırlanıyor: ${pend.join(', ')} (onaysız)`, `⏳ preparing: ${pend.join(', ')} (uncommitted)`)}</text>` : ''}
      <line class="sep" x1="${x0 + 10}" y1="${y0 + 128}" x2="${x0 + NW - 10}" y2="${y0 + 128}"/>
      ${q}
      ${n.outbox.length ? `<text class="outbox" x="${x0 + NW - 10}" y="${y0 + 121}" text-anchor="end">📮 ${n.outbox.length} ${tx('kuyrukta', 'queued')}</text>` : ''}
    </g>`;
  }
  $('gNodes').innerHTML = s;
}

function wrapText(t, max = 22) {
  const lines = [];
  for (const part of t.split(/ · | — /)) {
    let cur = '';
    for (const w of part.split(' ')) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    if (cur) lines.push(cur);
  }
  return lines;
}
function renderClients() {
  let s = '', b = '';
  for (const c of S.clients) {
    const p = clientPos(c), [p1, p2] = segment(c.id, c.node);
    s += `<g class="client"><line class="clink" stroke="${c.color}" x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}"/>
      <rect class="box" stroke="${c.color}" x="${p.x - CW / 2}" y="${p.y - CH / 2}" width="${CW}" height="${CH}" rx="12"/>
      <text class="cname" fill="${c.color}" x="${p.x}" y="${p.y - 4}" text-anchor="middle">👤 ${clientName(c)}</text>
      <text class="csub" x="${p.x}" y="${p.y + 15}" text-anchor="middle">→ ${c.node} · ${cityOf(node(c.node))}</text></g>`;
    if (c.bubble) {
      const lines = wrapText(tl(c.bubble.text)), bw = Math.max(...lines.map(l => l.length)) * 7.4 + 22, bh = lines.length * 16 + 12;
      let bx = Math.max(8, Math.min(992 - bw, p.x - bw / 2)); const by = p.y - CH / 2 - 10 - bh;
      const ax = Math.max(bx + 12, Math.min(bx + bw - 12, p.x));
      b += `<g class="bubble ${c.bubble.kind}"><path d="M${ax - 7} ${by + bh - 1} L${ax} ${by + bh + 8} L${ax + 7} ${by + bh - 1} Z"/>
        <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="9"/>
        ${lines.map((l, i) => `<text x="${bx + bw / 2}" y="${by + 21 + i * 16}" text-anchor="middle">${esc(l)}</text>`).join('')}</g>`;
    }
  }
  $('gClients').innerHTML = s; $('gBubbles').innerHTML = b;
}

/* ---------- dinamik katmanlar ---------- */
function msgView(m) {
  const t = MT[m.type], d = m.data, nm = mtl(m.type); let label = nm, col = t.c, icon = '•';
  const wv = d.wid ? fmt(W(d.wid).value) : '';
  switch (m.type) {
    case 'W_REQ': label = `${nm} ${fmt(d.value)}`; icon = '✎'; break;
    case 'R_REQ': label = `${nm} ?`; icon = '?'; break;
    case 'RESP':
      if (!d.ok) { label = tx('HATA', 'ERROR'); col = '#ff5d6c'; icon = '✗'; }
      else if (S.ops[d.op].kind === 'W') { label = tx('✓ TAMAM', '✓ OK'); icon = '✓'; }
      else if (d.fresh) { label = `${fmt(d.value)} ✓`; icon = '✓'; }
      else { label = `${fmt(d.value)} ${tx('(eski)', '(stale)')}`; col = '#f5b041'; icon = '!'; }
      break;
    case 'PREP': label = `${nm} ${wv}`; icon = tx('H', 'P'); break;
    case 'PREP_ACK': icon = '✓'; break;
    case 'COMMIT': icon = '✔'; break;
    case 'ABORT': icon = '✗'; break;
    case 'RQ': label = `${nm} ?`; icon = '?'; break;
    case 'RQ_R': label = `${nm} ${wv}`; icon = '↩'; break;
    case 'REPL': label = `${d.hint ? '📮 ' : ''}${nm} ${wv}`; icon = 'R'; break;
    case 'SYNC': label = `${nm} ${wv}`; icon = '⟳'; break;
  }
  return { label, col, icon };
}
function renderMsgs() {
  let s = '';
  for (const m of S.msgs) {
    const f = Math.max(0, Math.min(1, (S.t - m.t0) / m.dur)), v = msgView(m);
    const [x, y] = along(m.from, m.to, f, 7), [qx, qy] = along(m.from, m.to, Math.max(0, f - 0.14), 7);
    s += `<g><line x1="${qx}" y1="${qy}" x2="${x}" y2="${y}" stroke="${v.col}" stroke-width="4" stroke-linecap="round" opacity=".45"/>
      <circle cx="${x}" cy="${y}" r="9" fill="${v.col}" filter="url(#glow)"/>
      <text class="micon" x="${x}" y="${y + 4}">${v.icon}</text>
      <text class="mtag" x="${x}" y="${y - 14}" fill="${v.col}">${esc(v.label)}</text></g>`;
  }
  $('gMsgs').innerHTML = s;
}
function renderOverlay(nowMs) {
  let s = '';
  const dash = -(nowMs / 35) % 17, pulse = 0.55 + 0.45 * Math.sin(nowMs / 260);
  for (const f of (RUN.focus || [])) {
    if (f.startsWith('link:')) {
      const [a, b] = f.slice(5).split('|'); const [x, y] = along(a, b, 0.5);
      s += `<circle class="focus" cx="${x}" cy="${y}" r="30" stroke-dashoffset="${dash}" opacity="${pulse}"/>`;
    } else {
      const id = f.startsWith('client:') ? f.slice(7) : f, b = box(id), pad = 9;
      s += `<rect class="focus" x="${b.x - b.w / 2 - pad}" y="${b.y - b.h / 2 - pad}" width="${b.w + pad * 2}" height="${b.h + pad * 2}" rx="18" stroke-dashoffset="${dash}" opacity="${pulse}"/>`;
    }
  }
  for (const n of S.nodes) {
    const x0 = n.x - NW / 2, y0 = n.y - NH / 2, age = S.t - n.flashT;
    if (age >= 0 && age < 0.9) s += `<rect class="flash" x="${x0 - 3}" y="${y0 - 3}" width="${NW + 6}" height="${NH + 6}" rx="16" opacity="${1 - age / 0.9}"/>`;
    let k = 0;
    for (const id in n.waits) {
      const w = n.waits[id], fr = Math.min(1, (S.t - w.start) / w.dur), by = y0 - 24 - k * 20; k++;
      s += `<g class="waitbar"><rect class="wb-bg" x="${x0 + 10}" y="${by}" width="${NW - 20}" height="16" rx="8"/>
        <rect class="wb-fg" x="${x0 + 10}" y="${by}" width="${(NW - 20) * fr}" height="16" rx="8"/>
        <text x="${n.x}" y="${by + 12}" text-anchor="middle">⏳ ${w.label()} · ${tx('zaman aşımı', 'timeout')} ${Math.max(0, w.dur - (S.t - w.start)).toFixed(1)} ${SEC()}</text></g>`;
    }
  }
  for (const b of S.bursts) {
    const age = (S.t - b.t) / 1.2, [x, y] = along(b.from, b.to, b.frac, 7), r = 10 + age * 10;
    s += `<g class="burst" opacity="${1 - age}"><circle cx="${x}" cy="${y}" r="${r}"/><text x="${x}" y="${y + 5}" text-anchor="middle">✕</text></g>`;
  }
  $('gOverlay').innerHTML = s;
}

/* ---------- göstergeler ---------- */
function canServe(n) {
  if (!n.up) return false;
  if (S.mode === 'AP') return true;
  return reachCount(n.id) + 1 >= needFor(S.mode);
}
function setState(el, cls, txt) { el.className = 'mstate ' + cls; el.textContent = txt; }
function renderMetrics() {
  const st = S.stats, lt = W(S.latest[KEY]);
  const vals = S.nodes.map(n => nodeVal(n.id)), diverged = new Set(vals.map(v => v.value)).size > 1;
  $('mCchips').innerHTML = S.nodes.map((n, i) => {
    const v = vals[i], c = v.lost ? 'bad' : v.value !== lt.value ? 'diff' : 'good';
    return `<span class="${c}">${n.id}: ${fmt(v.value)}</span>`;
  }).join('') + `<span>${tx('güncel', 'latest')}: ${fmt(lt.value)}</span>`;
  const reads = st.fresh + st.stale, staleB = `<b class="${st.stale ? 'warn' : ''}">${st.stale}</b>`;
  $('mCbar').style.width = (reads ? st.fresh / reads * 100 : 100) + '%';
  $('mCtxt').innerHTML = reads ? tx(`Okumalar: <b>${st.fresh}</b> güncel · ${staleB} eski`, `Reads: <b>${st.fresh}</b> fresh · ${staleB} stale`) : tx('Henüz okuma yok', 'No reads yet');
  if (st.stale || st.lost) setState($('mCstate'), 'bad', st.lost ? tx('İhlal + kayıp', 'Violated + loss') : tx('İhlal edildi', 'Violated'));
  else if (diverged) setState($('mCstate'), 'mid', tx('Replikalar ayrışık', 'Replicas diverged'));
  else setState($('mCstate'), 'good', tx('Korunuyor ✓', 'Preserved ✓'));

  $('mAchips').innerHTML = S.nodes.map(n => `<span class="${canServe(n) ? 'good' : 'bad'}">${n.id} ${canServe(n) ? tx('✓ yazabilir', '✓ serves') : tx('✗ reddeder', '✗ rejects')}</span>`).join('');
  $('mAbar').style.width = (st.req ? st.ok / st.req * 100 : 100) + '%';
  const failB = `<b class="${st.fail ? 'err' : ''}">${st.fail}</b>`;
  $('mAtxt').innerHTML = st.req ? tx(`<b>${st.ok}/${st.req}</b> istek başarılı · ${failB} reddedildi/zaman aşımı`, `<b>${st.ok}/${st.req}</b> requests succeeded · ${failB} rejected/timed out`) : tx('Henüz istek yok', 'No requests yet');
  const pct = Math.round(st.ok / st.req * 100);
  if (st.fail) setState($('mAstate'), 'bad', tx(`%${pct}`, `${pct}%`));
  else if (S.nodes.some(n => !canServe(n))) setState($('mAstate'), 'mid', tx('Kısmi', 'Partial'));
  else setState($('mAstate'), 'good', tx('Tam ✓', 'Full ✓'));

  let pc = '';
  for (let i = 0; i < S.nodes.length; i++) for (let j = i + 1; j < S.nodes.length; j++) {
    const a = S.nodes[i].id, b = S.nodes[j].id, cut = S.cuts.has(lk(a, b));
    pc += `<span class="${cut ? 'bad' : 'good'}">${a}–${b} ${cut ? '✗' : '✓'}</span>`;
  }
  for (const n of S.nodes) if (!n.up) pc += `<span class="bad">${n.id} 💥</span>`;
  $('mPchips').innerHTML = pc;
  if (S.cuts.size || S.nodes.some(n => !n.up)) setState($('mPstate'), 'bad', S.cuts.size ? tx('Bölünme var ⚡', 'Partitioned ⚡') : tx('Düğüm çöktü', 'Node down'));
  else setState($('mPstate'), 'good', tx('Ağ sağlam', 'Network OK'));

  $('xW').textContent = st.wN ? (st.wLat / st.wN).toFixed(1) + ' ' + SEC() : '—';
  $('xR').textContent = st.rN ? (st.rLat / st.rN).toFixed(1) + ' ' + SEC() : '—';
  $('xC').textContent = st.conflicts; $('xL').textContent = st.lost;
  $('xL').style.color = st.lost ? 'var(--p)' : ''; $('xC').style.color = st.conflicts ? 'var(--warn)' : '';

  for (const c of S.clients) {
    const sel = document.querySelector(`select[data-cnode="${c.id}"]`);
    if (sel && document.activeElement !== sel && sel.value !== c.node) sel.value = c.node;
    const last = $('last-' + c.id);
    if (last) { last.className = 'cc-last ' + (c.last ? c.last.kind : ''); last.textContent = c.last ? tl(c.last.text) : tx('Son işlem: —', 'Last op: —'); }
  }
}

/* ---------- zaman grafiği ---------- */
function renderChart() {
  const cv = $('chart'), dpr = window.devicePixelRatio || 1, Wd = cv.clientWidth, Ht = cv.clientHeight;
  if (!Wd) return;
  if (cv.width !== Wd * dpr || cv.height !== Ht * dpr) { cv.width = Wd * dpr; cv.height = Ht * dpr; }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, Wd, Ht);
  const L = 92, R = Wd - 12, t1 = Math.max(S.t, 40), t0 = Math.max(0, t1 - 120), X = t => L + (t - t0) / (t1 - t0) * (R - L);
  const lanes = { P: [14, 34], C: [46, 66], A: [80, 150] };
  g.font = '600 11.5px Segoe UI, sans-serif'; g.textBaseline = 'middle';
  const lab = (txt, col, y) => { g.fillStyle = col; g.fillText(txt, 8, y); };
  lab(tx('P  ağ', 'P  network'), '#ff5d6c', 24); lab(tx('C  replikalar', 'C  replicas'), '#4f8cff', 56); lab(tx('A  istekler', 'A  requests'), '#22c55e', 88);
  g.fillStyle = '#5aa9ff'; g.fillText(clientName(S.clients[0]), 18, 104); g.fillStyle = '#ffb347'; g.fillText(clientName(S.clients[1]), 18, 132);
  for (const k in lanes) { g.fillStyle = '#0f1630'; g.fillRect(L, lanes[k][0], R - L, lanes[k][1] - lanes[k][0]); }
  const sm = S.samples;
  for (let i = 0; i < sm.length; i++) {
    const a = sm[i], tb = i + 1 < sm.length ? sm[i + 1].t : S.t; if (tb < t0) continue;
    const xa = X(Math.max(a.t, t0)), w = Math.max(1, X(tb) - xa);
    g.fillStyle = a.cut ? '#ff5d6c' : a.down ? '#a970ff' : '#1d4d36'; g.fillRect(xa, 16, w, 16);
    g.fillStyle = a.div ? '#f5b041' : '#1f5fd1'; g.fillRect(xa, 48, w, 16);
  }
  for (const e of S.events) {
    if (e.t < t0) continue;
    const x = X(e.t), y = e.cid === 'CA' ? 104 : 132;
    g.fillStyle = e.kind === 'ok' ? '#22c55e' : e.kind === 'stale' ? '#f5b041' : '#ff5d6c';
    g.beginPath(); if (e.op === 'W') g.rect(x - 6, y - 6, 12, 12); else g.arc(x, y, 6, 0, 7); g.fill();
  }
  g.setLineDash([3, 4]); g.strokeStyle = '#6b7bb5';
  for (const m of S.modeMarks) {
    if (m.t < t0) continue; const x = X(m.t);
    g.beginPath(); g.moveTo(x, 8); g.lineTo(x, 152); g.stroke();
    g.fillStyle = MODE_INFO[m.mode].color; g.fillText(m.mode, x + 4, 8);
  }
  g.setLineDash([]); g.strokeStyle = '#ffe27a'; const xn = X(S.t);
  g.beginPath(); g.moveTo(xn, 10); g.lineTo(xn, 154); g.stroke();
  g.fillStyle = '#8d9bc4'; g.font = '11px Segoe UI'; g.textAlign = 'right';
  g.fillText(tx('■ yazma  ● okuma   yeşil=başarılı · turuncu=eski · kırmızı=hata', '■ write  ● read   green=ok · orange=stale · red=error'), R, 162);
  g.textAlign = 'left'; g.fillText(`${t0.toFixed(0)} ${SEC()}`, L, 162);
}
