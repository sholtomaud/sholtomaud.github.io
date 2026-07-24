# AGENTS.md

Personal website for Sholto Maud (`sholtomaud.github.io`), built on
[boba](https://github.com/sholtomaud/boba) — a minimalist framework pairing
Custom Elements/ES Modules with Node 25+'s native TypeScript type-stripping.
This file documents stack conventions so an agent working in this repo
doesn't have to rediscover them. See [README.md](README.md) for the
project structure and how to add content.

## Stack: native TypeScript, Vite for dev/build, tsgo for type-checking

- Relative imports use the literal `.ts` extension
  (`import { x } from './foo.ts'`) — Node's ESM resolution requires the
  extension actually on disk.
- **Erasable syntax only** (`tsconfig.json`'s `erasableSyntaxOnly: true`
  enforces this at typecheck time): no `enum`, no constructor
  parameter-property shorthand, no `namespace`.
- Vite is used for the dev server (HMR) and production bundling
  (`npm run build` = `vite build --base ./`), not because the language
  needs transpiling. `vite.config.ts` exists for two dev-only things: the
  content-watching plugin described under "Content generation" below, and
  `server.watch.usePolling: true` — dev always runs inside a container
  with the repo bind-mounted from the host, and native file-change
  notifications routinely don't propagate across that boundary (a known
  VM-backed-container issue, not specific to this project), so the
  watcher is forced into stat-based polling instead. If HMR/content-watch
  ever stops picking up saved changes, this is the first thing to check.
- **`tsgo`** (the `@typescript/native-preview` package), not `tsc`, for
  type-checking — `make typecheck`.
- No CSS framework. Every component's `.css` file is plain scoped CSS:
  `BaseComponent` rewrites `:host` to the component's tag name at render
  time, so styles don't leak across components even though everything
  renders in the light DOM.

## Running things

Everything runs inside a container (`make image` to build it once) — there
is no expectation of a host-installed Node/npm. Use the Makefile targets
(`make install`, `make dev`, `make build-app`, `make typecheck`,
`make test-unit`, `make test`, `make ci`, `make clean`), which wrap the
equivalent `npm` script in a `container run` invocation. Don't reach for
bare `npm`/`node` on the host. If a script you need doesn't have a Makefile
target yet, add one rather than shelling out to `container run` directly.

`make ci` is the **local mirror of the GitHub Actions pipeline** — it runs
install → typecheck → build → unit → e2e in the same order as
`.github/workflows/ci.yml`, inside the Apple `container` runtime. Use it to
reproduce CI locally. The `gh act` extension is installed but **cannot** run
these workflows on this machine: `act` needs a Docker-API socket, which
Apple's `container` CLI doesn't expose (no Docker daemon / `podman` here).
`make ci`, not `act`, is the way to run the workflow locally.


## Routing and deployment

- This repo is a GitHub **user** page (`sholtomaud.github.io`), served at
  the domain root — not a project page living under `/<repo-name>/`.
  `src/main.ts` hardcodes `window.BOBA_BASE_URL = '/'`; don't reintroduce
  boba's default project-page path-segment detection, it will break
  routing here.
- GitHub Pages is a static host with no server-side rewrites, so a hard
  refresh on a deep link (e.g. `/research`) 404s unless `dist/404.html`
  exists. `.github/workflows/deploy.yml` handles this by copying the built
  `dist/index.html` to `dist/404.html` after `npm run build` — GitHub Pages
  serves that for any unmatched path, the app boots at the *actual*
  requested URL, and the client router reads it directly. There's no
  redirect step and no `404.html` checked into the repo; Vite doesn't copy
  a loose root-level `404.html` into `dist/` on its own (it only handles
  `index.html` and anything under `public/`), so don't add one expecting
  it to do anything at build time.
- Routes are registered in `src/main.ts` against the `Router` class in
  `src/core/router/router.ts`.

## CI/CD

- `.github/workflows/ci.yml` — typecheck, unit tests, e2e tests on every
  PR to `main` (and manually via `workflow_dispatch`). Runs on PRs only so
  the full suite isn't duplicated with `deploy.yml` on pushes to `main`,
  which re-runs the same checks before deploying. Adapted from boba's own
  CI, plus a `tsgo` typecheck step boba's upstream example doesn't run.
- `.github/workflows/deploy.yml` — same checks, then `npm run build` and
  deploy via `actions/deploy-pages` (not a `gh-pages` branch push). This
  requires the repo's Settings → Pages → "Build and deployment" source set
  to **GitHub Actions**, and — since this repo is currently private — a
  GitHub plan that supports Pages on private repos.
- Both jobs run inside the `mcr.microsoft.com/playwright:v1.61.1-noble`
  container image, matching the `@playwright/test` version pinned in
  `package.json`; bump both together.

## Adding a page

1. New folder under `src/components/<name>-page/` with `.html`/`.css`/`.ts`,
   following the existing pages (e.g. `works-page`). Use kebab-case for the
   custom element tag name.
2. Register the route in `src/main.ts`.
3. Include `<site-header></site-header>` at the top of the page's markup
   unless it's `home-page`, which has its own embedded nav instead.

## Research page / PDFs

`src/components/research-page/research-page.ts` holds a `RESEARCH_ITEMS`
array, grouped into three sections by `category`: `publication`,
`preprint`, `wip` (only sections with entries render). Each entry is
`kind: 'pdf'` (drop the file into `public/research/<publications|
preprints|wip>/` matching its `category` and reference it by filename —
Vite copies `public/` as-is, so it resolves to `<BASE_URL>research/
<category-folder>/<file>`) or `kind: 'article'` (a full external URL,
opened the same way). Both open in a new tab.

## Content generation

Some content is authored as markdown and compiled to static JSON at build
time, rather than hardcoded in `.ts` files or fetched live in the browser:

- `content/perspectives/<slug>.md` (flat `author`/`date`/`kind` frontmatter
  — `kind` is `ai` or `human` — + blank-line-separated paragraphs) →
  `src/generated/perspectives.json`, imported by both `perspective-page.ts`
  and `about-page.ts`. Add a new perspective by just dropping a new
  `<slug>.md` file here — `about-page.ts` renders the "Perspectives" list
  (grouped into Human/AI sections, newest first within each) directly from
  this generated JSON, so no HTML edit is needed to link it in.
- `content/about/autobio.md` (plain prose, no frontmatter) →
  `src/generated/about.json`, imported by `about-page.ts`.
- `content/works/<slug>/Manifest.md` — one directory per project (a
  "project assembly": a manifest plus, potentially, other project-local
  files later). INI-flavoured frontmatter, not the flat `key: value` the
  other content types use: `title` (required) and `date` (optional) as
  plain `key = value` lines, plus zero or more `[artifact.N]` sections
  (`kind`/`label`/`url`), each becoming one entry in a project's
  `artifacts` list — a project can have a GitHub repo *and* a firmware
  repo *and* a demo *and* a paper without being limited to one of each.
  `kind` is a free string, not an enum, on purpose: hardware/dataset/
  academic projects need kinds a fixed list can't anticipate (`cad`,
  `dataset`, `conops`, ...); an omitted `kind` defaults to `'link'`. INI
  over nested YAML deliberately — same "list of records" shape, but no
  indentation-sensitive parsing and no YAML dependency (see
  `scripts/lib/manifest.ts`'s `parseWorkManifest`). Body below the
  closing `---` is the summary, parsed the same way as everywhere else
  (`splitParagraphs`). → `src/generated/works.json`, imported by
  `works-page.ts`. Newest `date` first; a project needs no `date` if
  ordering doesn't matter.
- `public/research/publications/publications.bib` + a live call to the
  ORCID public API → merged, deduped, and written to
  `src/generated/research.json`, imported by `research-page.ts`. This
  used to be a live `fetch()` in the browser on every page load; moving
  it to build time means visitors no longer hit ORCID's API directly.

All three are produced by `scripts/generate-content.ts` (parsing helpers
live in `scripts/lib/`), run via the `content:generate` npm script, wired
as a `predev`/`prestart`/`prebuild`/`pretypecheck` hook so
`src/generated/*.json` always exists before Vite or tsgo needs to resolve
it — `resolveJsonModule` makes those imports type-check, but only once
the files are actually on disk, so any new npm script that touches code
importing from `src/generated/` needs the same `pre<script>` treatment.

The `pre*` hooks only run once, at startup, so on their own they wouldn't
catch edits made to `content/*.md` while `make dev` is already running.
`vite.config.ts` closes that gap with a small dev-only plugin
(`watchContentPlugin`) that adds `content/perspectives/` and
`content/about/bio.md` to Vite's own already-running file watcher and
calls the matching granular `regeneratePerspectives()`/
`regenerateAboutBio()` function (exported from `scripts/generate-content.ts`)
in-process when one changes — no new file-watching dependency, no second
terminal/container, and no unnecessary ORCID re-fetch when only markdown
changed (`regenerateResearch()`, the one that hits ORCID, is deliberately
not wired into this watcher). The plugin only runs for `vite`'s dev
server (`configureServer`), not `build`/`preview`.
`src/generated/` is gitignored — it's a build artifact, not source of
truth; don't hand-edit it or commit it. A missing `publications.bib` or
an unreachable ORCID API degrades to an empty list rather than failing
the build.

## Testing

- Tests are colocated with the file they test — `<name>.test.ts` sits
  right next to `<name>.ts` (e.g. `src/core/template-helpers.test.ts`,
  `scripts/lib/markdown.test.ts`). There is no separate `./tests`
  tree. `npm test` / `make test-unit` (`node --test src/**/*.test.ts
  scripts/**/*.test.ts`) already picks up any `*.test.ts` under `src/` or
  `scripts/`, so a new test file needs no extra wiring beyond sitting next
  to its source.
- Practice TDD for new logic: write the failing test first, then
  implement until it passes. This applies most to pure functions —
  parsers, utilities, build scripts (`scripts/lib/`) — which is where
  `node --test` unit tests are cheap and fast. DOM-heavy component
  rendering is better exercised end-to-end by the Playwright suite
  (`e2e/`) than by unit tests mocking the DOM.

## Coding style

Simplicity and web standards over frameworks/heavy tooling — this is a
personal site, not a product with a roadmap. Avoid adding build tools or
third-party dependencies unless something concrete actually needs them.
