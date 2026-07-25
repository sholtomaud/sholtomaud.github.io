import { test, expect } from '@playwright/test';

// Regression guard for the class of bug where a rendered PDF link resolves to
// a path that isn't actually served — e.g. research-page.ts links to
// /research/planned/preface.pdf while the asset still sits under
// /research/wip/. That mismatch only showed up once deployed (a 404), because
// the link generation and the file path are edited independently. This test
// crawls the content pages, collects every local (same-origin) PDF link the
// app actually renders, and asserts each one is fetchable (HTTP 200).
//
// It runs under both Playwright projects: `chromium` (the Vite dev server,
// serving public/ live) and `production` (the built dist/ via `vite preview`,
// which is what GitHub Pages ships) — so a link that resolves in dev but not
// in the build is caught too.

// Client routes whose rendered markup may contain PDF links, each paired with
// the custom element it mounts so we can wait for render before scanning.
const PAGES = [
  { route: '/', el: 'home-page' },
  { route: '/research', el: 'research-page' },
  { route: '/projects', el: 'projects-page' },
  { route: '/about', el: 'about-page' },
  { route: '/contact', el: 'contact-page' },
];

test('every local PDF link on the site resolves (no 404s)', async ({ page, request, baseURL }) => {
  const pdfUrls = new Set();

  for (const { route, el } of PAGES) {
    await page.goto(route);
    // Wait for the route's component to mount before reading its anchors,
    // rather than racing the client router.
    await page.locator(el).waitFor({ state: 'attached' });

    // a.href is already absolute (resolved against the page origin). Keep only
    // same-origin PDFs — external article/link URLs aren't ours to guarantee
    // and would make this test flaky / offline-dependent.
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((a) => a.href));
    for (const href of hrefs) {
      if (/\.pdf(?:[?#]|$)/i.test(href) && href.startsWith(baseURL)) {
        pdfUrls.add(href);
      }
    }
  }

  // Zero local PDFs is a legitimate state — planned/research items are
  // authored markdown and may link nothing, a PDF, or an external article.
  // So we don't require any to exist; we only assert that whatever PDF links
  // the site *does* render actually resolve. (Research-page rendering itself
  // is covered by the smoke and deep-link specs.)
  const broken = [];
  for (const url of pdfUrls) {
    const response = await request.get(url);
    const contentType = response.headers()['content-type'] ?? '';
    // A status check alone is NOT enough: the Vite dev server and `vite
    // preview` both fall back to serving index.html with HTTP 200 for a
    // missing asset path (GitHub Pages returns 404 instead). So a broken link
    // looks "200 OK" locally while 404ing once deployed. Require the response
    // to actually be a PDF — an HTML fallback fails this even at status 200.
    if (!response.ok() || !/pdf/i.test(contentType)) {
      broken.push({ url, status: response.status(), contentType });
    }
  }

  expect(broken, `Broken PDF links:\n${JSON.stringify(broken, null, 2)}`).toEqual([]);
});
