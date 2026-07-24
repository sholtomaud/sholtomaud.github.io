import { test, expect } from '@playwright/test';

test('home page loads with name and section nav', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Sholto Maud');
  await expect(page.locator('home-page .name')).toContainText('Sholto Maud');
  await expect(page.locator('a[data-nav]', { hasText: 'Research' })).toBeVisible();
});

test('client-side navigation to Research works', async ({ page }) => {
  await page.goto('/');
  await page.click('a[data-nav]:has-text("Research")');
  await expect(page).toHaveURL(/\/research$/);
  await expect(page.locator('research-page h1')).toHaveText('Research');
});

test('About page renders bio content and links out to AI perspectives', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('about-page h1')).toHaveText('About');

  // Content-agnostic: just confirms content/about/bio.md was picked up and
  // rendered, not any particular wording — bio text is expected to change.
  const introText = await page.locator('about-page .page__intro').first().textContent();
  expect(introText?.trim().length).toBeGreaterThan(0);

  await page.click('a[data-nav]:has-text("Claude")');
  await expect(page).toHaveURL(/\/about\/claude$/);
  // "Sholto Maud, according to ..." is a static template in perspective-page.ts;
  // deliberately not asserting the author name, which is editable content.
  await expect(page.locator('perspective-page h1')).toContainText('Sholto Maud, according to');
});

test('site-header nav exposes all four sections on inner pages', async ({ page }) => {
  await page.goto('/research');
  const nav = page.locator('site-header nav a[data-nav]');
  await expect(nav).toHaveText(['Research', 'Works', 'Contact', 'About']);
});

test('client-side navigation to Works lists at least one project', async ({ page }) => {
  await page.goto('/');
  await page.click('a[data-nav]:has-text("Works")');
  await expect(page).toHaveURL(/\/works$/);
  await expect(page.locator('works-page h1')).toHaveText('Works');
  // Content-agnostic: just confirms the works list rendered something,
  // not which/how many projects are listed — that's editable content.
  await expect(page.locator('works-page .work-item__title').first()).toBeVisible();
});

test('Contact page fills in the email link at runtime', async ({ page }) => {
  await page.goto('/contact');
  const emailLink = page.locator('contact-page #email-link');
  const text = await emailLink.textContent();
  // Content-agnostic: checks the assembled address is well-formed and that
  // href/text agree, without pinning the specific address, which may change.
  expect(text).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  await expect(emailLink).toHaveAttribute('href', `mailto:${text}`);
});
