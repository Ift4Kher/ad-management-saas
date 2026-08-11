/**
 * E2E test: Homepage health check and language toggle.
 *
 * Trivial passing test confirming Playwright runner works.
 * Tests that the homepage loads and displays expected content.
 */
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display AdSync branding and health status', async ({ page }) => {
    await page.goto('/');

    // Verify the app name appears
    await expect(page.locator('text=AdSync')).toBeVisible();

    // Verify the health status section exists
    await expect(page.locator('text=System Status')).toBeVisible();
  });

  test('should render the language toggle button', async ({ page }) => {
    await page.goto('/');

    // The toggle should be visible (shows বাং when in English mode)
    const toggle = page.locator('button[aria-label*="Switch language"]');
    await expect(toggle).toBeVisible();
  });
});
