# README screenshots

Regenerates the images in `docs/images/` (`setup_screen`, `recent_screen`, `example_note`, `whiteboard`) with dummy content, so no real notes end up in the repo.

## Usage

```sh
# once
cd scripts/screenshots
npm ci
npx playwright install chromium

# the dev server must be running (default http://localhost:55111/)
npm run screenshots
```

Optional environment variables: `APP_URL` (dev server URL), `GIT_PORT` (mock git server port, default `8199`), `OUT_DIR` (output directory, default `docs/images`).

## How it works

1. `build-repo.mjs` creates a bare git repo in a temp directory with dummy notes, a sketch, and a `.canvas` whiteboard. Commits are backdated relative to _now_, so the "recent" list shows natural times like "12 min. ago" and "Thu".
2. `run.mjs` serves that repo with `git-http-mock-server` (already a dev dependency of the app; it ignores auth and sends CORS headers).
3. A headless Chromium (Playwright) opens the dev server, fills in the setup form with a dummy name, email, and token, and clones the repo through the app's `/git-cors` proxy.
4. It takes the screenshots: phone viewport 393×852 at 3× for the three phone shots, 1280×800 at 2× for the whiteboard.

## Workarounds in `run.mjs`

- `navigator.storage.persist/persisted` are stubbed, because headless Chromium denies them and the app would show a warning toast.
- The script waits for the "Repository cloned" toast to disappear before capturing.
- The active element is blurred so no caret, focused field, or link dialog is visible.
- The `↗` of link chips renders as a colour emoji on headless Linux, so a text font is forced for it. This only affects the screenshots.
- A short dummy email is used so the setup field doesn't scroll.

To change what the screenshots show, edit the `NOTES` array and the canvas JSON in `build-repo.mjs`.
