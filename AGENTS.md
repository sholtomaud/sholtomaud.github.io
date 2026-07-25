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
  (`npm run build` = `vite build --base /`), not because the language
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
- **The build uses `--base /` (root-absolute), not `--base ./`.** Because
  the site is served at the root and deep links boot from the 404.html
  fallback (below), assets must be referenced as `/assets/…`. With a
  relative `./assets/…`, a hard refresh at `/research/` resolves them
  against the deep path (`/research/assets/…`) and 404s → blank page. This
  is a *user*-page choice; boba's generic `./` default is for project pages
  under an unknown `/<repo>/` prefix. Guarded by `e2e/assets.spec.js`.
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
- The router normalizes a trailing slash (`/research/` → `/research`) before
  matching, since the fallback can boot at either form; see
  `handleRoute` in `src/core/router/router.ts`. Deep-link refresh is guarded
  end-to-end by `e2e/deep-link.spec.js`.
- Routes are registered in `src/main.ts` against the `Router` class in
  `src/core/router/router.ts`.

## CI/CD

- `.github/workflows/ci.yml` — typecheck, unit tests, e2e tests on every
  PR to `main` (and manually via `workflow_dispatch`). Runs on PRs only so
  the full suite isn't duplicated with `deploy.yml` on pushes to `main`,
  which re-runs the same checks before deploying. Adapted from boba's own
  CI, plus a `tsgo` typecheck step boba's upstream example doesn't run.
- `.github/workflows/deploy.yml` — runs on push to `main` only: same checks,
  then `npm run build` and deploy via `actions/deploy-pages` (not a
  `gh-pages` branch push). This requires the repo's Settings → Pages →
  "Build and deployment" source set to **GitHub Actions** (`build_type:
  workflow`). The repo is **public** — Pages via Actions needs that (or a
  paid plan for private repos; the GitHub API rejects the `workflow` source
  on a private repo on the free plan with a 422).
- Both jobs run inside the `mcr.microsoft.com/playwright:v1.61.1-noble`
  container image, matching the `@playwright/test` version pinned in
  `package.json`; bump both together.

### Repo settings (not in the tree — record here so they aren't rediscovered)

- **Pages source**: GitHub Actions (`build_type: workflow`). Serving the
  `main` branch root instead would try to load the raw `src/main.ts` from
  `index.html` and break, since Pages has no build step of its own.
- **`main` is a protected branch**: PRs required before merging (0 approvals
  — solo repo), the `test` status check (from `ci.yml`) must pass and the
  branch must be up to date (`strict`), conversation resolution required,
  force-push and deletion blocked. `enforce_admins` is off, so the owner
  keeps an emergency bypass — don't rely on it for normal changes.

### Landing a change (the standard workflow)

Because `main` is protected, you cannot push to it directly. Every change
lands the same way:

1. Branch off `main`: `git checkout -b <type>/<slug>` (e.g. `fix/…`, `feat/…`).
2. Make the change (TDD for new logic — see Testing below).
3. **Run the full pipeline locally and get it green first**: `make ci`
   (install → typecheck → build → unit → e2e, in the Apple `container`
   runtime — the same steps `ci.yml`/`deploy.yml` run). `make -n ci` is a
   dry run that only *prints* the commands; it proves nothing. Do not
   commit until real `make ci` passes.
4. Commit, then `git push -u origin <branch>`.
5. Open a PR to `main` (`gh pr create`). `ci.yml` runs the `test` check on
   the PR; it must go green (and the branch must be up to date with `main`)
   before the PR is mergeable. No reviewer approval is required.
6. Merge the PR. The merge is a push to `main`, which triggers `deploy.yml`
   → build + deploy to Pages. Confirm that run is green.

`gh act` is installed but **cannot** run these workflows here (it needs a
Docker-API socket; the Apple `container` CLI doesn't expose one). `make ci`
is the local mirror — use it, not `act`.

## Adding a page

1. New folder under `src/components/<name>-page/` with `.html`/`.css`/`.ts`,
   following the existing pages (e.g. `projects-page`). Use kebab-case for the
   custom element tag name.
2. Register the route in `src/main.ts`.
3. Include `<site-header></site-header>` at the top of the page's markup
   unless it's `home-page`, which has its own embedded nav instead.

## content/ vs public/ — the split that matters

- **`content/`** is authored source that the build **compiles into JSON**
  (`src/generated/*.json`) and bundles into the JS — markdown, plus the
  `publications.bib` build *input*. None of it is served as a file; it
  becomes data. This is the single source-of-truth tree for everything you
  write.
- **`public/`** is **served binaries only** — the downloadable PDFs Vite
  copies verbatim into `dist/` (`public/research/<publications|preprints|
  planned>/*.pdf`), fetched by URL at runtime. A PDF is a binary the browser
  downloads; it *cannot* be compiled into JSON, so it must live here.

Don't put authored text in `public/` (it'd ship to `dist/` uncompiled), and
don't expect a PDF in `content/` to be served (nothing copies it).

## Research page / PDFs

`research-page.ts` renders `src/generated/research.json` (nothing is
hardcoded), grouped into three sections by `category`: `publication`,
`preprint`, `planned` (only sections with entries render; `publication`
always renders, carrying the Scholar/ORCID links). Each entry is
`kind: 'pdf'` (a filename served from `public/research/<publications|
preprints|planned>/` matching its `category` — resolves to
`<BASE_URL>research/<category-folder>/<file>`) or `kind: 'article'` (a full
external URL). Both open in a new tab. Publications come from the bib+ORCID
pipeline below; planned items are authored markdown (also below).

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
- `content/about/autobio.md` → `src/generated/about.json` (shape
  `{ author?, date?, paragraphs }`), imported by `about-page.ts`.
  Frontmatter is **optional** (`parseAboutBio`): an `author:`/`date:` block
  (colon-style, like perspectives) is stripped and surfaced as a byline on
  the About page; with no frontmatter the whole file is plain prose and no
  byline renders. Don't leave frontmatter unparsed — plain `splitParagraphs`
  would render the `---` block as visible text.
- `content/projects/<slug>.md` — one file per project (add one by dropping
  a new `<slug>.md` here; the display title comes from the `title` field,
  not the filename). INI-flavoured frontmatter, not the flat `key: value`
  the other content types use: `title` (required) and `date` (optional) as
  plain `key = value` lines, plus zero or more `[artifact.N]` sections
  (`kind`/`label`/`url`), each becoming one entry in a project's
  `artifacts` list — a project can have a GitHub repo *and* a firmware
  repo *and* a demo *and* a paper without being limited to one of each.
  `kind` is a free string, not an enum, on purpose: hardware/dataset/
  academic projects need kinds a fixed list can't anticipate (`cad`,
  `dataset`, `conops`, ...); an omitted `kind` defaults to `'link'`. INI
  over nested YAML deliberately — same "list of records" shape, but no
  indentation-sensitive parsing and no YAML dependency (see
  `scripts/lib/manifest.ts`'s `parseIniFrontmatter`/`parseWorkManifest`).
  Body below the closing `---` is the summary, parsed the same way as
  everywhere else (`splitParagraphs`). → `src/generated/projects.json`,
  imported by `projects-page.ts`. Newest `date` first; a project needs no
  `date` if ordering doesn't matter. (Projects are flat files, not a folder
  per project — one that ever needs colocated local assets would be a
  future special case.)
- `content/writing/<slug>.md` — screenplays, essays, longer-form writing.
  **Same INI manifest shape and parser as projects** (`parseWorkManifest`),
  just a separate section/collection: → `src/generated/writing.json`,
  imported by `writing-page.ts`. The directory ships empty (a `.gitkeep`)
  with a graceful empty-state on the page; drop a `<slug>.md` in to populate
  it. Projects vs Writing is the deliberate taxonomy split — software/builds
  vs creative/long-form text — even though they share a renderer.
- `content/research/planned/<slug>.md` — authored "planned/in-progress"
  research items, same INI frontmatter as a work manifest but with only
  flat fields (no `[artifact.N]` sections): `title` (required), plus
  optional `date`, `venue`, `kind` (`pdf`|`article`, default `article`),
  and `href`. `kind = pdf` → `href` is a filename served from
  `public/research/planned/`; `kind = article` → `href` is a URL; omit both
  for a text-only entry. Body = summary. Parsed by `parsePlannedResearch`
  (`scripts/lib/research-content.ts`) and folded into `research.json` with
  `category: 'planned'`.
- `content/research/publications.bib` + a live call to the ORCID public API
  → merged, deduped, and written (with the planned items above) to
  `src/generated/research.json`, imported by `research-page.ts`. The `.bib`
  is a build input under `content/` (compiled, not served); an absent bib
  or unreachable ORCID degrades to an empty published list. This used to be
  a live `fetch()` in the browser on every page load; moving it to build
  time means visitors no longer hit ORCID's API directly.

All of these are produced by `scripts/generate-content.ts` (parsing helpers
live in `scripts/lib/`), run via the `content:generate` npm script, wired
as a `predev`/`prestart`/`prebuild`/`pretypecheck` hook so
`src/generated/*.json` always exists before Vite or tsgo needs to resolve
it — `resolveJsonModule` makes those imports type-check, but only once
the files are actually on disk, so any new npm script that touches code
importing from `src/generated/` needs the same `pre<script>` treatment.

The `pre*` hooks only run once, at startup, so on their own they wouldn't
catch edits made to `content/*.md` while `make dev` is already running.
`vite.config.ts` closes that gap with a small dev-only plugin
(`watchContentPlugin`) that adds `content/perspectives/`,
`content/about/autobio.md`, `content/projects/`, and `content/writing/` to
Vite's own already-running file watcher and calls the matching granular
`regeneratePerspectives()`/`regenerateAboutBio()`/`regenerateProjects()`/
`regenerateWriting()` function (exported from `scripts/generate-content.ts`)
in-process when one changes — no new file-watching dependency, no second
terminal/container.
Research (`regenerateResearch()`) is deliberately **not** wired into this
watcher: it hits the ORCID API, so it stays a startup-only regeneration —
edits to `content/research/planned/*.md` or `publications.bib` need a
`make dev` restart to show up. The plugin only runs for `vite`'s dev server
(`configureServer`), not `build`/`preview`.
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
