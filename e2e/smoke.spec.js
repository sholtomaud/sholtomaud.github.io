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

  // Content-agnostic: just confirms content/about/autobio.md was picked up and
  // rendered, not any particular wording — bio text is expected to change.
  const introText = await page.locator('about-page .page__intro').first().textContent();
  expect(introText?.trim().length).toBeGreaterThan(0);
  // The frontmatter block must be stripped, not rendered as prose.
  expect(introText).not.toMatch(/^---/);
  expect(introText).not.toContain('author:');
  // The byline (from the bio's author/date frontmatter) renders.
  await expect(page.locator('about-page .about-bio__byline')).toHaveText(/^—\s*\S/);

  await page.click('a[data-nav]:has-text("Claude")');
  await expect(page).toHaveURL(/\/about\/claude$/);
  // "Sholto Maud, according to ..." is a static template in perspective-page.ts;
  // deliberately not asserting the author name, which is editable content.
  await expect(page.locator('perspective-page h1')).toContainText('Sholto Maud, according to');
});

test('unknown route shows the styled 404 page (black on white)', async ({ page }) => {
  await page.goto('/definitely-not-a-real-page');
  await expect(page.locator('.route-404 .route-404__code')).toHaveText('404');
  await expect(page.locator('.route-404 .route-404__home')).toBeVisible();
  // The 404 is the light inverse of the dark site: white page, black code.
  const bg = await page
    .locator('.route-404')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(255, 255, 255)');
});

test('site-header nav exposes all four sections on inner pages', async ({ page }) => {
  await page.goto('/research');
  const nav = page.locator('site-header nav a[data-nav]');
  await expect(nav).toHaveText(['Research', 'Projects', 'Contact', 'About']);
});

test('client-side navigation to Projects lists at least one project', async ({ page }) => {
  await page.goto('/');
  await page.click('a[data-nav]:has-text("Projects")');
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('projects-page h1')).toHaveText('Projects');
  // Content-agnostic: just confirms the projects list rendered something,
  // not which/how many projects are listed — that's editable content.
  await expect(page.locator('projects-page .project-item__title').first()).toBeVisible();
});

test('Contact page reveals the email only on interaction', async ({ page }) => {
  await page.goto('/contact');
  const emailLink = page.locator('contact-page #email-link');
  const emailLabel = page.locator('contact-page #email-link .page__link-label');

  // Before any interaction the address must not be in the DOM at all — the
  // link shows only its placeholder and doesn't point at a mailto: yet. This
  // is the anti-harvesting guarantee: a page-loading scraper sees nothing.
  await expect(emailLabel).toHaveText('Email');
  await expect(emailLink).toHaveAttribute('href', '#');
  // No harvestable mailto: anywhere in the rendered markup before interaction.
  // (Checking for a literal '@' would be fragile — the component injects its
  // CSS into a <style> block in this same markup, and an @media rule would
  // trip it; 'mailto:' is the artifact that actually matters here.)
  const markupBefore = await page.locator('contact-page').innerHTML();
  expect(markupBefore).not.toContain('mailto:');

  // Focusing the link (keyboard tab) reveals it. Content-agnostic: checks the
  // assembled address is well-formed and that href/text agree, without pinning
  // the specific address, which may change.
  await emailLink.focus();
  const text = await emailLabel.textContent();
  expect(text).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  await expect(emailLink).toHaveAttribute('href', `mailto:${text}`);
});
