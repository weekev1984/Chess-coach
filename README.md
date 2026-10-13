# Knight School (chess coach)

A chess board for learning. You play against a coach at five levels (Pawn to Queen). It names every opening as it happens, explains it in kid-friendly words and says how to beat it.

- **Knows 3,865 openings**: the full [lichess chess-openings](https://github.com/lichess-org/chess-openings) list (CC0). Openings are recognised by position, so they're found even when the moves come in a different order.
- **Coaching for each opening family**: what it is, each side's plan, how to counter it, and a tip or trap. About 90 families have their own notes, and the rest get notes for their ECO group (A to E).
- **Two-step hints**: first a nudge, then the exact move with the reason.
- **Mistake warnings**: before a big blunder, the coach shows the punishing reply and offers a take-back. It also points out pieces in danger and checkmate threats.
- **Openings library**: search all 3,865 openings and start a practice game from any of them.
- **"Name that opening" quiz.**

## How it works

Everything runs in the browser. The Cloudflare Worker serves the static site plus `/api/health`, which tells the page which environment it's in. There is no database: each player's current game and settings are kept in their own browser.

```
  public/index.html, styles.css   the page
  public/app.js         board, coaching, hints, library and quiz
  public/engine.js      the coach's chess engine (alpha-beta search), run in a Web Worker
  public/coach.js       kid-friendly notes for each opening family
  public/openings.json  [ECO, name, moves, position] for every opening
  public/vendor/        chess.js (rules and move notation, BSD-2)
  public/pieces/        cburnett piece set (GPLv2+)
  src/index.js          the Worker
  data/                 lichess TSV files; `npm run openings` rebuilds openings.json from them
  test/                 engine and openings tests (node --test)
  wrangler.toml         local, dev and production environments
.github/workflows/deploy.yml   CI/CD pipeline
```

## Environments

| Environment | Branch    | Worker            |
|-------------|-----------|-------------------|
| local       | any       | `wrangler dev`    |
| dev         | `develop` | `chess-coach-dev` |
| production  | `main`    | `chess-coach`     |

Non-production environments show a striped banner so you always know which one you're in.

Every pull request runs the tests. Pushing to `develop` tests and deploys dev, and merging to `main` does the same for production.

## One-time setup

In this repo's Settings → Environments, create `development` and `production`, and add these secrets to each (the same values the Recipe App uses):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Until they're added, the deploy jobs pass but skip deploying and say so in the run summary. For production, it's worth ticking "Required reviewers" and restricting deployment branches to `main`.

## Local development

```bash
npm install
npm run dev        # http://localhost:8787
npm test
```
