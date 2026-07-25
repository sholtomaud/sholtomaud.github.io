# sholtomaud.github.io

Personal website for Sholto Maud, built on
[boba](https://github.com/sholtomaud/boba) — a minimalist web framework
pairing native browser Custom Elements with Node 25+'s native TypeScript
type-stripping. No virtual DOM, near-zero dependencies.

## Prerequisites

- [Apple `container`](https://github.com/apple/container) — everything
  runs inside a container, there's no expectation of a host-installed
  Node/npm.

## Quick start

```bash
make image     # build the dev container image (once, or after Containerfile changes)
make install   # npm install, inside the container
make dev       # Vite dev server on http://localhost:5173
```

## Common tasks

| Command | Description |
| --- | --- |
| `make dev` | Vite dev server (HMR) |
| `make build-app` | Production build to `dist/` |
| `make typecheck` | Type-check with `tsgo` |
| `make test-unit` | Unit tests |
| `make test` | Playwright e2e tests |
| `make clean` | Remove `node_modules`, `dist`, `.vite` |

## Project structure

```
src/
├── components/              # One folder per page/component
│   ├── home-page/            # Landing card — the site's only page with its own embedded nav
│   ├── site-header/           # Shared nav, used by every other page
│   ├── research-page/         # Publications / Preprints / Planned, PDF + external-link entries
│   ├── works-page/
│   ├── contact-page/
│   ├── about-page/             # Short bio + links out to AI "Perspectives"
│   └── perspective-page/       # /about/:slug — one AI's take on Sholto, keyed by slug
├── core/
│   ├── base-component.ts     # BaseComponent — the class every component extends
│   └── router/router.ts      # Lightweight client-side router
├── styles/                    # Global CSS (dark theme variables + base body styles)
└── main.ts                    # Entry point: registers routes, boots the router
```

## Adding a page

1. Create `src/components/<name>-page/` with `<name>-page.html`,
   `<name>-page.css`, and `<name>-page.ts` (copy an existing page as a
   starting point).
2. Register the route in `src/main.ts`.
3. Include `<site-header></site-header>` at the top of the markup (every
   page does this except `home-page`).

## Adding research entries / PDFs

The research list is generated at build time — nothing is hardcoded in the
component.

- **Published work** is pulled from your ORCID profile and (optionally)
  `content/research/publications.bib`, merged and deduped. Add a paper to
  ORCID (or the `.bib`) and it shows up; no code change.
- **Planned / in-progress** items are authored as markdown — drop a
  `content/research/planned/<slug>.md` with INI frontmatter:

  ```
  ---
  title = My Draft
  date = 2026
  kind = pdf            # or 'article', or omit for a text-only entry
  href = my-draft.pdf   # pdf: a filename; article: a full URL
  ---
  One-paragraph summary.
  ```

  For a `pdf` item, drop the file into `public/research/planned/` (served
  at `/research/planned/<file>`). `public/` holds only these served
  binaries; everything you author lives under `content/`. See
  [AGENTS.md](AGENTS.md) for the full content pipeline.

Both link kinds open in a new tab.

## CI/CD

- `.github/workflows/ci.yml` runs on PRs to `main` (and manual dispatch):
  typecheck (`tsgo`), unit tests, Playwright e2e.
- `.github/workflows/deploy.yml` runs the same checks, builds, and deploys
  to GitHub Pages via `actions/deploy-pages` — no `gh-pages` branch. This
  needs the repo's **Settings → Pages → Build and deployment** source set
  to *GitHub Actions*.

## Deployment

This repo is a GitHub **user** page (`sholtomaud.github.io`), served at
the domain root rather than under `/<repo-name>/` like a project page —
`main.ts` is set up accordingly. See [AGENTS.md](AGENTS.md) for the
routing/deployment details and known gaps.
