import { test, expect } from '@playwright/test';

test.describe('AdSync E2E Signup-to-Publish Campaign Flow', () => {
  test('should complete full signup -> connect -> campaign wizard -> publish flow', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `e2e_${timestamp}@example.com`;
    const testPassword = 'Password123!';
    const testName = 'Playwright Tester';

    // 1. Signup
    await page.goto('/signup');
    await page.fill('input[placeholder="Jane Doe"]', testName);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);

    await expect(page.locator('h1')).toContainText("Playwright Tester's Workspace");

    // 2. Navigate to Connections via Client Sub-Nav Link
    await page.click('a[href="/dashboard/connections"]');
    await expect(page.locator('h1')).toContainText('Ad Platform Connections');

    // 3. Navigate to Campaign Wizard
    await page.click('a[href="/dashboard/campaigns"]');
    await expect(page.locator('h1')).toContainText('Campaigns');

    await page.click('a[href="/dashboard/campaigns/new"]');
    await expect(page.locator('h1')).toContainText('Create New Campaign');

    // Step 1: Objective & Name
    await page.fill('input[placeholder="e.g. Summer Sale 2024"]', 'E2E Campaign 2026');
    await page.click('button:has-text("Meta Ads")');
    await page.click('button:has-text("LEADS")');
    await page.click('button:has-text("Next Step")');

    // Step 2: Audience
    await page.click('button:has-text("Next Step")');

    // Step 3: Budget
    await page.click('button:has-text("Next Step")');

    // Step 4: Creative
    await page.fill('input[placeholder="Enter a catchy headline"]', 'E2E Catchy Headline');
    await page.fill('textarea[placeholder="Describe your offer or product"]', 'E2E Great Offer Description');
    await page.click('button:has-text("Next Step")');

    // Step 5: Review & Launch
    await Promise.all([
      page.waitForURL(/\/dashboard\/campaigns\//, { timeout: 10000 }),
      page.click('button:has-text("Launch Campaign")'),
    ]);

    await expect(page.locator('h1')).toContainText('E2E Campaign 2026');
  });
});
