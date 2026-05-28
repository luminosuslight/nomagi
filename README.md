# Quillet — modern notes app using markdown and git

A web-based, offline-first notes app that's secretly just **plain Markdown files in your own Git repo** — so it feels like a modern notes app, but your notes are portable files you fully own and that will outlive the app itself. Installable as a PWA for a native-like, offline experience on mobile (iOS/Android) and desktop.

## Who it's for

Developers and people comfortable with Markdown and Git who want a **safe, durable home for valuable personal or work notes** — plus a genuinely polished, offline-first mobile experience instead of a clunky text editor on a phone. If you want notes that still open in any editor in 5 or 10 years, this is for you.

## Why this app

- **Plain Markdown, even on disk.** What you see is exactly what's stored — standard `.md` files, not a proprietary or "markdown-like" internal format. Switching to another tool is trivial because there's nothing to export; your files are already standard.
- **You own the data location.** The app is **client-only** — nothing to host. Point it at any Git remote you already trust (GitHub, self-hosted GitLab, a local bare repo). No vendor, no server, no "the app shut down after a year" risk.
- **Git does the hard parts, invisibly.** Versioning, history, backup, and conflict resolution are handled by Git — but you never see it. No commits, no push/pull, no merge prompts. It auto-saves and syncs in the background, so it just feels like any modern app that saves for you.
- **Modern WYSIWYG editing.** A polished [Milkdown](https://milkdown.dev/) editor, not a raw textarea — with the convenience of a real app on top of plain text.
- **AI-ready by design.** Because notes are plain files, point *any* agent (Cursor, Copilot, Claude, …) directly at your repo to edit, refactor, or summarize. No need for the app to ship its own slightly-worse, less-maintained AI features — best-in-class tools work on your files already.
- **Sketches where you need them.** Handwriting and sketch blocks live *inside* a Markdown note (great on an iPad), kept simple and local to the document.
- **Truly open.** Fully open-source free software — not just "source available." You can fork it and keep it alive.

## How it compares

| | Quillet | Notion / cloud apps | Obsidian / Logseq | Joplin | Markdown + Git by hand |
|---|---|---|---|---|---|
| Storage format | Plain Markdown | Proprietary cloud DB | Plain Markdown | Markdown-*like* internal format | Plain Markdown |
| Self-host / server needed | None (client-only) | Hosted by vendor | None (local files) | Optional sync server | None |
| Sync & conflict resolution | Git, automatic & invisible | Vendor cloud | Manual / paid sync | Custom sync | Manual (you run Git) |
| Offline-first mobile PWA | Yes | Varies | Varies | Yes | No |
| Edit notes with any AI agent | Yes (plain files) | Limited / built-in only | Yes | Indirect | Yes |
| Polished WYSIWYG editor | Yes (Milkdown) | Yes | Partial | Partial | No |
| Handwritten / sketch notes | Yes (blocks in a note) | No | Via plugins | Via plugin | No |

## Deliberately out of scope

These keep the app simple and reliable for its audience — most of whom don't need them:

- No multi-user real-time collaboration.
- No database-like features (Kanban boards, project-management tables, etc.).
- Sketches are scoped to blocks *within* a note, not a free-floating canvas across documents.

A whiteboard/canvas may come later via Obsidian's open [`jsoncanvas`](https://jsoncanvas.org/) format — so even future features stay in portable, open formats.

## Tech stack

Vue 3 + TypeScript + Vite, [isomorphic-git](https://isomorphic-git.org/) with LightningFS for in-browser Git, [Milkdown](https://milkdown.dev/) for editing, and `vite-plugin-pwa` for offline/installable support.

## Dev server (systemd)

Copy `.env.example` to `.env`, then deploy the systemd units with Ansible:

```bash
ansible-playbook ansible/playbook.yml --ask-become-pass
```
