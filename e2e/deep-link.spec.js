import { test, expect } from '@playwright/test';

// Regression guard for the deep-link hard-refresh bug: on GitHub Pages a hard
// refresh at a subpath serves the SPA-fallback 404.html (a copy of index.html)
// at that deep URL. Two things used to break there:
//   1. `vite build --base ./` emitted *relative* asset URLs, so `./assets/x`
//      resolved against `/research/` → `/research/assets/x` → 404 → blank page.
//   2. the router matched `^/research$`, so the trailing slash fell through to
//      the 404 view even once assets loaded.
// This loads a deep path *with a trailing slash* (the reported case) directly,
// as a hard navigation would, and asserts the page renders with no failed
// same-origin requests. Runs under both the dev and built-dist projects.

test('deep-link hard refresh (trailing slash) renders with no 404s', async ({ page, baseURL }) => {
  const failed = [];
  page.on('response', (response) => {
    const url = response.url();
    if (url.startsWith(baseURL) && response.status() >= 400) {
      failed.push(`${response.status()} ${url}`);
    }
  });

  await page.goto('/research/');

  // The route resolved to the research page (not the 404 view)...
  await expect(page.locator('research-page h1')).toHaveText('Research');
  // ...and every asset the page pulled in loaded.
  expect(failed, `Failed same-origin requests:\n${failed.join('\n')}`).toEqual([]);
});
