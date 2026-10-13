// Lessons: short explanations plus exercises played on the main board.
// Exercise types:
//   move   - find the move(s). `solution` alternates your move, their reply, your move...;
//            a step may list alternatives as "g6|Qe7" (last step only). goal: 'mate' also accepts any checkmate.
//   line   - play an opening's main line move by move (the opponent's replies are automatic).
//   book   - (on a move exercise) opening theory the engine undervalues, so the engine check skips it.
//   choice - a question about the position; `answer` is the index of the right option.
// The position is `fen` (or the start) plus the `setup` moves, so the last move is highlighted.
// test/lessons.test.js checks every move is legal and that the engine agrees with each "move" answer.
const LESSONS = [
  {
    unit: 'Think like a coach',
    lessons: [
      {
        id: 'three-questions',
        title: 'The 3 questions',
        intro: [
          'Strong players don\'t just think about their own plans. Every time the opponent moves, they stop and ask <b>3 questions</b>:',
          '<b>1. What does that move attack?</b> Look along every line the moved piece can now see.<br><b>2. What does it threaten next move?</b> A check, a capture, or a checkmate.<br><b>3. What changed?</b> Did the move open a line for a piece behind it?',
          'Only then do you look for your own best move. This one habit stops most lost games.',
        ],
        ex: [
          { type: 'choice', setup: 'e4 e5 Bc4 Nc6 Qh5', prompt: 'White just played <span class="san">Qh5</span>. What is White threatening?',
            options: ['To take on e5 and win a pawn', 'Qxf7, which is checkmate', 'To take the pawn on h7', 'Nothing yet, the queen is just coming out'], answer: 1,
            arrows: ['h5f7', 'c4f7'],
            explain: 'The queen <b>and</b> the bishop both aim at f7, and only the king defends it. <span class="san">Qxf7</span> would be checkmate (Scholar\'s Mate). The e5 pawn is safe because the knight on c6 protects it.' },
          { type: 'move', setup: 'e4 e5 Bc4 Nc6 Qh5', prompt: 'Now stop the checkmate. Black to move.', solution: ['g6|Qe7|Qf6'],
            hint: 'Either protect f7 again, or chase the queen away with a pawn. Careful: <span class="san">Nf6??</span> loses at once to <span class="san">Qxf7#</span>.',
            explain: '<span class="san">g6</span> is the favourite: it attacks the queen, so White has to spend another move. <span class="san">Qe7</span> also guards f7 and e5.' },
          { type: 'choice', setup: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5', prompt: 'White\'s knight jumped to g5. What is it aiming at?',
            options: ['The pawn on h7', 'f7: knight and bishop attack it together, and Nxf7 would fork the queen and rook', 'The black king directly', 'It is retreating'], answer: 1,
            arrows: ['g5f7', 'c4f7'],
            explain: 'Two white pieces attack f7 and only the king guards it. <span class="san">Nxf7</span> would attack the queen on d8 and the rook on h8 at the same time.' },
          { type: 'move', setup: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5', prompt: 'Find Black\'s best answer.', solution: ['d5'],
            hint: 'Block the bishop\'s line to f7 with a pawn, even if it costs a pawn.',
            explain: '<span class="san">d5!</span> cuts the bishop off from f7. If <span class="san">exd5</span>, the main move is <span class="san">Na5</span>, chasing the bishop.' },
        ],
      },
      {
        id: 'count-attackers',
        title: 'Is it really free?',
        intro: [
          'Before you take something, count: <b>how many of my pieces attack it, and how many of theirs defend it?</b>',
          'Then check one more thing: after I take, what can they do to me? Sometimes a "free" pawn is bait.',
        ],
        ex: [
          { type: 'move', setup: 'e4 e5 Nf3 Nc6 Bc4 Bc5 Ng5', prompt: 'White\'s knight jumped to g5 to hit f7. But is that knight safe? Black to move.', solution: ['Qxg5'],
            hint: 'Count the defenders of the knight on g5. Which black piece can reach it?',
            explain: 'Nothing defends the knight, and your queen can take it along the d8-g5 diagonal. Always ask "is that piece protected?"' },
          { type: 'choice', setup: 'e4 e5 Nf3 Nc6 Bc4 Nd4', prompt: 'Black left the e5 pawn without a defender. Should White take it with <span class="san">Nxe5</span>?',
            options: ['Yes, it\'s a free pawn', 'No: after Nxe5, Black plays Qg5! attacking the knight and the g2 pawn at once', 'No, because the knight would be trapped on e5', 'Yes, and it also wins the knight on d4'], answer: 1,
            arrows: ['d8g5'],
            explain: 'This is a trap. After <span class="san">Nxe5 Qg5!</span> the queen hits the knight and g2. If White gets greedy with <span class="san">Nxf7?</span>, then <span class="san">Qxg2</span> and Black is winning. A calmer move like <span class="san">Nxd4</span> or <span class="san">O-O</span> is better.' },
          { type: 'choice', setup: 'd4 d5 Bf4 Nf6 e3 c5 Nc3 Qb6', prompt: 'Black\'s queen came to b6. Use the 3 questions: what does it attack?',
            options: ['The pawn on d4', 'The pawn on b2', 'The bishop on f4', 'The knight on c3'], answer: 1,
            arrows: ['b6b2'],
            explain: 'The queen looks straight down the b-file at b2, and nothing defends it. White should protect it, for example with <span class="san">Rb1</span> or <span class="san">Qc1</span>.' },
          { type: 'move', setup: 'e4 e5 Nf3 Nf6 Nxe5 Nxe4 Qe2', prompt: 'White\'s queen is on the same file as your king, behind White\'s knight. Find the safe move. Black to move.', solution: ['Qe7'],
            hint: 'If your knight on e4 moves away, the white knight can move with a discovered check. Block the e-file with something that can trade.',
            explain: '<span class="san">Qe7</span> puts a piece between the queen and your king. If instead <span class="san">Nf6??</span>, then <span class="san">Nc6+</span> is a discovered check that wins your queen.' },
        ],
      },
    ],
  },
  {
    unit: 'Openings',
    lessons: [
      {
        id: 'opening-rules',
        title: 'Golden opening rules',
        intro: [
          '<b>1. Take the center</b> with a pawn (e4 or d4). Pieces in the middle control more squares.',
          '<b>2. Develop</b> knights and bishops before your queen and rooks. Every move should bring a new piece out.',
          '<b>3. Castle early</b> to keep your king safe and connect your rooks.',
          '<b>4. Don\'t move the same piece twice</b> in the opening without a good reason.',
        ],
        ex: [
          { type: 'choice', setup: 'e4 e5', prompt: 'Which move follows the opening rules best?',
            options: ['Nf3, developing a knight and attacking e5', 'Pawn to h4, pushing the h-pawn', 'Qh5, bringing the queen out', 'Ke2, walking the king forward'], answer: 0,
            explain: '<span class="san">Nf3</span> brings out a piece <b>and</b> creates a threat. The queen comes out later, when she can\'t be chased around.' },
          { type: 'choice', setup: 'e4 e5 Nf3 Nc6 Bc4 Bc5', prompt: 'Both sides have two pieces out. What should White do now?',
            options: ['Ng5, attacking again with the same knight', 'O-O, castling', 'Pawn to a4, a pawn move on the edge', 'Kf1, moving the king by hand'], answer: 1,
            explain: 'Castle! Your king is safer and your rook joins the game. <span class="san">Ng5</span> moves the same piece twice and leaves your development behind.' },
          { type: 'move', setup: 'd4 d5 c4', prompt: 'White offers a pawn (the Queen\'s Gambit). Play a good opening move for Black.', solution: ['e6|c6|Nf6|dxc4'],
            hint: 'Support your d5 pawn, or bring out a knight.',
            explain: 'Any of <span class="san">e6</span>, <span class="san">c6</span>, <span class="san">Nf6</span> or <span class="san">dxc4</span> is a real grandmaster move here.' },
          { type: 'choice', setup: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 h6', prompt: 'Black just played <span class="san">h6</span>. Does it follow the opening rules?',
            options: ['Yes, it develops a piece', 'Not really: it doesn\'t develop a piece or fight for the center', 'Yes, it castles', 'Yes, it attacks White\'s king'], answer: 1,
            explain: 'Little pawn moves on the edge waste time in the opening. Ask "does this bring a new piece into the game?" before you move.' },
        ],
      },
      {
        id: 'early-queen',
        title: 'Beat the early queen attack',
        intro: [
          'Some players bring the queen out early to try <b>Scholar\'s Mate</b>: queen and bishop gang up on f7.',
          'Don\'t panic. Guard f7, then <b>develop with tempo</b>: bring out pieces that attack the queen, so she has to run while you get ahead in development.',
        ],
        ex: [
          { type: 'move', setup: 'e4 e5 Bc4 Nc6 Qh5 Nf6', prompt: 'Black forgot about f7. Find the checkmate! White to move.', solution: ['Qxf7#'], goal: 'mate',
            hint: 'Which black pawn is attacked twice and defended only by the king?',
            explain: 'Checkmate! This is why Black must always ask "what does the queen threaten?" when it appears on h5.' },
          { type: 'move', setup: 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3', prompt: 'The queen moved again and now aims at f7 from f3. Defend and develop at the same time. Black to move.', solution: ['Nf6'],
            hint: 'Put a knight on a square where it blocks the queen\'s line to f7.',
            explain: '<span class="san">Nf6</span> blocks the queen\'s path to f7 and brings out a piece. White has spent three moves on the queen; you are ahead in development.' },
          { type: 'move', setup: 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6 Qb3', prompt: 'Now the queen comes around to b3, hitting f7 again with the bishop. Defend! Black to move.', solution: ['Qe7'],
            hint: 'Your queen can guard f7 from a square next to the king.',
            explain: '<span class="san">Qe7</span> guards f7 and e5. Next you can play <span class="san">Nd4</span> to chase the queen again.' },
        ],
      },
      {
        id: 'italian',
        title: 'The Italian Game',
        intro: [
          'The Italian Game starts <span class="san">1.e4 e5 2.Nf3 Nc6 3.Bc4</span>. The bishop aims at f7, the weakest square in Black\'s camp.',
          'White\'s plan: castle, play <span class="san">c3</span> and <span class="san">d4</span> to build a big center.',
        ],
        ex: [
          { type: 'line', prompt: 'Play the main line of the Italian Game as White. Your opponent\'s replies are automatic.',
            solution: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4'],
            explain: 'This is the <b>Giuoco Piano</b> ("quiet game"). <span class="san">c3</span> prepared <span class="san">d4</span>, so White now has a strong pawn center.' },
          { type: 'move', setup: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5', prompt: 'You defended with <span class="san">d5</span> and White took. Taking back with the knight walks into the "Fried Liver" attack. Find the safer move. Black to move.', solution: ['Na5'], book: true,
            hint: 'Attack the bishop on c4 with your knight.',
            explain: '<span class="san">Na5!</span> hits the bishop, and Black gets fast development for the pawn. After <span class="san">Nxd5?!</span> White can sacrifice <span class="san">Nxf7!</span> and chase your king into the open.' },
          { type: 'move', setup: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1', prompt: 'Black grabbed your queen! But the black king is weak. Find the forced checkmate. White to move.', solution: ['Bxf7+', 'Ke7', 'Nd5#'], goal: 'mate',
            hint: 'Start with a check on f7.',
            explain: 'This is <b>Légal\'s Mate</b>: knights and bishop beat the queen. Lesson for Black: if a "free" queen looks too easy, check what the opponent threatens first!' },
        ],
      },
      {
        id: 'ruy-lopez',
        title: 'The Ruy Lopez',
        intro: [
          'The Ruy Lopez (or Spanish) starts <span class="san">1.e4 e5 2.Nf3 Nc6 3.Bb5</span>. The bishop attacks the knight that defends e5.',
          'It\'s one of the oldest and most respected openings. White builds slow pressure; Black often kicks the bishop with <span class="san">a6</span> and <span class="san">b5</span>.',
        ],
        ex: [
          { type: 'line', prompt: 'Play the main line of the Ruy Lopez as White.', solution: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1'],
            explain: 'White castled, then put the rook behind the e4 pawn. Next comes <span class="san">c3</span> and <span class="san">d4</span>.' },
          { type: 'choice', setup: 'e4 e5 Nf3 Nc6 Bb5', prompt: 'Why does White\'s bishop go to b5?',
            options: ['To attack the knight that protects the e5 pawn', 'To check the king', 'To win the b7 pawn', 'To protect the e4 pawn'], answer: 0,
            arrows: ['b5c6'],
            explain: 'If the knight on c6 ever disappears, e5 loses its defender. That pressure lasts all game.' },
          { type: 'move', setup: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 d6 d4 b5 Bb3 Nxd4 Nxd4 exd4 Qxd4', prompt: 'White\'s queen grabbed a pawn on d4. Now the bishop on b3 has nowhere to hide. Trap it! Black to move.', solution: ['c5'],
            hint: 'Attack the queen with a pawn, and plan to follow with another pawn push.',
            explain: 'This is the <b>Noah\'s Ark Trap</b>. After <span class="san">c5</span> the queen moves and <span class="san">c4</span> traps the bishop with pawns.' },
        ],
      },
      {
        id: 'queens-gambit',
        title: 'The Queen\'s Gambit',
        intro: [
          'The Queen\'s Gambit starts <span class="san">1.d4 d5 2.c4</span>. White offers a pawn to pull Black\'s d5 pawn away from the center.',
          'Black usually declines with <span class="san">e6</span> (solid) or <span class="san">c6</span> (the Slav). If Black takes, holding on to the extra pawn is dangerous.',
        ],
        ex: [
          { type: 'line', prompt: 'Play the Queen\'s Gambit Declined as White.', solution: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3'],
            explain: 'White pins the knight with <span class="san">Bg5</span>, then plays <span class="san">e3</span> to open the way for the other bishop.' },
          { type: 'choice', setup: 'd4 d5 c4 dxc4 e3 b5 a4 c6 axb5 cxb5 Qf3', prompt: 'Black tried to hold on to the extra pawn. White\'s queen jumped to f3. What does it attack?',
            options: ['The pawn on c4', 'The rook on a8, along the long diagonal', 'The pawn on f7', 'Nothing important'], answer: 1,
            arrows: ['f3a8'],
            explain: 'The diagonal from f3 to a8 is wide open, so White wins the rook or the knight. Holding on to gambit pawns often leaves holes like this.' },
          { type: 'move', setup: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5', prompt: 'White grabbed a pawn because the knight on f6 looks pinned. It isn\'t really! Black to move.', solution: ['Nxd5', 'Bxd8', 'Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8'],
            hint: 'Take the knight. If White takes your queen, look for a check.',
            explain: 'The <b>Elephant Trap</b>: you gave the queen but got back the queen and won a piece. A pin to the queen is not as strong as a pin to the king.' },
        ],
      },
      {
        id: 'black-vs-e4',
        title: 'Black vs 1.e4: Sicilian, French, Caro-Kann',
        intro: [
          'You don\'t have to answer <span class="san">1.e4</span> with <span class="san">e5</span>. Three famous defences:',
          '<b>Sicilian</b> (<span class="san">c5</span>): fights for d4 from the side and leads to sharp, unbalanced games.<br><b>French</b> (<span class="san">e6</span> then <span class="san">d5</span>): solid, but the c8 bishop can get stuck.<br><b>Caro-Kann</b> (<span class="san">c6</span> then <span class="san">d5</span>): solid, and the c8 bishop gets out before <span class="san">e6</span>.',
        ],
        ex: [
          { type: 'line', setup: 'e4', prompt: 'Play the Sicilian Najdorf as Black.', solution: ['c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
            explain: 'The <b>Najdorf</b>, favourite of Fischer and Kasparov. <span class="san">a6</span> keeps White\'s pieces off b5 and prepares <span class="san">e5</span> or <span class="san">b5</span>.' },
          { type: 'line', setup: 'e4', prompt: 'Play the French Defence as Black.', solution: ['e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e5', 'Nfd7'],
            explain: 'Black will attack White\'s pawn chain with <span class="san">c5</span> and <span class="san">f6</span>.' },
          { type: 'line', setup: 'e4', prompt: 'Play the Caro-Kann as Black.', solution: ['c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6'],
            explain: 'The bishop came out to f5 <b>before</b> <span class="san">e6</span> locked it in. That\'s the big idea of the Caro-Kann.' },
          { type: 'choice', setup: 'e4 e6 d4 d5 e5 c5 c3', prompt: 'In the French, which black piece is often called the "bad" piece?',
            options: ['The knight on g8', 'The bishop on c8, stuck behind pawns on light squares', 'The bishop on f8', 'The queen'], answer: 1,
            explain: 'Black\'s pawns on e6 and d5 sit on light squares, the same colour as the c8 bishop, so they block it. A bishop blocked by its own pawns is a "bad bishop".' },
        ],
      },
      {
        id: 'white-vs-d4',
        title: 'd4 openings: London and King\'s Indian',
        intro: [
          'The <b>London System</b> is an easy plan for White: <span class="san">d4</span>, <span class="san">Bf4</span>, <span class="san">e3</span>, <span class="san">Nf3</span>, <span class="san">c3</span>, <span class="san">Nbd2</span>. You can play it against almost anything.',
          'The <b>King\'s Indian</b> is a fighting reply for Black: let White build a big center, castle quickly, then strike back with <span class="san">e5</span> or <span class="san">c5</span>.',
        ],
        ex: [
          { type: 'line', prompt: 'Set up the London System as White.', solution: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'c5', 'c3', 'Nc6', 'Nbd2'],
            explain: 'The bishop came out <b>before</b> <span class="san">e3</span>, so it isn\'t locked in. <span class="san">c3</span> makes the d4 pawn rock solid.' },
          { type: 'line', setup: 'd4', prompt: 'Play the King\'s Indian Defence as Black.', solution: ['Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O'],
            explain: 'The bishop on g7 looks down the long diagonal. Next Black hits the center with <span class="san">e5</span>.' },
        ],
      },
    ],
  },
  {
    unit: 'Tactics',
    lessons: [
      {
        id: 'forks',
        title: 'Forks',
        intro: [
          'A <b>fork</b> is one piece attacking two things at once. The opponent can only save one.',
          'Knights are the best forkers because they jump, but pawns, queens and even kings can fork. Forks with <b>check</b> are the strongest: the king must move, then you take the other piece.',
        ],
        ex: [
          { type: 'move', fen: 'r3k2r/pp3ppp/8/3N4/8/8/PPP2PPP/R3K2R w KQkq - 0 1', prompt: 'Find the knight fork. White to move.', solution: ['Nc7+', 'Kd7', 'Nxa8'],
            hint: 'Find a square where the knight checks the king and attacks a rook.',
            explain: '<span class="san">Nc7+</span> attacks the king and the rook on a8. The king has to move, and the rook falls.' },
          { type: 'move', fen: '4k3/p4ppp/8/8/7b/8/PP3PPP/3QK3 w - - 0 1', prompt: 'The black bishop on h4 has no defender. Fork it! White to move.', solution: ['Qa4+', 'Ke7', 'Qxh4+'],
            hint: 'Give a check with the queen from a square on the same row as the bishop.',
            explain: 'After <span class="san">Qa4+</span> the queen attacks the king along the diagonal and the bishop along the 4th rank. Loose pieces (with no defender) are easy fork targets.' },
          { type: 'move', fen: 'r2qkb1r/ppp2ppp/2n1n3/8/3P4/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 1', prompt: 'A pawn can fork too. White to move.', solution: ['d5'],
            hint: 'Which pawn can step forward between two black knights?',
            explain: '<span class="san">d5</span> attacks both knights, and the c3 knight backs up the pawn. One knight will fall.' },
          { type: 'move', setup: 'e4 e5 Nf3 Nf6 Nxe5 Nxe4 Qe2 Nf6', prompt: 'Black\'s knight just left e4, and now the e-file is open. White to move.', solution: ['Nc6+'],
            hint: 'Move the knight on e5 to uncover your queen\'s check, and attack something big at the same time.',
            explain: '<span class="san">Nc6+</span> is a discovered check: the queen gives check while the knight attacks the black queen on d8. Black must deal with the check, then White takes the queen.' },
        ],
      },
      {
        id: 'pins-skewers',
        title: 'Pins and skewers',
        intro: [
          'A <b>pin</b>: you attack a piece that can\'t move, because a bigger piece (often the king) is behind it.',
          'A <b>skewer</b> is a pin turned around: you attack a big piece, it moves away, and you take the piece behind it.',
          'Bishops, rooks and queens make pins and skewers, because they attack along lines.',
        ],
        ex: [
          { type: 'move', fen: '4k3/pp3ppp/8/4q3/8/8/PP3KPP/R7 w - - 0 1', prompt: 'Pin the black queen to its king. White to move.', solution: ['Re1'],
            hint: 'Put your rook on the same file as the queen and the king.',
            explain: '<span class="san">Re1</span> pins the queen: it can\'t leave the e-file without exposing its king. Black loses the queen for the rook.' },
          { type: 'move', fen: '6q1/8/4k3/8/8/8/5PPP/5BK1 w - - 0 1', prompt: 'Skewer! Check the king so the queen behind it falls. White to move.', solution: ['Bc4+', 'Kd6', 'Bxg8'],
            hint: 'The king and queen are on the same diagonal. Which bishop move checks along it?',
            explain: 'After <span class="san">Bc4+</span> the king has to step aside, and the bishop takes the queen behind it.' },
          { type: 'move', fen: '8/8/8/2k3q1/8/8/6PP/R5K1 w - - 0 1', prompt: 'The black king and queen are on the same row. White to move.', solution: ['Ra5+', 'Kb6', 'Rxg5'],
            hint: 'Check along the 5th rank.',
            explain: 'Rook skewer: the king must leave the 5th rank, and <span class="san">Rxg5</span> wins the queen.' },
          { type: 'choice', fen: 'r1bqk2r/ppp2ppp/2np1n2/1B2p3/1b2P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 1', prompt: 'Which pieces are pinned in this position?',
            options: ['The knight on c6 (pinned to the king by the bishop on b5)', 'Both knights on c3 and c6 are pinned to their kings', 'No pieces are pinned', 'Only the knight on f6'], answer: 1,
            arrows: ['b5e8', 'b4e1'],
            explain: 'Each bishop pins a knight to the king behind it. A knight pinned to the king can\'t move at all, so it can\'t defend anything else.' },
        ],
      },
      {
        id: 'discovered',
        title: 'Discovered attacks',
        intro: [
          'A <b>discovered attack</b> happens when one piece moves out of the way and uncovers an attack by the piece behind it.',
          'The moving piece can attack something too, so you make <b>two threats in one move</b>. A <b>discovered check</b> is the deadliest kind.',
        ],
        ex: [
          { type: 'move', fen: '4k3/pp3ppp/3q4/8/4N3/8/PP3PPP/4R1K1 w - - 0 1', prompt: 'Your rook is behind your knight, aiming at the king. White to move.', solution: ['Nxd6+'],
            hint: 'Move the knight with a capture, and the rook gives check.',
            explain: '<span class="san">Nxd6</span> takes the queen and uncovers check from the rook. Black can\'t even take back, because it has to get out of check first.' },
          { type: 'move', fen: 'r2q1rk1/ppp2ppp/5n2/6B1/8/3Q4/PPB2PPP/R4RK1 w - - 0 1', prompt: 'Your queen and bishop aim at h7, but the knight on f6 guards it. Remove the defender! White to move.', solution: ['Bxf6', 'gxf6', 'Qxh7#'], goal: 'mate',
            hint: 'Take the piece that protects h7.',
            explain: 'This trick is called <b>removing the defender</b>. Once the knight is gone, <span class="san">Qxh7</span> is mate.' },
        ],
      },
    ],
  },
  {
    unit: 'Checkmate patterns',
    lessons: [
      {
        id: 'back-rank',
        title: 'Back rank mate',
        intro: [
          'When a castled king is boxed in by its own pawns, a rook or queen on the back row can give checkmate.',
          'To stay safe, make a little escape square ("luft") by moving a pawn in front of your king, like <span class="san">h3</span> or <span class="san">h6</span>.',
        ],
        ex: [
          { type: 'move', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', prompt: 'Checkmate in one. White to move.', solution: ['Rd8#'], goal: 'mate',
            explain: 'The black king is trapped by its own pawns. A good reason to give your king some luft.' },
          { type: 'move', fen: '4r1k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1', prompt: 'Two of your pieces attack e8 and only one defends it. Checkmate in one. White to move.', solution: ['Qxe8#'], goal: 'mate',
            explain: 'The rook backs up the queen, so the king can\'t take back. Counting attackers and defenders finds mates too.' },
          { type: 'choice', fen: '3r2k1/5ppp/8/8/8/8/2R2PPP/6K1 w - - 0 1', prompt: 'Black\'s rook is aiming at your back row. Which move keeps your king safe?',
            options: ['Pawn to h3, making an escape square', 'Rc7, attacking a pawn', 'Pawn to a4', 'Kh1'], answer: 0,
            explain: 'Black threatens <span class="san">Rd1#</span>. <span class="san">h3</span> gives your king an escape square on h2, so a check on the back row is no longer mate. <span class="san">Rc7?</span> and <span class="san">Kh1?</span> both lose to <span class="san">Rd1#</span>.' },
        ],
      },
      {
        id: 'smothered',
        title: 'Smothered mate',
        intro: [
          'In a <b>smothered mate</b>, the king is surrounded by its own pieces and a knight gives checkmate. Nothing can block a knight check!',
          'The famous version, <b>Philidor\'s Legacy</b>, even sacrifices the queen to fill in the king\'s last escape square.',
        ],
        ex: [
          { type: 'move', fen: '6rk/6pp/8/6N1/8/8/6PP/6K1 w - - 0 1', prompt: 'Checkmate in one. White to move.', solution: ['Nf7#'], goal: 'mate',
            explain: 'The king\'s own rook and pawns block every escape. The knight does the rest.' },
          { type: 'move', fen: '4r2k/6pp/8/3QN3/8/8/6PP/6K1 w - - 0 1', prompt: 'Philidor\'s Legacy: checkmate in four. White to move.', solution: ['Nf7+', 'Kg8', 'Nh6+', 'Kh8', 'Qg8+', 'Rxg8', 'Nf7#'], goal: 'mate',
            hint: 'Start with a knight check. Then use a double check, then sacrifice the queen on g8.',
            explain: 'The queen sacrifice forces the rook onto g8, and then the knight mates the boxed-in king.' },
        ],
      },
      {
        id: 'more-mates',
        title: 'Rook and knight mates',
        intro: [
          'Some mating patterns come up again and again. Learn the shape and you\'ll spot them in your games.',
          '<b>Anastasia\'s Mate</b>: a knight on e7 covers the escape squares, and a rook mates on the h-file.<br><b>The ladder</b>: two rooks take turns checking, pushing the king to the edge.',
        ],
        ex: [
          { type: 'move', fen: '5r2/4Nppk/8/8/8/3R4/6PP/6K1 w - - 0 1', prompt: 'Anastasia\'s Mate in one. White to move.', solution: ['Rh3#'], goal: 'mate',
            hint: 'The knight already covers g8 and g6. Attack the king along the h-file.',
            explain: 'The knight takes away g6 and g8, the black pawn blocks g7, and the rook covers the whole h-file.' },
          { type: 'move', fen: '4k3/8/8/8/8/8/R7/1R4K1 w - - 0 1', prompt: 'Use the two-rook ladder. Checkmate in two. White to move.', solution: ['Ra7', 'Kf8', 'Rb8#'], goal: 'mate',
            hint: 'First cut the king off on the 7th rank, then mate on the 8th.',
            explain: 'One rook holds the 7th rank, the other checks on the 8th. The same ladder works from the middle of the board: check, check, check.' },
        ],
      },
      {
        id: 'queen-mate',
        title: 'Queen mate (without stalemate!)',
        intro: [
          'With king and queen against a lone king, push the king to the edge with your queen, then bring your own king close to help.',
          '<b>Watch out for stalemate</b>: if the enemy king is not in check but has no legal move, the game is a draw. Before each move, check that the king still has a square to go to.',
        ],
        ex: [
          { type: 'move', fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', prompt: 'Find checkmate. Careful: one tempting move is stalemate! White to move.', solution: ['Qc8#'], goal: 'mate',
            hint: 'Give a check that the king can\'t escape. Don\'t just take away squares without giving check.',
            explain: '<span class="san">Qc8</span> is checkmate. <span class="san">Qc7??</span> would be stalemate: no check, and no legal move for Black.' },
          { type: 'move', fen: 'k7/8/2K5/8/8/8/8/1Q6 w - - 0 1', prompt: 'Checkmate in one with the king\'s help. White to move.', solution: ['Qb7#'], goal: 'mate',
            explain: 'The king guards b7, so the black king can\'t capture the queen.' },
        ],
      },
    ],
  },
  {
    unit: 'Middlegame plans',
    lessons: [
      {
        id: 'rooks',
        title: 'Rooks: open files and the 7th rank',
        intro: [
          'Rooks are strong on <b>open files</b> (columns with no pawns). From there they can invade the enemy camp.',
          'A rook on the <b>7th rank</b> (your opponent\'s second row) eats pawns and traps the king.',
        ],
        ex: [
          { type: 'choice', fen: 'r4rk1/pp3ppp/2p1p3/8/8/2P1P3/PP3PPP/R4RK1 w - - 0 1', prompt: 'Which move puts a rook where it is strongest?',
            options: ['Rad1, onto the open d-file', 'Rfe1, behind the e3 pawn', 'Pawn to a4', 'Kh1'], answer: 0,
            explain: 'The d-file has no pawns on it, so a rook there can reach d7 or d8. Behind the e3 pawn, the rook is blocked.' },
          { type: 'move', fen: '6k1/pp3pp1/2p1p2p/8/8/2P1P3/PP3PPP/3R2K1 w - - 0 1', prompt: 'Invade! White to move.', solution: ['Rd7'],
            hint: 'Use the open d-file to reach Black\'s second row.',
            explain: 'A rook on the 7th attacks b7 and the pawns along the row. Black has no rook to chase it away.' },
        ],
      },
      {
        id: 'pieces',
        title: 'Good and bad pieces',
        intro: [
          'A knight loves an <b>outpost</b>: a square in the enemy half that no enemy pawn can ever attack.',
          'A bishop is <b>bad</b> when its own pawns sit on its colour and block it. Put your pawns on the opposite colour to your bishop.',
          'Plan idea: find your <b>worst piece</b> and improve it.',
        ],
        ex: [
          { type: 'choice', fen: 'r4rk1/1p3ppp/p2p4/4p3/4P3/2N5/PPP2PPP/R4RK1 w - - 0 1', prompt: 'Where is the best square for White\'s knight?',
            options: ['Knight to d5, an outpost no black pawn can attack', 'Knight to b1, back home', 'Knight to a4, on the edge', 'Knight to e2'], answer: 0,
            explain: 'Black has no c-pawn, and the e-pawn has already passed e6, so nothing can kick a knight off d5. From there it attacks c7, b6, f6 and e7.' },
          { type: 'choice', fen: '6k1/pp3ppp/8/8/8/N7/PP3PPP/6K1 w - - 0 1', prompt: 'A knight on the edge is often weak. Which saying matches?',
            options: ['A knight on the rim is dim', 'Rooks belong on the edge', 'Queens should stay home all game', 'Kings love the center in the opening'], answer: 0,
            explain: 'A knight on the edge (the "rim") controls only half as many squares as one in the center. Bring it back toward the middle.' },
        ],
      },
      {
        id: 'pawns',
        title: 'Pawn structure',
        intro: [
          'Pawns can\'t move backwards, so every pawn move changes the position for good.',
          '<b>Passed pawn</b>: no enemy pawn can stop it on its way to queening. Push it!<br><b>Isolated pawn</b>: no friendly pawns on the files next to it, so only pieces can defend it.<br><b>Doubled pawns</b>: two pawns on the same file, which can\'t protect each other.',
        ],
        ex: [
          { type: 'choice', fen: '8/5pk1/6p1/1P6/8/6P1/5PK1/8 w - - 0 1', prompt: 'Which white pawn is a passed pawn?',
            options: ['The pawn on b5', 'The pawn on f2', 'The pawn on g3'], answer: 0,
            explain: 'No black pawn stands in front of b5 or on the files beside it, so nothing but a piece can stop it. Endgames are often won by a passed pawn.' },
          { type: 'choice', fen: '6k1/pp3ppp/4p3/8/3P4/8/PP3PPP/6K1 w - - 0 1', prompt: 'What do we call White\'s d4 pawn?',
            options: ['An isolated pawn', 'A passed pawn', 'A doubled pawn', 'A backward pawn'], answer: 0,
            explain: 'White has no pawns on the c or e files, so no pawn can protect d4. It isn\'t passed, because the black e6 pawn watches d5.' },
        ],
      },
      {
        id: 'king-safety',
        title: 'King safety and trading',
        intro: [
          'Keep the pawns in front of your castled king where they are. Every push makes holes the enemy can use.',
          'When you are <b>ahead</b> in material, <b>trade pieces</b>: the fewer pieces left, the bigger your extra piece becomes. When you are behind, avoid trades.',
        ],
        ex: [
          { type: 'choice', setup: 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d3 d6', prompt: 'White has castled. Which move weakens White\'s king the most?',
            options: ['Pawn to g4, pushing a pawn in front of the king', 'Nc3', 'Re1', 'Pawn to c3'], answer: 0,
            explain: '<span class="san">g4</span> leaves holes on f4 and h4 and opens lines toward your own king. Develop instead.' },
          { type: 'choice', fen: '3qk3/pp3ppp/8/8/8/8/PP3PPP/R2Q2K1 w - - 0 1', prompt: 'You are a whole rook ahead. What is the simplest way to win?',
            options: ['Qxd8+, trading queens', 'Avoid all trades', 'Give back the rook', 'Move the king to the center now'], answer: 0,
            explain: 'After <span class="san">Qxd8+ Kxd8</span>, you have a rook and Black has nothing to attack you with. Trade when ahead!' },
          { type: 'choice', setup: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O', prompt: 'Everyone is developed and castled. What is a good plan for White?',
            options: ['Re1 and Nbd2, then <span class="san">d4</span> to grab the center', 'Push the h-pawn to h6', 'Walk the king to the center', 'Move the queen around to look for checks'], answer: 0,
            explain: 'In quiet positions, improve your pieces and prepare a pawn break like <span class="san">d4</span>. Ask: which of my pieces is doing the least?' },
        ],
      },
    ],
  },
  {
    unit: 'Endgames',
    lessons: [
      {
        id: 'pawn-race',
        title: 'Pawn races and the square',
        intro: [
          'In the endgame the king becomes a fighter. Bring it to the center!',
          '<b>Rule of the square</b>: draw a square from the pawn to its queening row. If the defending king can step inside the square, it catches the pawn.',
        ],
        ex: [
          { type: 'choice', fen: '8/8/8/P3k3/8/8/8/7K b - - 0 1', prompt: 'Black to move. Can the black king catch the a-pawn?',
            options: ['Yes: Kd6 steps into the square', 'No, the pawn is too fast'], answer: 0,
            explain: 'The square of the a5 pawn runs from a5 to d5 to d8 to a8. <span class="san">Kd6</span> steps inside, then <span class="san">Kc7</span> and <span class="san">Kb7</span> catch the pawn.' },
          { type: 'choice', fen: '8/8/8/P3k3/8/8/8/7K w - - 0 1', prompt: 'Same position, but White to move. Can the king still catch it?',
            options: ['Yes', 'No: after <span class="san">a6</span> the square shrinks and the king is outside it'], answer: 1,
            explain: 'After <span class="san">a6</span> the square is a6 to c6 to c8 to a8. The king on e5 can\'t step inside, so the pawn queens. One tempo makes all the difference.' },
          { type: 'move', fen: '6k1/ppp5/8/PPP5/8/8/8/6K1 w - - 0 1', prompt: 'Three pawns against three, kings far away. Break through! White to move.', solution: ['b6', 'cxb6', 'a6', 'bxa6', 'c6'],
            hint: 'Sacrifice the middle pawn first.',
            explain: 'The famous breakthrough: after <span class="san">b6!</span>, whichever pawn takes, White sacrifices again and the last pawn runs to queen.' },
        ],
      },
      {
        id: 'rook-endings',
        title: 'Rook endings',
        intro: [
          'Rook endings are the most common endgames.',
          '<b>Rooks belong behind passed pawns</b>, yours or your opponent\'s. Behind your own pawn, the rook gets stronger with every step the pawn takes.',
        ],
        ex: [
          { type: 'choice', fen: 'r5k1/8/P7/8/8/8/5PPP/R5K1 w - - 0 1', prompt: 'You have a passed a-pawn. Where is your rook best?',
            options: ['Behind the pawn, on the a-file', 'In front of the pawn', 'On the h-file', 'Next to your king'], answer: 0,
            explain: 'From a1 the rook pushes the pawn up. In front of the pawn, the rook just gets in the way.' },
        ],
      },
    ],
  },
];
