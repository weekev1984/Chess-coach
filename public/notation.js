// Turns chess notation into plain words for beginners: "Nf3" -> "knight to f3", "1.e4 e5" -> "pawn to e4, pawn to e5".
const PIECE_WORDS = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };
const SAN = String.raw`(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8](?:=[QRBN])?)[+#]?[!?]*`;
const MOVE_NO = String.raw`\d+\.(?:\.\.)?\s?|\.\.\.`;
// A run of moves that starts with a move number or "...", like "1.e4 e5 2.Nf3" or "...a6".
const SEQ_RE = new RegExp(String.raw`(?<![\w.])(?:${MOVE_NO})${SAN}(?:\s+(?:${MOVE_NO})?${SAN}(?![\w-]))*(?![\w-])`, 'g');
// A single piece move, capture or castle written on its own, like "Nf3", "exd5" or "O-O". Bare pawn moves ("e4") are left alone, since they read like square names.
// Two or more moves in a row that start with a piece move, like "Nxe5 Qg5" or "Bxd8 Bb4+ Qd2".
const PIECE = String.raw`(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?)[+#]?[!?]*`;
const RUN_RE = new RegExp(String.raw`(?<![\w.-])${PIECE}(?:\s+(?:${MOVE_NO})?${SAN}(?![\w-]))+(?![\w-])`, 'g');
const PIECE_RE = new RegExp(String.raw`(?<![\w.-])${PIECE}(?![\w-])`, 'g');
const SAN_ONLY = new RegExp(`^${SAN}$`);

function moveWords(san) {
  const m = san.match(/^(?:(O-O-O|O-O)|([KQRBN])?[a-h]?[1-8]?(x)?([a-h][1-8])(?:=([QRBN]))?)([+#])?(.*)$/);
  if (!m) return san;
  let w = m[1] === 'O-O' ? 'castle kingside' : m[1] ? 'castle queenside' : `${m[2] ? PIECE_WORDS[m[2]] : 'pawn'} ${m[3] ? 'takes on' : 'to'} ${m[4]}`;
  if (m[5]) w += ` and becomes a ${PIECE_WORDS[m[5]]}`;
  if (m[6]) w += m[6] === '#' ? ', checkmate' : ' with check';
  return w + m[7];
}
// "1.e4 e5 2.Nf3" -> "pawn to e4, pawn to e5, knight to f3"
function lineWords(text) {
  return text.trim().split(/\s+/).map(t => t.replace(/^(\d+\.(\.\.)?|\.\.\.)/, '')).filter(Boolean)
    .map(t => SAN_ONLY.test(t) ? moveWords(t) : t).join(', ');
}
// Rewrites notation inside an HTML string. Moves marked up as <span class="san">…</span> (including bare pawn
// moves) become bold words; notation in running text becomes plain words. Tags and attributes are left alone.
const BLOCK_TAG = /<\/?(?:p|div|button|dd|dt|li|br|h\d|td|summary|details|section)\b[^>]*>/g;
// Capitalise words that start a sentence or a block (paragraph, button...).
function capFor(words, htmlBefore) {
  const parts = htmlBefore.split(BLOCK_TAG);
  const text = parts[parts.length - 1].replace(/<[^>]+>/g, '');
  return /^\s*$|[.!?:]\s*$/.test(text) ? words[0].toUpperCase() + words.slice(1) : words;
}
function plainMoves(html) {
  html = html.replace(/<span class="san">([^<]*)<\/span>/g, (all, inner, at, s) => {
    const words = lineWords(inner);
    return words === inner ? all : `<b>${capFor(words, s.slice(0, at))}</b>`;
  });
  let seen = '';
  return html.split(/(<[^>]+>)/).map(part => {
    if (part.startsWith('<')) { seen += part; return part; }
    const out = part.replace(SEQ_RE, (m, at) => capFor(lineWords(m), seen + part.slice(0, at)))
      .replace(RUN_RE, (m, at, s) => capFor(lineWords(m), seen + s.slice(0, at)))
      .replace(PIECE_RE, (m, at, s) => capFor(moveWords(m), seen + s.slice(0, at)));
    seen += part;
    return out;
  }).join('');
}
