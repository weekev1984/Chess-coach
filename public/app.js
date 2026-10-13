import { Chess } from './vendor/chess.js';

const $ = id => document.getElementById(id);
const PIECES = Object.fromEntries(['w', 'b'].flatMap(c => [...'KQRBNP'].map(t => [c + t, `/pieces/${c}${t}.svg`])));
const OPENINGS = (await (await fetch('/openings.json')).json()).map(([eco, name, moves, epd]) => ({ eco, name, moves, epd }));
const BY_EPD = new Map(OPENINGS.map(o => [o.epd, o]));
const PREFIX = new Map();
for (const o of OPENINGS) { const m = o.moves.split(' '); for (let i = 1; i <= m.length; i++) { const k = m.slice(0, i).join(' '); PREFIX.set(k, (PREFIX.get(k) || 0) + 1); } }
const NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const MATE = 100000;
const pieceImg = (c, t) => PIECES[c + t.toUpperCase()];
$('brand-knight').src = PIECES.wN;
$('lib-count').textContent = OPENINGS.length.toLocaleString();

const LEVELS = {
  1: { opts: { depth: 1, noise: 380 }, book: 6, bookProb: .6, delay: 500 },
  2: { opts: { depth: 2, noise: 140 }, book: 10, bookProb: .85, delay: 450 },
  3: { opts: { depth: 3, noise: 40 }, book: 14, bookProb: 1, delay: 350 },
  4: { opts: { depth: 7, timeMs: 900 }, book: 20, bookProb: 1, delay: 200 },
  5: { opts: { timeMs: 2200 }, book: 24, bookProb: 1, delay: 100 },
};

// ---------- Engine (web worker with main-thread fallback) ----------
let worker = null, reqId = 0;
const pending = new Map();
let localEngine = null;
try {
  worker = new Worker('/engine-worker.js');
  worker.onmessage = e => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data.res); } };
  worker.onerror = () => { worker = null; for (const [id, p] of pending) { pending.delete(id); p(null); } };
} catch (e) { worker = null; }
let localQueue = Promise.resolve();
function think(fen, opts) {
  if (worker) return new Promise(res => { const id = ++reqId; pending.set(id, r => res(r || null)); worker.postMessage({ id, fen, opts }); });
  localEngine = localEngine || createEngine();
  const job = localQueue.then(() => new Promise(res => setTimeout(() => res(localEngine.go(fen, opts)), 20)));
  localQueue = job.catch(() => {});
  return job;
}

// ---------- State ----------
let game = new Chess();
let fens = [game.fen()];
let playerColor = 'w';
let level = 2;
let flipped = false;
let selected = null;
let hintStage = 0, hintData = null;
let token = 0;           // bumps whenever the game changes, so stale engine answers are ignored
let busy = false;        // AI thinking
let pendingConfirm = null;
let lastScore = 0;       // from white's view, centipawns
const pre = new Map();   // fen -> promise of engine analysis (player to move)
let messages = [];
let previewArrow = null;
let gameOverShown = false;
let lastThreat = '';

const opt = id => $(id).checked;
function save() {
  try { localStorage.setItem('knight-school', JSON.stringify({ moves: game.history(), playerColor, level, flipped, warn: opt('opt-warn'), threat: opt('opt-threat'), ev: opt('opt-eval') })); } catch (e) {}
}
function restore() {
  try {
    const s = JSON.parse(localStorage.getItem('knight-school') || 'null');
    if (!s) return false;
    playerColor = s.playerColor || 'w'; level = s.level || 2; flipped = !!s.flipped;
    $('opt-warn').checked = s.warn !== false; $('opt-threat').checked = s.threat !== false; $('opt-eval').checked = s.ev !== false;
    game = new Chess(); fens = [game.fen()];
    for (const m of s.moves || []) { game.move(m); fens.push(game.fen()); }
    return true;
  } catch (e) { game = new Chess(); fens = [game.fen()]; return false; }
}

// ---------- Opening knowledge ----------
const epdOf = fen => fen.split(' ').slice(0, 4).join(' ');
const familyOf = coachFamily;
function coachFor(o) {
  const fam = familyOf(o.name);
  return { fam, info: COACH[fam] || null, general: ECO_GENERAL[o.eco[0]] };
}
function currentOpening() {
  for (let i = fens.length - 1; i >= 1; i--) {
    const o = BY_EPD.get(epdOf(fens[i]));
    if (o) return { o, ply: i };
  }
  return null;
}
function bookMoves(ch = game) {
  const out = [];
  const hist = ch.history().join(' ');
  for (const m of ch.moves({ verbose: true })) {
    ch.move(m.san);
    const o = BY_EPD.get(epdOf(ch.fen()));
    ch.undo();
    if (o) out.push({ m, o, w: PREFIX.get((hist ? hist + ' ' : '') + m.san) || 1 });
  }
  return out.sort((a, b) => b.w - a.w);
}
function inBookPly(i) { return i >= 1 && BY_EPD.has(epdOf(fens[i])); }

// ---------- Board rendering ----------
const FILES = 'abcdefgh';
function squareAt(row, col) { return flipped ? FILES[7 - col] + (row + 1) : FILES[col] + (8 - row); }
function squareXY(sq) { const f = FILES.indexOf(sq[0]), r = +sq[1]; const col = flipped ? 7 - f : f; const row = flipped ? r - 1 : 8 - r; return [col * 100 + 50, row * 100 + 50]; }
let hintSquare = null;
function render() {
  const el = $('squares');
  el.innerHTML = '';
  const last = game.history({ verbose: true }).slice(-1)[0];
  const targets = selected ? game.moves({ square: selected, verbose: true }) : [];
  const checkSq = game.inCheck() ? findKing(game.turn()) : null;
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const sq = squareAt(row, col);
    const d = document.createElement('div');
    const dark = (FILES.indexOf(sq[0]) + +sq[1]) % 2 === 0;
    d.className = 'sq ' + (dark ? 'd' : 'l');
    d.dataset.sq = sq;
    if (last && (last.from === sq || last.to === sq)) d.classList.add('last');
    if (selected === sq) d.classList.add('sel');
    if (hintSquare === sq) d.classList.add('hint');
    if (checkSq === sq) d.classList.add('check');
    const p = game.get(sq);
    if (p) { const img = document.createElement('img'); img.className = 'pc'; img.src = pieceImg(p.color, p.type); img.alt = (p.color === 'w' ? 'white ' : 'black ') + NAMES[p.type]; img.draggable = false; d.appendChild(img); }
    const t = targets.find(m => m.to === sq);
    if (t) { const k = document.createElement('div'); k.className = p ? 'ring' : 'dot'; d.appendChild(k); }
    if (col === 0) { const c = document.createElement('span'); c.className = 'coord r'; c.textContent = sq[1]; d.appendChild(c); }
    if (row === 7) { const c = document.createElement('span'); c.className = 'coord f'; c.textContent = sq[0]; d.appendChild(c); }
    el.appendChild(d);
  }
  drawArrows();
  renderStatus();
  renderEval();
}
function findKing(color) {
  for (const row of game.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}
function drawArrows() {
  const g = $('arrow-layer');
  g.innerHTML = '';
  const list = [];
  if (hintStage === 2 && hintData && hintData.fen === game.fen()) list.push({ from: hintData.move.from, to: hintData.move.to, color: 'blue' });
  if (previewArrow) list.push(previewArrow);
  for (const a of list) {
    const [x1, y1] = squareXY(a.from), [x2, y2] = squareXY(a.to);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    const ex = x2 - dx / len * 28, ey = y2 - dy / len * 28;
    const col = a.color === 'blue' ? '#2a7bd8' : a.color === 'red' ? '#d23a30' : '#e0a200';
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', ex); line.setAttribute('y2', ey);
    line.setAttribute('stroke', col); line.setAttribute('stroke-width', 18); line.setAttribute('stroke-linecap', 'round'); line.setAttribute('opacity', '.82');
    line.setAttribute('marker-end', `url(#ah-${a.color})`);
    g.appendChild(line);
  }
}
function renderStatus() {
  const s = $('status');
  const turn = game.turn();
  let text;
  if (game.isCheckmate()) text = turn === playerColor ? 'Checkmate. The coach wins this one.' : 'Checkmate! You win!';
  else if (game.isStalemate()) text = 'Stalemate. It\'s a draw.';
  else if (game.isDraw()) text = 'It\'s a draw.';
  else if (pendingConfirm) text = 'Take it back, or keep your move?';
  else if (turn === playerColor) text = game.inCheck() ? 'You\'re in check! Your move.' : 'Your move';
  else text = 'Coach is thinking…';
  s.innerHTML = `<span class="pip ${turn}"></span><span class="${turn !== playerColor && !game.isGameOver() && !pendingConfirm ? 'thinking' : ''}">${text}</span>`;
  $('hint-btn').disabled = turn !== playerColor || game.isGameOver() || !!pendingConfirm;
  $('threat-btn').disabled = turn !== playerColor || game.isGameOver();
  $('undo-btn').disabled = game.history().length === 0;
}
function renderEval() {
  const bar = $('evalbar');
  bar.hidden = !opt('opt-eval');
  bar.classList.toggle('flip', flipped);
  const s = Math.max(-1500, Math.min(1500, lastScore));
  const whitePct = 50 + 50 * Math.tanh(s / 600);
  $('evalfill').style.height = (flipped ? 100 - whitePct : whitePct) + '%';
  const me = playerColor === 'w' ? s : -s;
  bar.title = Math.abs(me) > 90000 ? (me > 0 ? 'You can force checkmate!' : 'Your opponent can force checkmate') : Math.abs(me) < 60 ? 'About even' : me > 0 ? `You're ahead (about ${(me / 100).toFixed(1)} pawns)` : `You're behind (about ${(-me / 100).toFixed(1)} pawns)`;
}

// ---------- Input ----------
let drag = null;
const board = $('board');
board.addEventListener('pointerdown', e => {
  const sqEl = e.target.closest('.sq'); if (!sqEl) return;
  const sq = sqEl.dataset.sq;
  if (!canMove()) return;
  const p = game.get(sq);
  if (selected && selected !== sq && tryMove(selected, sq)) return;
  if (p && p.color === playerColor) {
    selected = sq; previewArrow = null; render();
    const img = document.createElement('img');
    img.src = pieceImg(p.color, p.type); img.className = 'drag-ghost';
    const size = board.clientWidth / 8; img.style.width = img.style.height = size + 'px';
    img.style.left = e.clientX + 'px'; img.style.top = e.clientY + 'px';
    drag = { from: sq, img, moved: false, x: e.clientX, y: e.clientY };
    board.setPointerCapture(e.pointerId);
  } else { selected = null; render(); }
});
board.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
    drag.moved = true; document.body.appendChild(drag.img);
    const el = board.querySelector(`.sq[data-sq="${drag.from}"]`); if (el) el.classList.add('dragging');
  }
  if (drag.moved) { drag.img.style.left = e.clientX + 'px'; drag.img.style.top = e.clientY + 'px'; }
});
function endDrag(e) {
  if (!drag) return;
  const d = drag; drag = null;
  d.img.remove();
  if (!d.moved) return;
  const target = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && x.classList.contains('sq'));
  if (target && target.dataset.sq !== d.from && tryMove(d.from, target.dataset.sq)) return;
  render();
}
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', e => { if (drag) { drag.img.remove(); drag = null; render(); } });

function canMove() { return game.turn() === playerColor && !game.isGameOver() && !busy && !pendingConfirm; }
function tryMove(from, to) {
  const legal = game.moves({ square: from, verbose: true }).filter(m => m.to === to);
  if (!legal.length) return false;
  if (legal.some(m => m.promotion)) { askPromotion(from, to); return true; }
  playerMove({ from, to });
  return true;
}
function askPromotion(from, to) {
  const row = $('promo-row'); row.innerHTML = '';
  for (const t of ['q', 'r', 'b', 'n']) {
    const b = document.createElement('button');
    b.innerHTML = `<img src="${pieceImg(playerColor, t)}" alt="${NAMES[t]}">`;
    b.onclick = () => { $('promo').hidden = true; playerMove({ from, to, promotion: t }); };
    row.appendChild(b);
  }
  $('promo').hidden = false;
}

// ---------- Coach messages ----------
function say(kind, tag, html, acts) {
  messages.unshift({ kind, tag, html, acts, id: Math.random() });
  messages = messages.slice(0, 6);
  renderMsgs();
}
function renderMsgs() {
  const el = $('msgs'); el.innerHTML = '';
  messages.forEach((m, i) => {
    const d = document.createElement('div');
    d.className = `msg ${m.kind}${i > 0 ? ' old' : ''}`;
    d.innerHTML = `<span class="tag">${m.tag}</span>${m.html}`;
    if (m.acts && i === 0) {
      const a = document.createElement('div'); a.className = 'acts';
      for (const [label, fn, primary] of m.acts) { const b = document.createElement('button'); b.className = 'btn' + (primary ? ' primary' : ''); b.textContent = label; b.onclick = fn; a.appendChild(b); }
      d.appendChild(a);
    }
    el.appendChild(d);
  });
}
const sqName = s => `<span class="san">${s}</span>`;
const sanTag = s => `<span class="san">${s}</span>`;

// ---------- Move explanation ----------
function hanging(ch, color) {
  // pieces of `color` that are attacked and either undefended or attacked by something cheaper
  const out = [];
  const them = color === 'w' ? 'b' : 'w';
  for (const row of ch.board()) for (const p of row) {
    if (!p || p.color !== color || p.type === 'k') continue;
    const att = ch.attackers(p.square, them);
    if (!att.length) continue;
    const def = ch.attackers(p.square, color);
    const cheapest = Math.min(...att.map(s => VALUE[ch.get(s).type]));
    if (!def.length || cheapest < VALUE[p.type]) out.push({ ...p, by: att.map(s => ({ sq: s, type: ch.get(s).type })).sort((a, b) => VALUE[a.type] - VALUE[b.type]) });
  }
  return out.sort((a, b) => VALUE[b.type] - VALUE[a.type]);
}
function explainMove(fen, mv) {
  const ch = new Chess(fen);
  const me = ch.turn(), them = me === 'w' ? 'b' : 'w';
  const before = hanging(ch, me);
  const moveObj = ch.move(mv);
  const why = [];
  const pName = NAMES[moveObj.piece];
  if (ch.isCheckmate()) return ['This is <b>checkmate</b>! The king has no escape.'];
  if (moveObj.isKingsideCastle() || moveObj.isQueensideCastle()) why.push('Castling tucks your king into safety and brings your rook into the game.');
  if (moveObj.captured) {
    const capVal = VALUE[moveObj.captured];
    const recapturable = ch.attackers(moveObj.to, them).length > 0;
    if (!recapturable) why.push(`It wins the ${NAMES[moveObj.captured]} on ${sqName(moveObj.to)} for free. Nobody can take back!`);
    else if (capVal > VALUE[moveObj.piece]) why.push(`It trades your ${pName} for their more valuable ${NAMES[moveObj.captured]}.`);
    else why.push(`It captures the ${NAMES[moveObj.captured]} on ${sqName(moveObj.to)}.`);
  }
  if (moveObj.promotion) why.push(`Your pawn becomes a ${NAMES[moveObj.promotion]}!`);
  const saved = before.find(p => p.square === moveObj.from);
  if (saved && !moveObj.captured) why.push(`Your ${NAMES[saved.type]} on ${sqName(saved.square)} was in danger, so this moves it somewhere safe.`);
  else if (before.length && !before.find(p => p.square === moveObj.from)) {
    const after = hanging(ch, me).map(p => p.square);
    const fixed = before.filter(p => !after.includes(p.square) && p.square !== moveObj.to);
    if (fixed.length && !moveObj.captured) why.push(`It protects your ${NAMES[fixed[0].type]} on ${sqName(fixed[0].square)}, which was in danger.`);
  }
  if (ch.inCheck()) why.push('It puts the enemy king in <b>check</b>.');
  // what does the moved piece attack now?
  const targets = [];
  for (const row of ch.board()) for (const p of row) {
    if (!p || p.color !== them || p.type === 'p' && moveObj.piece !== 'p') continue;
    if (ch.attackers(p.square, me).includes(moveObj.to)) {
      const defended = ch.attackers(p.square, them).length > 0;
      if (p.type === 'k' || !defended || VALUE[p.type] > VALUE[moveObj.piece]) targets.push(p);
    }
  }
  const realTargets = targets.filter(p => p.type !== 'k');
  if (realTargets.length + (ch.inCheck() ? 1 : 0) >= 2) why.push(`It's a <b>fork</b>: your ${pName} attacks two things at once (${[...(ch.inCheck() ? ['the king'] : []), ...realTargets.map(p => 'the ' + NAMES[p.type])].join(' and ')}).`);
  else if (realTargets.length) why.push(`It attacks the ${NAMES[realTargets[0].type]} on ${sqName(realTargets[0].square)}.`);
  const plies = fens.length;
  if (!why.length && plies < 24) {
    const backRank = me === 'w' ? '1' : '8';
    if ((moveObj.piece === 'n' || moveObj.piece === 'b') && moveObj.from[1] === backRank) why.push(`It develops your ${pName}. Getting knights and bishops off the back row early is one of the best opening habits.`);
    else if (moveObj.piece === 'p' && 'de'.includes(moveObj.to[0])) why.push('It grabs space in the center, where pieces are strongest.');
    else if (moveObj.piece === 'p' && 'cf'.includes(moveObj.to[0])) why.push('This pawn move fights for the center from the side.');
  }
  if (!why.length) why.push(`It improves your ${pName}'s position. The coach looked a few moves ahead and liked this one best.`);
  return why;
}
function ideaHint(fen, mv) {
  const ch = new Chess(fen);
  const me = ch.turn();
  const m = ch.move(mv);
  if (ch.isCheckmate()) return 'There is a checkmate on the board! Look at every check you can give.';
  if (m.captured && !ch.attackers(m.to, me === 'w' ? 'b' : 'w').length) return 'Something can be captured for free. Check what your pieces attack.';
  const danger = hanging(new Chess(fen), me);
  if (danger.find(p => p.square === m.from)) return `Your ${NAMES[m.piece]} is in danger. Where can it go to be safe?`;
  if (danger.length && !m.captured) return `Your ${NAMES[danger[0].type]} on ${sqName(danger[0].square)} is in danger. Can you protect it or move it?`;
  if (ch.inCheck()) return 'Look for a strong check.';
  if (m.isKingsideCastle() || m.isQueensideCastle()) return 'Is your king safe? Think about castling.';
  return `Think about what your ${NAMES[m.piece]} on ${sqName(m.from)} could do.`;
}

// ---------- Opening coaching ----------
let lastOpeningShown = null, lastBookState = true;
function renderOpening() {
  const cur = currentOpening();
  const strip = $('opening-strip');
  const card = $('opening-card');
  if (!cur) {
    strip.innerHTML = `<span class="opening-name none">${fens.length === 1 ? 'Starting position. Make your first move!' : 'Unnamed opening'}</span>`;
  } else {
    strip.innerHTML = `<span class="eco">${cur.o.eco}</span><span class="opening-name">${cur.o.name}</span>`;
  }
  const inBook = fens.length === 1 || inBookPly(fens.length - 1);
  const bm = !game.isGameOver() ? bookMoves() : [];
  let html = '';
  if (cur) {
    const { fam, info, general } = coachFor(cur.o);
    const theyChose = info ? info.o !== playerColor : false;
    html += `<div class="ocard"><span class="eyebrow">${inBook ? 'You are in the opening book' : `Left the book after move ${Math.ceil(cur.ply / 2)}`}</span><h3>${fam}</h3>`;
    html += `<dl><dt>What is it?</dt><dd>${info ? info.s : general.s}</dd>`;
    if (info) {
      html += `<dt>Your plan as ${playerColor === 'w' ? 'White' : 'Black'}</dt><dd>${playerColor === 'w' ? info.w : info.b}</dd>`;
      html += theyChose ? `<dt>How to beat it</dt><dd class="counter">${info.c}</dd>` : `<dt>What your opponent will try</dt><dd>${playerColor === 'w' ? info.b : info.w}</dd>`;
      html += `<dt>Coach's tip</dt><dd>${info.t}</dd>`;
    } else html += `<dt>How to play it</dt><dd class="counter">${general.c}</dd>`;
    html += '</dl></div>';
  } else if (fens.length === 1) {
    html += `<div class="ocard"><span class="eyebrow">Opening rules of thumb</span><dl><dd>1. Take the center with a pawn (e4 or d4).</dd><dd>2. Bring out knights and bishops before moving the queen.</dd><dd>3. Castle early to keep your king safe.</dd><dd>4. Don't move the same piece twice without a good reason.</dd></dl></div>`;
  }
  if (bm.length && game.turn() === playerColor) {
    html += `<div class="ocard"><span class="eyebrow">Known moves from here</span><p class="small muted" style="margin:0">Tap one to see it on the board. The first ones are the most popular.</p><div class="book">`;
    html += bm.slice(0, 8).map((b, i) => `<button data-bk="${i}"><span class="san">${b.m.san}</span><span class="bn">${b.o.name.replace(/^[^:]*: ?/, '') || b.o.name}</span></button>`).join('');
    html += '</div></div>';
  }
  card.innerHTML = html;
  card.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => {
    const x = bm[+b.dataset.bk];
    previewArrow = { from: x.m.from, to: x.m.to, color: 'gold' };
    drawArrows();
  });
  // Announce new openings and leaving book
  if (cur && cur.o !== lastOpeningShown && cur.ply === fens.length - 1) {
    const { fam, info } = coachFor(cur.o);
    const prevFam = lastOpeningShown ? familyOf(lastOpeningShown.name) : null;
    if (prevFam !== fam) {
      const by = info ? (info.o === playerColor ? 'You chose' : 'Your opponent chose') : 'This is';
      say('open', 'Opening', `<p>${by} the <b>${fam}</b>${cur.o.name !== fam ? ` (${cur.o.name.replace(/^[^:]*: ?/, '')})` : ''}.</p><p>${info ? (info.o !== playerColor ? info.c : (playerColor === 'w' ? info.w : info.b)) : coachFor(cur.o).general.c}</p>`);
    }
    lastOpeningShown = cur.o;
  }
  if (!inBook && lastBookState && cur) say('open', 'Out of book', `<p>You're past the known opening moves now. Time to think for yourself: keep developing, castle, and look for what each move attacks.</p>`);
  lastBookState = inBook;
}

function renderSheet() {
  const hist = game.history();
  const el = $('sheet');
  let html = '';
  for (let i = 0; i < hist.length; i += 2) {
    html += `<div class="n">${i / 2 + 1}.</div>`;
    for (const j of [i, i + 1]) {
      if (j >= hist.length) { html += '<div></div>'; continue; }
      const cls = [inBookPly(j + 1) ? 'bk' : '', j === hist.length - 1 ? 'cur' : ''].join(' ');
      html += `<div class="${cls}">${hist[j]}</div>`;
    }
  }
  el.innerHTML = html || '<div class="n">1.</div><div class="muted">…</div><div></div>';
  el.scrollTop = el.scrollHeight;
}

// ---------- Game flow ----------
function afterChange() {
  token++;
  selected = null; hintStage = 0; hintData = null; hintSquare = null; previewArrow = null;
  render(); renderSheet(); renderOpening(); save();
  checkGameOver();
}
function checkGameOver() {
  if (!game.isGameOver() || gameOverShown) return;
  gameOverShown = true;
  const again = [['Play again', () => newGame(), true]];
  if (game.isCheckmate()) {
    if (game.turn() !== playerColor) say('good', 'You won!', `<p>Checkmate! Brilliant work. Try the next level up when you're ready.</p>`, again);
    else say('bad', 'Game over', `<p>Checkmated this time. Take back a few moves to see where it went wrong, or start a new game.</p>`, [['Take back', undo], ...again]);
  } else say('info', 'Draw', `<p>The game is a draw${game.isStalemate() ? ' by stalemate: the side to move has no legal moves but isn\'t in check' : ''}.</p>`, again);
}
function startPreAnalysis() {
  const fen = game.fen();
  if (!pre.has(fen)) pre.set(fen, think(fen, { timeMs: 700, depth: 8, prevFens: fens.slice(-12, -1) }));
  return pre.get(fen);
}
async function playerMove(m) {
  const fenBefore = game.fen();
  const analysis = pre.get(fenBefore);
  let mv;
  try { mv = game.move(m); } catch (e) { return; }
  fens.push(game.fen());
  afterChange();
  const myTok = token;
  if (game.isGameOver()) return;
  if (opt('opt-warn') && analysis) {
    busy = true; renderStatus();
    const [a, b] = await Promise.all([analysis, think(game.fen(), { timeMs: 600, depth: 8, prevFens: fens.slice(-12, -1) })]);
    busy = false;
    if (myTok !== token) return;
    if (a && b) {
      const best = a.bestScore, mine = -b.bestScore;
      lastScore = playerColor === 'w' ? mine : -mine; renderEval();
      const drop = best - mine;
      const big = mine < -MATE + 200 ? 'mate' : (drop >= 280 && mine < 400) ? 'big' : (drop >= 150 && mine < 250) ? 'small' : null;
      if (big) {
        const ch = new Chess(game.fen());
        const f = b.best.slice(0, 2), t = b.best.slice(2, 4);
        let reply; try { reply = ch.move({ from: f, to: t, promotion: b.best[4] || 'q' }); } catch (e) {}
        let why = '';
        if (big === 'mate') why = reply ? `Your opponent could answer ${sanTag(reply.san)} and that leads to checkmate.` : 'This lets your opponent checkmate you.';
        else if (reply && reply.captured) why = `Your opponent could reply ${sanTag(reply.san)} and take your ${NAMES[reply.captured]}.`;
        else if (reply) why = `Your opponent has a strong reply: ${sanTag(reply.san)}. Can you see why it hurts?`;
        previewArrow = reply ? { from: reply.from, to: reply.to, color: 'red' } : null;
        drawArrows();
        pendingConfirm = true; renderStatus();
        const tag = big === 'small' ? 'Careful' : 'Wait a second!';
        say(big === 'small' ? 'warn' : 'bad', tag, `<p>${sanTag(mv.san)} might be a mistake. ${why}</p>`, [
          ['Take it back', () => { pendingConfirm = null; undoOne(); say('info', 'Try again', `<p>Good choice. Look for a safer move. You can press <b>Hint</b> if you're stuck.</p>`); }, true],
          ['Keep my move', () => { pendingConfirm = null; previewArrow = null; drawArrows(); messages[0].acts = null; renderMsgs(); aiMove(); }],
        ]);
        return;
      }
      if (a.best === mv.from + mv.to + (mv.promotion || '') && Math.random() < .55 && fens.length > 4) say('good', 'Nice move', `<p>${sanTag(mv.san)} is exactly what the coach would have played!</p>`);
    }
  }
  aiMove();
}
async function aiMove() {
  if (game.isGameOver() || game.turn() === playerColor) return;
  busy = true; renderStatus();
  const myTok = token;
  const L = LEVELS[level];
  const started = Date.now();
  let choice = null;
  const bm = fens.length - 1 < L.book ? bookMoves() : [];
  if (bm.length && Math.random() < L.bookProb) {
    const pow = level >= 4 ? 1.6 : level === 3 ? 1 : .5;
    const weights = bm.map(b => Math.pow(b.w, pow));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < bm.length; i++) { r -= weights[i]; if (r <= 0) { choice = bm[i].m; break; } }
    choice = choice || bm[0].m;
  }
  if (!choice) {
    const res = await think(game.fen(), { ...L.opts, prevFens: fens.slice(-12, -1) });
    if (myTok !== token) return;
    if (res && res.move) {
      choice = { from: res.move.slice(0, 2), to: res.move.slice(2, 4), promotion: res.move[4] };
      if (level >= 3) lastScore = game.turn() === 'w' ? res.bestScore : -res.bestScore;
    } else {
      const ms = game.moves({ verbose: true }); choice = ms[Math.floor(Math.random() * ms.length)];
    }
  }
  const wait = L.delay - (Date.now() - started);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (myTok !== token) return;
  game.move({ from: choice.from, to: choice.to, promotion: choice.promotion });
  fens.push(game.fen());
  busy = false;
  afterChange();
  if (!game.isGameOver()) { startPreAnalysis().then(r => { if (r && fens[fens.length - 1] === game.fen()) { lastScore = playerColor === 'w' ? r.bestScore : -r.bestScore; renderEval(); } }); threatCheck(false); }
}
function threatCheck(manual) {
  if (!manual && !opt('opt-threat')) return;
  const me = playerColor, them = me === 'w' ? 'b' : 'w';
  const notes = [];
  const lastMv = game.history({ verbose: true }).slice(-1)[0];
  if (game.inCheck()) notes.push('You\'re in <b>check</b>! You must move your king, block the check, or capture the piece giving check.');
  else {
    // mate threat: what if the opponent could move again right now?
    const parts = game.fen().split(' '); parts[1] = them; parts[3] = '-';
    try {
      const ch = new Chess(parts.join(' '));
      const mate = ch.moves({ verbose: true }).find(m => { ch.move(m.san); const r = ch.isCheckmate(); ch.undo(); return r; });
      if (mate) notes.push(`Danger! Your opponent is threatening <b>checkmate</b> with ${sanTag(mate.san)}. Stop it now!`);
    } catch (e) {}
  }
  const h = hanging(game, me);
  if (h.length) {
    const p = h[0];
    notes.push(`Your ${NAMES[p.type]} on ${sqName(p.square)} is under attack by the ${NAMES[p.by[0].type]} on ${sqName(p.by[0].sq)}${game.attackers(p.square, me).length ? ' and it isn\'t safe even though it\'s protected' : ' and nothing protects it'}.`);
  }
  const html = notes.map(n => `<p>${n}</p>`).join('');
  if (notes.length && (manual || html !== lastThreat)) say('warn', 'Watch out', html);
  lastThreat = html;
  if (notes.length) return;
  if (manual) {
    let plan = '';
    if (lastMv) {
      const ch = new Chess(fens[fens.length - 2]);
      const e = explainMove(fens[fens.length - 2], lastMv.san);
      plan = `<p>Their last move ${sanTag(lastMv.san)}: ${e[0].charAt(0).toLowerCase() + e[0].slice(1)}</p>`;
    }
    say('info', 'Scouting report', `${plan}<p>No direct threats right now. Your pieces are safe. Look for a move that improves your worst piece.</p>`);
  }
}
async function hint() {
  if (!canMove()) return;
  const fen = game.fen(), myTok = token;
  if (!hintData || hintData.fen !== fen) {
    $('hint-btn').textContent = 'Thinking…'; $('hint-btn').disabled = true;
    const res = await think(fen, { timeMs: 1300, depth: 12, prevFens: fens.slice(-12, -1) });
    $('hint-btn').textContent = 'Hint';
    if (myTok !== token || !res || !res.best) { renderStatus(); return; }
    const ch = new Chess(fen);
    const move = ch.move({ from: res.best.slice(0, 2), to: res.best.slice(2, 4), promotion: res.best[4] || undefined });
    hintData = { fen, move, score: res.bestScore };
    lastScore = playerColor === 'w' ? res.bestScore : -res.bestScore; renderEval();
  }
  hintStage = Math.min(2, hintStage + 1);
  const bk = bookMoves().find(b => b.m.san === hintData.move.san);
  if (hintStage === 1) {
    hintSquare = hintData.move.from;
    say('hint', 'Hint 1 of 2', `<p>${ideaHint(fen, hintData.move.san)}</p><p class="small muted">Press Hint again to see the exact move.</p>`);
    $('hint-btn').textContent = 'Show the move';
  } else {
    hintSquare = null;
    const why = explainMove(fen, hintData.move.san);
    const book = bk ? `<p class="small">This is also a known opening move: <b>${bk.o.name}</b>.</p>` : '';
    say('hint', 'Coach suggests', `<p>Play ${sanTag(hintData.move.san)}. ${why.join(' ')}</p>${book}`);
    $('hint-btn').textContent = 'Hint';
  }
  render();
  $('hint-btn').disabled = false;
}
function undoOne() { if (!game.history().length) return; game.undo(); fens.pop(); gameOverShown = false; afterChange(); }
function undo() {
  if (!game.history().length) return;
  pendingConfirm = null; busy = false;
  undoOne();
  if (game.turn() !== playerColor && game.history().length) undoOne();
  if (game.turn() !== playerColor) { aiMove(); return; }
  startPreAnalysis();
  messages.forEach(m => m.acts = null); renderMsgs();
}
function newGame(moves = [], color = playerColor) {
  token++; busy = false; pendingConfirm = null; gameOverShown = false;
  playerColor = color; flipped = color === 'b';
  setColorButtons();
  game = new Chess(); fens = [game.fen()];
  for (const m of moves) { game.move(m); fens.push(game.fen()); }
  lastScore = 0; lastOpeningShown = null; lastBookState = true;
  messages = [];
  say('info', 'New game', `<p>You're playing <b>${color === 'w' ? 'White' : 'Black'}</b> against the <b>${$('level').selectedOptions[0].text.split(' ·')[0]}</b> coach. ${color === 'w' ? 'You move first.' : 'The coach moves first.'}</p><p class="small">Stuck? Press <b>Hint</b>. Made a mistake? Press <b>Take back</b>.</p>`);
  afterChange();
  if (game.turn() !== playerColor) aiMove(); else startPreAnalysis();
}
function setColorButtons() { $('col-w').setAttribute('aria-pressed', playerColor === 'w'); $('col-b').setAttribute('aria-pressed', playerColor === 'b'); }

$('new-game').onclick = () => newGame([], playerColor);
$('col-w').onclick = () => { playerColor = 'w'; setColorButtons(); };
$('col-b').onclick = () => { playerColor = 'b'; setColorButtons(); };
$('level').onchange = () => { level = +$('level').value; save(); };
$('hint-btn').onclick = hint;
$('undo-btn').onclick = undo;
$('flip-btn').onclick = () => { flipped = !flipped; render(); save(); };
$('threat-btn').onclick = () => threatCheck(true);
for (const id of ['opt-warn', 'opt-threat', 'opt-eval']) $(id).onchange = () => { renderEval(); save(); };

// ---------- Tabs ----------
const TABS = [['tab-coach', 'pane-coach'], ['tab-lib', 'pane-lib'], ['tab-quiz', 'pane-quiz']];
function showTab(id) {
  for (const [t, p] of TABS) { $(t).setAttribute('aria-selected', t === id); $(p).hidden = t !== id; }
  if (id === 'tab-quiz' && !quiz) nextQuiz();
  try { localStorage.setItem('knight-school-tab', id); } catch (e) {}
}
for (const [t] of TABS) $(t).onclick = () => showTab(t);

// ---------- Library ----------
const POPULAR = ['Sicilian Defense', 'Ruy Lopez', 'Italian Game', 'French Defense', 'Caro-Kann Defense', "Queen's Gambit", 'London System', "King's Indian Defense", 'Scandinavian Defense', 'English Opening', "King's Gambit", 'Fried Liver'];
$('lib-chips').innerHTML = POPULAR.map(p => `<button>${p}</button>`).join('');
$('lib-chips').querySelectorAll('button').forEach(b => b.onclick = () => { $('lib-search').value = b.textContent; searchLib(); });
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const SEARCH_IDX = OPENINGS.map(o => norm(o.eco + ' ' + o.name + ' ' + o.moves));
let libSel = null;
function searchLib() {
  const q = norm($('lib-search').value.trim());
  const words = q.split(/\s+/).filter(Boolean);
  let list = OPENINGS.map((o, i) => [o, i]).filter(([o, i]) => words.every(w => SEARCH_IDX[i].includes(w)));
  list.sort((a, b) => a[0].moves.length - b[0].moves.length);
  const shown = list.slice(0, 80);
  $('lib-results').innerHTML = shown.map(([o, i]) => `<button data-i="${i}"${libSel === i ? ' aria-current="true"' : ''}><span class="e">${o.eco}</span><span class="nm">${o.name}</span></button>`).join('') + (list.length > shown.length ? `<p class="small muted" style="margin:8px 10px">Showing the first ${shown.length} of ${list.length}. Type more to narrow it down.</p>` : '') + (!list.length ? '<p class="small muted" style="margin:8px 10px">No openings match. Try a shorter word.</p>' : '');
  $('lib-results').querySelectorAll('button').forEach(b => b.onclick = () => showLib(+b.dataset.i));
}
function showLib(i) {
  libSel = i;
  const o = OPENINGS[i];
  const { fam, info, general } = coachFor(o);
  const moves = o.moves.split(' ');
  const pretty = moves.map((m, k) => (k % 2 === 0 ? `${k / 2 + 1}.` : '') + m).join(' ');
  $('lib-detail').innerHTML = `<div class="ocard"><span class="eyebrow">${o.eco} · ${fam}</span><h3>${o.name}</h3><div class="moves">${pretty}</div>
    <dl><dt>What is it?</dt><dd>${info ? info.s : general.s}</dd>
    ${info ? `<dt>White's plan</dt><dd>${info.w}</dd><dt>Black's plan</dt><dd>${info.b}</dd><dt>How to counter it</dt><dd class="counter">${info.c}</dd><dt>Coach's tip</dt><dd>${info.t}</dd>` : `<dt>How to play it</dt><dd class="counter">${general.c}</dd>`}</dl>
    <div class="controls"><button class="btn primary" id="lib-pw">Practice as White</button><button class="btn" id="lib-pb">Practice as Black</button></div></div>`;
  $('lib-pw').onclick = () => { newGame(moves, 'w'); showTab('tab-coach'); };
  $('lib-pb').onclick = () => { newGame(moves, 'b'); showTab('tab-coach'); };
  $('lib-results').querySelectorAll('button').forEach(b => b.setAttribute('aria-current', +b.dataset.i === i));
}
$('lib-search').addEventListener('input', searchLib);

// ---------- Quiz ----------
const QUIZ_POOL = OPENINGS.filter(o => { const n = o.moves.split(' ').length; return n >= 2 && n <= 9 && COACH[familyOf(o.name)]; });
const QUIZ_FAMS = [...new Set(QUIZ_POOL.map(o => familyOf(o.name)))];
const FAM_COUNT = {}; for (const o of QUIZ_POOL) { const f = familyOf(o.name); FAM_COUNT[f] = (FAM_COUNT[f] || 0) + 1; }
let quiz = null, qs = { right: 0, total: 0, streak: 0 };
function weightedFamily() {
  const fams = QUIZ_FAMS.filter(f => FAM_COUNT[f] >= 8);
  return fams[Math.floor(Math.random() * fams.length)];
}
function nextQuiz() {
  const fam = weightedFamily();
  const pool = QUIZ_POOL.filter(o => familyOf(o.name) === fam);
  const o = pool[Math.floor(Math.random() * pool.length)];
  const others = new Set();
  const famList = QUIZ_FAMS.filter(f => f !== fam && FAM_COUNT[f] >= 4);
  while (others.size < 3) others.add(famList[Math.floor(Math.random() * famList.length)]);
  const choices = [fam, ...others].sort(() => Math.random() - .5);
  quiz = { o, fam, choices, answered: false };
  const ch = new Chess(); for (const m of o.moves.split(' ')) ch.move(m);
  const mini = $('q-board'); mini.innerHTML = '';
  for (const row of ch.board()) for (let c = 0; c < 8; c++) {
    const p = row[c]; const d = document.createElement('div');
    const r = 8 - ch.board().indexOf(row);
    d.style.background = (c + r) % 2 === 1 ? 'var(--sq-light)' : 'var(--sq-dark)';
    if (p) d.innerHTML = `<img src="${pieceImg(p.color, p.type)}" alt="">`;
    mini.appendChild(d);
  }
  const ms = o.moves.split(' ');
  $('q-moves').textContent = ms.map((m, k) => (k % 2 === 0 ? `${k / 2 + 1}.` : '') + m).join(' ');
  $('q-choices').innerHTML = choices.map(c => `<button>${c}</button>`).join('');
  $('q-choices').querySelectorAll('button').forEach(b => b.onclick = () => answerQuiz(b));
  $('q-feedback').innerHTML = '';
}
function answerQuiz(btn) {
  if (quiz.answered) return;
  quiz.answered = true;
  const ok = btn.textContent === quiz.fam;
  qs.total++; if (ok) { qs.right++; qs.streak++; } else qs.streak = 0;
  $('q-right').textContent = qs.right; $('q-total').textContent = qs.total; $('q-streak').textContent = qs.streak;
  $('q-choices').querySelectorAll('button').forEach(b => { if (b.textContent === quiz.fam) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); });
  const info = COACH[quiz.fam];
  $('q-feedback').innerHTML = `<div class="msg ${ok ? 'good' : 'bad'}"><span class="tag">${ok ? 'Correct!' : 'Not quite'}</span><p>This is the <b>${quiz.o.name}</b> (${quiz.o.eco}).</p><p>${info.s}</p></div>`;
}
$('q-next').onclick = nextQuiz;

// ---------- Boot ----------
const restored = restore();
level = +level; $('level').value = String(level); setColorButtons();
if (restored && game.history().length) {
  say('info', 'Welcome back', `<p>Your last game is still here. Keep playing, or press <b>New game</b> for a fresh start.</p>`);
  afterChange();
  if (game.turn() !== playerColor) aiMove(); else startPreAnalysis();
} else {
  flipped = playerColor === 'b';
  messages = [];
  say('info', 'Hi! I\'m your chess coach', `<p>Play against me on the board. I know <b>${OPENINGS.length.toLocaleString()} openings</b> and I'll tell you the name of each one as it happens, plus how to beat it.</p><p class="small">Press <b>Hint</b> any time you're stuck. Try the <b>Quiz</b> tab to practice spotting openings.</p>`);
  afterChange();
  if (game.turn() !== playerColor) aiMove(); else startPreAnalysis();
}
searchLib();
try { const t = localStorage.getItem('knight-school-tab'); if (t && $(t)) showTab(t); } catch (e) {}

// ---------- Environment banner (dev only) ----------
fetch('/api/health').then(r => r.json()).then(({ environment }) => {
  if (environment && environment !== 'production') {
    const b = $('env-banner');
    b.innerHTML = `<span>${environment} environment</span>`;
    b.hidden = false;
    document.title = `[${environment}] ${document.title}`;
  }
}).catch(() => {});
