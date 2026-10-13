function createEngine() {
  // 0x88 board. Square 0 = a8, 0x77 = h1. Pieces: type 1..6 (P N B R Q K) | color (8 white, 16 black).
  const WHITE = 8, BLACK = 16, P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  const board = new Int8Array(128);
  let side = WHITE, castle = 0, ep = -1, half = 0, hash = 0;
  const kingSq = { 8: 0, 16: 0 };
  const VAL = [0, 100, 320, 330, 500, 900, 0];
  const N_OFF = [-33, -31, -18, -14, 14, 18, 31, 33];
  const B_OFF = [-17, -15, 15, 17];
  const R_OFF = [-16, -1, 1, 16];
  const K_OFF = [-17, -16, -15, -1, 1, 15, 16, 17];
  // Piece-square tables, from white's view, index by 64-square (a8=0).
  const PST = [
    null,
    [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  ];
  const KING_END = [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];
  const sq64 = s => (s >> 4) * 8 + (s & 7);
  // Zobrist
  let seed = 1234567;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
  const Z = []; for (let i = 0; i < 32 * 128; i++) Z.push(rnd());
  const ZSIDE = rnd(), ZC = [], ZEP = [];
  for (let i = 0; i < 16; i++) ZC.push(rnd());
  for (let i = 0; i < 128; i++) ZEP.push(rnd());
  const zp = (pc, s) => Z[pc * 128 + s];

  function computeHash() {
    let h = 0;
    for (let s = 0; s < 128; s++) if (!(s & 0x88) && board[s]) h ^= zp(board[s], s);
    if (side === BLACK) h ^= ZSIDE;
    h ^= ZC[castle];
    if (ep >= 0) h ^= ZEP[ep];
    return h >>> 0;
  }

  function load(fen) {
    board.fill(0);
    const [pos, stm, cas, eps, hm] = fen.split(' ');
    let r = 0, f = 0;
    for (const ch of pos) {
      if (ch === '/') { r++; f = 0; continue; }
      if (ch >= '1' && ch <= '8') { f += +ch; continue; }
      const lower = ch.toLowerCase();
      const t = 'pnbrqk'.indexOf(lower) + 1;
      const c = ch === lower ? BLACK : WHITE;
      const s = r * 16 + f;
      board[s] = t | c;
      if (t === K) kingSq[c] = s;
      f++;
    }
    side = stm === 'w' ? WHITE : BLACK;
    castle = 0;
    if (cas && cas.includes('K')) castle |= 1;
    if (cas && cas.includes('Q')) castle |= 2;
    if (cas && cas.includes('k')) castle |= 4;
    if (cas && cas.includes('q')) castle |= 8;
    ep = (eps && eps !== '-') ? (8 - +eps[1]) * 16 + (eps.charCodeAt(0) - 97) : -1;
    half = +(hm || 0);
    hash = computeHash();
  }

  function attacked(s, by) {
    // pawns
    if (by === WHITE) {
      if (!((s + 15) & 0x88) && board[s + 15] === (WHITE | P)) return true;
      if (!((s + 17) & 0x88) && board[s + 17] === (WHITE | P)) return true;
    } else {
      if (!((s - 15) & 0x88) && board[s - 15] === (BLACK | P)) return true;
      if (!((s - 17) & 0x88) && board[s - 17] === (BLACK | P)) return true;
    }
    for (const o of N_OFF) { const t = s + o; if (!(t & 0x88) && board[t] === (by | N)) return true; }
    for (const o of K_OFF) { const t = s + o; if (!(t & 0x88) && board[t] === (by | K)) return true; }
    for (const o of B_OFF) {
      let t = s + o;
      while (!(t & 0x88)) { const pc = board[t]; if (pc) { if ((pc & by) && ((pc & 7) === B || (pc & 7) === Q)) return true; break; } t += o; }
    }
    for (const o of R_OFF) {
      let t = s + o;
      while (!(t & 0x88)) { const pc = board[t]; if (pc) { if ((pc & by) && ((pc & 7) === R || (pc & 7) === Q)) return true; break; } t += o; }
    }
    return false;
  }
  const inCheck = c => attacked(kingSq[c], c ^ 24);

  // move: from | to<<7 | promo<<14 | flag<<17 ; flags: 1 ep, 2 castle, 4 double
  const mv = (f, t, pr, fl) => f | (t << 7) | (pr << 14) | (fl << 17);
  function gen(list, capsOnly) {
    const us = side, them = side ^ 24;
    const dir = us === WHITE ? -16 : 16;
    const startRank = us === WHITE ? 6 : 1, promoRank = us === WHITE ? 0 : 7;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const pc = board[s];
      if (!pc || !(pc & us)) continue;
      const t = pc & 7;
      if (t === P) {
        const one = s + dir;
        if (!capsOnly || (one >> 4) === promoRank) {
          if (!(one & 0x88) && !board[one]) {
            if ((one >> 4) === promoRank) { for (const pr of [Q, R, B, N]) list.push(mv(s, one, pr, 0)); }
            else {
              list.push(mv(s, one, 0, 0));
              const two = one + dir;
              if ((s >> 4) === startRank && !board[two]) list.push(mv(s, two, 0, 4));
            }
          }
        }
        for (const o of [dir - 1, dir + 1]) {
          const c = s + o;
          if (c & 0x88) continue;
          if (board[c] && (board[c] & them)) {
            if ((c >> 4) === promoRank) { for (const pr of [Q, R, B, N]) list.push(mv(s, c, pr, 0)); }
            else list.push(mv(s, c, 0, 0));
          } else if (c === ep) list.push(mv(s, c, 0, 1));
        }
      } else if (t === N || t === K) {
        for (const o of (t === N ? N_OFF : K_OFF)) {
          const c = s + o;
          if (c & 0x88) continue;
          const q = board[c];
          if (q & us) continue;
          if (capsOnly && !q) continue;
          list.push(mv(s, c, 0, 0));
        }
        if (t === K && !capsOnly) {
          if (us === WHITE && s === 0x74) {
            if ((castle & 1) && !board[0x75] && !board[0x76] && !attacked(0x74, them) && !attacked(0x75, them) && !attacked(0x76, them)) list.push(mv(s, 0x76, 0, 2));
            if ((castle & 2) && !board[0x73] && !board[0x72] && !board[0x71] && !attacked(0x74, them) && !attacked(0x73, them) && !attacked(0x72, them)) list.push(mv(s, 0x72, 0, 2));
          } else if (us === BLACK && s === 0x04) {
            if ((castle & 4) && !board[0x05] && !board[0x06] && !attacked(0x04, them) && !attacked(0x05, them) && !attacked(0x06, them)) list.push(mv(s, 0x06, 0, 2));
            if ((castle & 8) && !board[0x03] && !board[0x02] && !board[0x01] && !attacked(0x04, them) && !attacked(0x03, them) && !attacked(0x02, them)) list.push(mv(s, 0x02, 0, 2));
          }
        }
      } else {
        const offs = t === B ? B_OFF : t === R ? R_OFF : K_OFF;
        for (const o of offs) {
          let c = s + o;
          while (!(c & 0x88)) {
            const q = board[c];
            if (q) { if (q & them) list.push(mv(s, c, 0, 0)); break; }
            if (!capsOnly) list.push(mv(s, c, 0, 0));
            c += o;
          }
        }
      }
    }
  }

  const CASTLE_MASK = new Uint8Array(128).fill(15);
  CASTLE_MASK[0x74] = 15 & ~3; CASTLE_MASK[0x77] = 15 & ~1; CASTLE_MASK[0x70] = 15 & ~2;
  CASTLE_MASK[0x04] = 15 & ~12; CASTLE_MASK[0x07] = 15 & ~4; CASTLE_MASK[0x00] = 15 & ~8;

  const stack = [];
  function make(m) {
    const f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17;
    const pc = board[f], us = side;
    let cap = board[t], capSq = t;
    if (fl & 1) { capSq = t + (us === WHITE ? 16 : -16); cap = board[capSq]; }
    stack.push([m, cap, castle, ep, half, hash]);
    let h = hash;
    h ^= ZC[castle]; if (ep >= 0) h ^= ZEP[ep];
    if (cap) { h ^= zp(cap, capSq); board[capSq] = 0; }
    h ^= zp(pc, f);
    board[f] = 0;
    const np = pr ? (pr | us) : pc;
    board[t] = np; h ^= zp(np, t);
    if ((pc & 7) === K) kingSq[us] = t;
    if (fl & 2) {
      let rf, rt;
      if (t === 0x76) { rf = 0x77; rt = 0x75; } else if (t === 0x72) { rf = 0x70; rt = 0x73; }
      else if (t === 0x06) { rf = 0x07; rt = 0x05; } else { rf = 0x00; rt = 0x03; }
      const rk = board[rf]; board[rf] = 0; board[rt] = rk; h ^= zp(rk, rf) ^ zp(rk, rt);
    }
    castle &= CASTLE_MASK[f] & CASTLE_MASK[t];
    ep = (fl & 4) ? (f + t) >> 1 : -1;
    half = (cap || (pc & 7) === P) ? 0 : half + 1;
    h ^= ZC[castle]; if (ep >= 0) h ^= ZEP[ep];
    h ^= ZSIDE;
    side ^= 24;
    hash = h >>> 0;
    if (inCheck(us)) { unmake(); return false; }
    return true;
  }
  function unmake() {
    const [m, cap, c, e, hm, h] = stack.pop();
    const f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17;
    side ^= 24;
    const us = side;
    const pc = pr ? (P | us) : board[t];
    board[f] = pc; board[t] = 0;
    if ((pc & 7) === K) kingSq[us] = f;
    if (fl & 1) board[t + (us === WHITE ? 16 : -16)] = cap;
    else board[t] = cap;
    if (fl & 2) {
      let rf, rt;
      if (t === 0x76) { rf = 0x77; rt = 0x75; } else if (t === 0x72) { rf = 0x70; rt = 0x73; }
      else if (t === 0x06) { rf = 0x07; rt = 0x05; } else { rf = 0x00; rt = 0x03; }
      board[rf] = board[rt]; board[rt] = 0;
    }
    castle = c; ep = e; half = hm; hash = h;
  }

  function evaluate() {
    let mg = 0, nonPawn = 0;
    let wk = 0, bk = 0;
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const pc = board[s];
      if (!pc) continue;
      const t = pc & 7;
      if (t !== P && t !== K) nonPawn += VAL[t];
      if (t === K) { if (pc & WHITE) wk = s; else bk = s; continue; }
      const i = sq64(s);
      if (pc & WHITE) mg += VAL[t] + PST[t][i];
      else mg -= VAL[t] + PST[t][(7 - (i >> 3)) * 8 + (i & 7)];
    }
    const endgame = nonPawn <= 2600;
    const wi = sq64(wk), bi = sq64(bk), bim = (7 - (bi >> 3)) * 8 + (bi & 7);
    if (endgame) mg += KING_END[wi] - KING_END[bim];
    else mg += PST[K][wi] - PST[K][bim];
    return side === WHITE ? mg : -mg;
  }

  const MATE = 100000;
  let nodes = 0, deadline = 0, stopped = false;
  const TT = new Map();
  let killers = [];
  let history = new Int32Array(64 * 128);
  let repHashes = [];

  function score(m, ttMove, ply) {
    if (m === ttMove) return 1e7;
    const t = (m >> 7) & 127, f = m & 127;
    const cap = board[t];
    if (cap) return 1e6 + VAL[cap & 7] * 10 - VAL[board[f] & 7] / 10;
    if ((m >> 14) & 7) return 9e5;
    if (killers[ply] && (killers[ply][0] === m || killers[ply][1] === m)) return 8e5;
    return history[(board[f] & 31) * 128 + t];
  }
  function order(list, ttMove, ply) {
    const sc = list.map(m => score(m, ttMove, ply));
    const idx = list.map((_, i) => i).sort((a, b) => sc[b] - sc[a]);
    return idx.map(i => list[i]);
  }

  function quiesce(alpha, beta, ply) {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) { stopped = true; }
    if (stopped) return 0;
    const stand = evaluate();
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (ply > 60) return stand;
    const list = []; gen(list, true);
    for (const m of order(list, 0, ply)) {
      if (!make(m)) continue;
      const v = -quiesce(-beta, -alpha, ply + 1);
      unmake();
      if (stopped) return 0;
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }

  function isRepetition() {
    for (let i = stack.length - 2; i >= 0 && i >= stack.length - half; i -= 2) if (stack[i][5] === hash) return true;
    if (stack.length < 2 || true) { for (const h of repHashes) if (h === hash) return true; }
    return false;
  }

  function search(depth, alpha, beta, ply) {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) stopped = true;
    if (stopped) return 0;
    if (ply > 0 && (half >= 100 || isRepetition())) return 0;
    const check = inCheck(side);
    if (check) depth++;
    if (depth <= 0) return quiesce(alpha, beta, ply);
    const tt = TT.get(hash);
    let ttMove = 0;
    if (tt) {
      ttMove = tt.m;
      if (ply > 0 && tt.d >= depth) {
        if (tt.f === 0) return tt.v;
        if (tt.f === 1 && tt.v >= beta) return tt.v;
        if (tt.f === 2 && tt.v <= alpha) return tt.v;
      }
    }
    // null move pruning
    if (!check && ply > 0 && depth >= 3 && evaluate() >= beta) {
      let nonPawn = 0;
      for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const pc = board[s]; if (pc && (pc & side) && (pc & 7) > 1 && (pc & 7) < 6) nonPawn++; }
      if (nonPawn > 0) {
        const saveEp = ep, saveH = hash;
        if (ep >= 0) hash ^= ZEP[ep];
        ep = -1; side ^= 24; hash = (hash ^ ZSIDE) >>> 0;
        stack.push([0, 0, castle, saveEp, half, saveH]);
        const v = -search(depth - 3, -beta, -beta + 1, ply + 1);
        stack.pop(); side ^= 24; ep = saveEp; hash = saveH;
        if (stopped) return 0;
        if (v >= beta) return beta;
      }
    }
    const list = []; gen(list, false);
    let best = -MATE - 1, bestMove = 0, legal = 0;
    const a0 = alpha;
    for (const m of order(list, ttMove, ply)) {
      if (!make(m)) continue;
      legal++;
      let v;
      if (legal === 1) v = -search(depth - 1, -beta, -alpha, ply + 1);
      else {
        v = -search(depth - 1, -alpha - 1, -alpha, ply + 1);
        if (v > alpha && v < beta) v = -search(depth - 1, -beta, -alpha, ply + 1);
      }
      unmake();
      if (stopped) return 0;
      if (v > best) { best = v; bestMove = m; }
      if (v > alpha) {
        alpha = v;
        if (v >= beta) {
          if (!board[(m >> 7) & 127]) {
            if (!killers[ply]) killers[ply] = [0, 0];
            if (killers[ply][0] !== m) { killers[ply][1] = killers[ply][0]; killers[ply][0] = m; }
            history[(board[m & 127] & 31) * 128 + ((m >> 7) & 127)] += depth * depth;
          }
          break;
        }
      }
    }
    if (!legal) return check ? -MATE + ply : 0;
    if (TT.size > 400000) TT.clear();
    TT.set(hash, { d: depth, v: best, f: best >= beta ? 1 : best <= a0 ? 2 : 0, m: bestMove });
    return best;
  }

  const SQN = s => 'abcdefgh'[s & 7] + (8 - (s >> 4));
  const uci = m => SQN(m & 127) + SQN((m >> 7) & 127) + (((m >> 14) & 7) ? ' pnbrqk'[(m >> 14) & 7] : '');

  function legalMoves() {
    const list = [], out = []; gen(list, false);
    for (const m of list) if (make(m)) { unmake(); out.push(m); }
    return out;
  }

  // opts: { depth, timeMs, noise, prevFens }
  function go(fen, opts) {
    load(fen);
    const maxDepth = opts.depth || 64, timeMs = opts.timeMs || 30000, noise = opts.noise || 0;
    repHashes = [];
    if (opts.prevFens) {
      const save = fen;
      for (const pf of opts.prevFens) { load(pf); repHashes.push(hash); }
      load(save);
      repHashes = repHashes.filter((h, i) => true);
    }
    nodes = 0; stopped = false; deadline = Date.now() + timeMs;
    killers = []; history = new Int32Array(64 * 128);
    const root = legalMoves();
    if (!root.length) return { move: null, score: inCheck(side) ? -MATE : 0, depth: 0 };
    let bestMove = root[0], bestScore = 0, reached = 0;
    let scores = root.map(() => 0);
    let ordered = order(root, 0, 0);
    for (let d = 1; d <= maxDepth; d++) {
      let alpha = -MATE - 1, beta = MATE + 1, curBest = 0, curScore = -MATE - 1;
      const newScores = new Map();
      for (const m of ordered) {
        make(m);
        let v;
        if (noise > 0) v = -search(d - 1, -MATE - 1, MATE + 1, 1);
        else {
          v = curBest ? -search(d - 1, -alpha - 1, -alpha, 1) : -search(d - 1, -beta, -alpha, 1);
          if (curBest && v > alpha && !stopped) v = -search(d - 1, -beta, -alpha, 1);
        }
        unmake();
        if (stopped) break;
        newScores.set(m, v);
        if (v > curScore) { curScore = v; curBest = m; }
        if (v > alpha) alpha = v;
      }
      if (stopped && !curBest) break;
      if (curBest) {
        bestMove = curBest; bestScore = curScore; reached = d;
        if (!stopped) {
          ordered = [...ordered].sort((a, b) => (newScores.get(b) ?? -1e9) - (newScores.get(a) ?? -1e9));
          scores = ordered.map(m => newScores.get(m));
        }
      }
      if (stopped) break;
      if (Math.abs(bestScore) > MATE - 100) break;
      if (Date.now() > deadline - timeMs * 0.45 && d >= 2) break;
    }
    if (noise > 0) {
      let pick = bestMove, pickV = -1e9;
      ordered.forEach((m, i) => {
        const s = scores[i];
        if (s === undefined) return;
        const v = s + Math.random() * noise;
        if (v > pickV) { pickV = v; pick = m; }
      });
      const i = ordered.indexOf(pick);
      return { move: uci(pick), score: scores[i] ?? bestScore, best: uci(bestMove), bestScore, depth: reached, nodes };
    }
    return { move: uci(bestMove), score: bestScore, best: uci(bestMove), bestScore, depth: reached, nodes };
  }

  function perft(d) {
    if (d === 0) return 1;
    const list = []; gen(list, false);
    let n = 0;
    for (const m of list) { if (make(m)) { n += perft(d - 1); unmake(); } }
    return n;
  }

  return { go, load, perft, MATE };
}

