# Data refresh and publish

The site has two independent data modes:

- `mock`: deterministic TypeScript fixtures for UI development and tests.
- `snapshot`: generated, versioned JSON under `public/data/v1`.

The current Python pipeline writes honest bootstrap metadata only. It does not
fabricate market observations. Live OHLCV acquisition, FinanceToolkit
calculations, peer comparisons, and validation gates are the next pipeline
phase.

## One-command workflow

```bash
./scripts/refresh.sh
./scripts/refresh.sh --dataset
./scripts/refresh.sh --git
./scripts/refresh.sh --both --message "Refresh EOD snapshot"
```

With no arguments, an interactive terminal shows a menu. A non-interactive run
always defaults to dataset-only, so scheduled jobs cannot commit or push by
accident. Logs are written to `logs/` and ignored by Git.

On macOS, `scripts/refresh.command` opens the same menu when double-clicked.
`scripts/serve.command` builds the site if needed and serves `dist/` at
<http://127.0.0.1:8765/>.

## Credentials

Never put credentials in this repository.

- GitHub HTTPS credentials belong in macOS Keychain or a credential manager.
- `FMP_API_KEY` is a build-time/server-side environment variable.
- `NETLIFY_BUILD_HOOK` is a GitHub Actions secret.
- Do not prefix secrets with `VITE_`; Vite exposes those values to browsers.

Copy `.env.example` to `.env` for local values. `.env` is ignored.

## Netlify

`netlify.toml` publishes `dist/` after generating snapshot metadata, running
tests, and building the frontend. Once the Netlify site exists:

1. Connect it to `supatz/Stock-Research`.
2. Add build-only market-data variables in Netlify.
3. Create a Netlify build hook.
4. Save that URL in the GitHub repository secret `NETLIFY_BUILD_HOOK`.

The scheduled Netlify trigger workflow is checked in as a template at
`docs/github-workflows/trigger-netlify.yml` because GitHub requires a PAT with
the `workflow` scope before that file can live under `.github/workflows/`.

To enable it:

1. Update the personal GitHub PAT (or SSH auth) so it can write workflow files.
2. Copy the template into `.github/workflows/trigger-netlify.yml`.
3. Commit and push.
4. Add the repository secret `NETLIFY_BUILD_HOOK`.

The weekday schedule is 23:30 UTC. That is 7:30 PM New York during daylight
time and 6:30 PM in winter. The live pipeline must inspect the exchange
calendar/latest market date rather than assuming every weekday is a trading day.

## New-computer recovery

```bash
git clone https://github.com/supatz/Stock-Research.git
cd Stock-Research
npm install
npm run dev
```

Install Python live-pipeline dependencies only when that phase is enabled:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e 'pipeline[live,dev]'
```

Credentials must be recreated from the provider dashboards or password manager;
they are intentionally absent from Git.
