import { test, expect } from '@playwright/test';

// The site is served at the domain root, and a deep-link hard refresh boots
// from the SPA-fallback 404.html at e.g. /research/. For that to work, the
// built index.html must reference its assets by *root-absolute* path
// (/assets/…) — a relative ./assets/… resolves against the deep path
// (/research/assets/…) and 404s, blanking the page. This guards the built
// output (the 'production' project); the dev server's index.html still points
// at the raw src/main.ts, which isn't a built asset and is expected to differ.
test('built index.html references assets by root-absolute path', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'production', 'checks the built dist/ output');

  await page.goto('/', { waitUntil: 'networkidle' });

  const relativeRefs = await page.evaluate(() => {
    const refs = [
      ...Array.from(document.querySelectorAll('script[src]'), (el) => el.getAttribute('src')),
      ...Array.from(document.querySelectorAll('link[href]'), (el) => el.getAttribute('href')),
    ].filter((u) => u && !/^(https?:|data:|\/\/|#)/.test(u));
    // Local refs only; every one must be root-absolute (start with '/').
    return refs.filter((u) => !u.startsWith('/'));
  });

  expect(
    relativeRefs,
    `Relative asset refs (must be root-absolute for deep-link refresh): ${relativeRefs}`
  ).toEqual([]);
});
