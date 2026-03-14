import { test, expect } from '@playwright/test';

test('verify cash history settings', async ({ page }) => {
  page.on('console', msg => console.log(`Browser Console: ${msg.text()}`));

  await page.goto('http://localhost:5173'); // Go to root to handle auth

  await page.waitForTimeout(3000); // Give the app boot time

  // It's likely blocked by regular login page first
  const mainLoginInput = page.locator('input[placeholder="Введите PIN-код"]');
  if (await mainLoginInput.isVisible()) {
      console.log('Logging in to main app...');
      await mainLoginInput.fill('0000'); // Assuming a default admin pin
      await page.waitForTimeout(1000);
  }

  await page.goto('http://localhost:5173/settings');
  await page.waitForTimeout(3000);

  const passwordInput = page.locator('input[type="password"]');
  if (await passwordInput.isVisible()) {
      await passwordInput.fill('admin');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000); // wait for validation
  }

  // Ensure settings tabs are loaded
  await page.waitForSelector('text=Общие', { timeout: 10000 });

  // Click Cash Tab
  await page.click('button[value="cash"]');

  // Let React render completely
  await page.waitForTimeout(2000);

  // Take screenshot of the shifts dashboard
  await page.screenshot({ path: '/home/jules/verification/shifts_dashboard.png', fullPage: true });

  // Also wait for tab list to load and click on "Транзакции"
  await page.click('button:has-text("Транзакции")');
  await page.waitForTimeout(1000); // Give it half a sec to switch and render

  await page.screenshot({ path: '/home/jules/verification/transactions_dashboard.png', fullPage: true });

});