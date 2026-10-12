# Replicate: data refresh + site publish workflow

Copy this pattern into another project so you can (1) rebuild data locally, (2) preview the static site, and (3) commit + push so a host (e.g. Netlify) redeploys.

This is based on **FPL Pulse Talk** (`scripts/refresh.sh`, `scripts/refresh.command`, `serve.py`).

---

## What the workflow does

| Mode | Action |
|---|---|
| **1 — Dataset only** | Rebuild masters / merge / serving JSON into the site’s data folder |
| **2 — Git push only** | `git add -A` → commit (prompt for message) → `git push` |
| **3 — Both** | Dataset refresh, then git publish |

Non-interactive / scheduled runs should default to **dataset only** (no commit/push).

---

## Files to recreate in the new project

```
YourProject/
├── serve.py                 # static server for the web/ folder
├── scripts/
│   ├── refresh.sh           # menu + dataset + git publish
│   ├── refresh.command      # Finder double-click → refresh.sh
│   └── serve.command        # Finder double-click → serve.py
├── web/                     # static site (publish dir for Netlify)
│   └── data/                # generated JSON the site fetches
└── logs/                    # refresh logs (create on first run)
```

Adapt `refresh_dataset()` inside `refresh.sh` to call **your** build commands instead of FPL’s `build.py` / `build_understat.py` / `build_pl_merge.py` / `build_serving.py`.

Keep the same menu and `publish_git()` shape:

```bash
# publish_git() core
git add -A
# commit if staged changes exist (prompt for message)
git push
```

Requirements:

- Project is a git repo with `origin` pointing at GitHub
- Local `user.name` / `user.email` set (repo-local or global)
- Auth that can `git push` (see credentials below)

---

## Local preview

Default port in this repo: **8765**.

```bash
.venv/bin/python serve.py              # http://127.0.0.1:8765/
.venv/bin/python serve.py --port 8770  # any other free port
# or double-click scripts/serve.command
```

Do **not** open `web/index.html` via `file://` — browsers block `fetch` of JSON.

---

## Manual refresh / publish

```bash
./scripts/refresh.sh                 # interactive menu
./scripts/refresh.sh --dataset       # data only
./scripts/refresh.sh --git           # commit + push only
./scripts/refresh.sh --both          # refresh then publish
```

Finder: double-click `scripts/refresh.command`.

---

## Optional: schedule (macOS launchd)

Pattern from `scripts/install_schedule.sh`:

- Write a LaunchAgent plist under `~/Library/LaunchAgents/`
- Call `scripts/refresh.sh` with **no TTY** so it runs **dataset only**
- Log stdout/stderr under `logs/`

Do **not** schedule git push unless you explicitly want unattended publishes.

---

## Credentials / tokens — where the personal GitHub login lives

There is **no token file inside the FPL project folder**. The PAT that lets `git push` hit your **personal** GitHub (`supatz` / `fpl-pulse-talk`) is stored by macOS Git in **Keychain Access**.

### The credential “file” (Keychain entry)

| Field | Value on this Mac |
|---|---|
| App | **Keychain Access** → login keychain |
| Kind | Internet password |
| Where / server | `github.com` |
| Account | `supatz` |
| Password | your GitHub Personal Access Token (hidden; used by Git automatically) |
| How Git finds it | `credential.helper=osxkeychain` (system Git default) |

Open it: Spotlight → **Keychain Access** → search `github.com` → double-click the entry with account **supatz**.

`scripts/refresh.sh` mode 2/3 calls `git push`; Git reads this Keychain entry so the push goes as personal `supatz`, not a company GitHub login.

### Commit identity (separate from the token)

Repo-local (this folder only — does not change company Git):

```bash
git config user.name   # → supatz
git config user.email  # → your personal email
```

That stamps commits as personal. The Keychain token authorizes the push.

### Same Mac, new project (e.g. Stock Market)

You usually **do not copy anything**. Same Keychain entry works for any `https://github.com/supatz/…` remote.

Still do once in the new repo:

```bash
cd "/path/to/new-project"
git config user.name "supatz"
git config user.email "YOUR_PERSONAL_EMAIL"
git remote add origin https://github.com/supatz/NEW-REPO.git
```

Then one successful `git push` (or refresh menu option 2/3).

### New Mac / new user account

1. Create a PAT on personal GitHub: https://github.com/settings/tokens
2. First `git push` → enter username `supatz` and the PAT as the password → macOS stores a new `github.com` Keychain entry.
3. Or manually add an Internet password in Keychain Access: server `github.com`, account `supatz`, password = PAT.

Do **not** paste the PAT into the project, into `refresh.sh`, or into git.

There is no `~/.git-credentials` and no `~/.config/gh/hosts.yml` on this setup.

### Optional: SSH instead of HTTPS + Keychain

| Item | Location |
|---|---|
| Private key | `~/.ssh/id_ed25519` |
| Public key | `~/.ssh/id_ed25519.pub` (also add under GitHub → SSH keys) |

```bash
git remote set-url origin git@github.com:supatz/REPO.git
```

### Netlify

No Netlify token in the repo. Connect the personal GitHub repo in the Netlify UI; publish directory = `web/` (or your static folder).

### Do **not** put in the new repo

- The Keychain password / PAT
- SSH private keys
- Company GitHub credentials or SSO tokens

---

## Checklist for the new project

1. [ ] venv + dependencies installable offline of secrets
2. [ ] `serve.py` (or equivalent) serves the static folder
3. [ ] `scripts/refresh.sh` with dataset / git / both modes
4. [ ] `scripts/refresh.command` + `serve.command` executable (`chmod +x`)
5. [ ] `git remote add origin https://github.com/USER/REPO.git`
6. [ ] GitHub auth works: one successful `git push`
7. [ ] Host (Netlify/etc.) watches that repo and publishes the static folder
8. [ ] Optional: launchd schedule for dataset-only refresh

---

## Reference implementation in this repo

- Menu + pipeline + publish: `scripts/refresh.sh`
- Finder entry: `scripts/refresh.command`
- Local server: `serve.py` (default `http://127.0.0.1:8765/`)
- Human summary: `README.md` → “How to refresh”, `docs/dashboard_readme.md` → “Local”
