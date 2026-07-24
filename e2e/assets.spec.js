import { test, expect } from '@playwright/test';

test('no absolute asset paths in index.html', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  const { absoluteLinks, absoluteScripts } = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('link[href]'));
    const absoluteLinks = links
      .map((link) => link.getAttribute('href'))
      .filter((href) => href && href.startsWith('/') && !href.startsWith('//'));

    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const absoluteScripts = scripts
      .map((script) => script.getAttribute('src'))
      .filter(
        (src) =>
          src &&
          src.startsWith('/') &&
          !src.startsWith('//') &&
          !src.startsWith('/@vite/')
      );

    return { absoluteLinks, absoluteScripts };
  });

  expect(absoluteLinks, `Found absolute links: ${absoluteLinks}`).toEqual([]);
  expect(
    absoluteScripts,
    `Found absolute scripts: ${absoluteScripts}`
  ).toEqual([]);
});
