import { defineConfig, type Plugin } from 'vite';
import path from 'node:path';
import {
  PERSPECTIVES_DIR,
  ABOUT_BIO_PATH,
  PROJECTS_DIR,
  regeneratePerspectives,
  regenerateAboutBio,
  regenerateProjects,
} from './scripts/generate-content.ts';

const DEBOUNCE_MS = 200;

const WATCHED_SOURCES = [
  {
    watchPath: PERSPECTIVES_DIR,
    isMatch: (file: string) => file.includes(`/${PERSPECTIVES_DIR}/`),
    regenerate: regeneratePerspectives,
  },
  {
    watchPath: ABOUT_BIO_PATH,
    isMatch: (file: string) => file.endsWith(`/${ABOUT_BIO_PATH}`),
    regenerate: regenerateAboutBio,
  },
  {
    watchPath: PROJECTS_DIR,
    isMatch: (file: string) => file.includes(`/${PROJECTS_DIR}/`),
    regenerate: regenerateProjects,
  },
];

/**
 * Dev-only: regenerates src/generated/*.json when content/*.md changes,
 * using Vite's own already-running file watcher (no new dependency).
 * `content:generate`'s one-shot run (via the predev npm hook) covers
 * startup; this covers edits made while `make dev` is already running.
 * Not used for build/preview — configureServer only runs for `vite dev`.
 */
function watchContentPlugin(): Plugin {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    name: 'watch-content',
    configureServer(server) {
      server.watcher.add(WATCHED_SOURCES.map((source) => source.watchPath));

      server.watcher.on('change', (file) => {
        const normalized = file.split(path.sep).join('/');
        if (!normalized.endsWith('.md')) return;

        const source = WATCHED_SOURCES.find((candidate) => candidate.isMatch(normalized));
        if (!source) return;

        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          source
            .regenerate()
            .catch((error) => console.error('[watch-content] Regeneration failed:', error));
        }, DEBOUNCE_MS);
      });
    },
  };
}

export default defineConfig({
  plugins: [watchContentPlugin()],
  server: {
    // Dev always runs inside a container (see Makefile) with the repo
    // bind-mounted from the host. Native file-change notifications
    // (inotify) frequently don't propagate across that boundary on macOS,
    // so the watcher falls back to polling (stat-based, works regardless
    // of how the mount delivers change events).
    watch: {
      usePolling: true,
    },
  },
});
