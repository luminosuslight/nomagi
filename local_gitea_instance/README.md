# Local Gitea for Nomagi

Docker Compose stack for a private Gitea on this machine. CORS is preconfigured for [notes.luminosus.org](https://notes.luminosus.org) so you can use that public Nomagi instance with **Git CORS Proxy** left empty — see the main [README](../README.md#fully-private-notes-local-gitea).

## Quick start

```bash
cp .env.example .env   # optional: port, CORS origin
docker compose up -d
```

Open **http://localhost:55001**, complete the install wizard (SQLite defaults are fine; set the admin account; registration stays disabled).

## Gitea setup

1. **Settings → Applications → Generate New Token** — scope `write:repository` (or `all`).
2. **+ → New Repository** — e.g. `notes` (skip README init if pushing an existing repo).

## Nomagi settings

| Field | Example |
| --- | --- |
| Repository URL | `http://localhost:55001/tim/notes.git` |
| Personal Access Token | your Gitea PAT |
| Git CORS Proxy | *(empty)* |

## Optional: push an existing repo from the CLI

```bash
cd ~/notes_repo
git remote add origin "http://USER:TOKEN@localhost:55001/USER/notes.git"
git push -u origin main
```

## Operations

```bash
docker compose up -d      # start
docker compose down       # stop (data kept in volume gitea-data)
docker compose logs -f
```

Change `GITEA_HTTP_PORT`, `GITEA_ROOT_URL`, or `GITEA_CORS_ORIGIN` in `.env`, then `docker compose up -d`. If you use a different Nomagi URL, set `GITEA_CORS_ORIGIN` to that origin exactly (scheme + host).
