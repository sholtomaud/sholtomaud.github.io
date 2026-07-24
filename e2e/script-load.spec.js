import { test, expect } from '@playwright/test';

test('no module script load failures', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  const moduleErrors = errors.filter(
    (error) =>
      error.includes('Failed to load module script') ||
      error.includes('MIME type') ||
      error.includes('strict MIME type checking')
  );

  expect(
    moduleErrors,
    `Found module loading errors: ${moduleErrors.join(', ')}`
  ).toEqual([]);
});
