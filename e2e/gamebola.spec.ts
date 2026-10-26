import { test, expect } from '@playwright/test';

test.describe('GOAL RUSH PWA Vertical Slice', () => {
  test('complete core loop: create club, edit tactics, start quick match, see replay & stats, refresh persist', async ({ page }) => {
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // 1. Open App
    await page.goto('/');

    // Verify Club Creation Modal appears
    await expect(page.locator('text=Create Your Football Club')).toBeVisible();

    // 2. Fill Club Name and Create Club
    const nameInput = page.locator('input[placeholder="e.g. Metro Stars FC"]');
    await nameInput.fill('Garuda Rovers FC');

    // Select a crest
    await page.locator('button:has-text("Thunder")').first().click();

    // Submit
    const createBtn = page.locator('button:has-text("Found Club & Generate Squad")');
    await createBtn.click();

    // 3. Home Screen Loaded
    await expect(page.locator('h1, h2').filter({ hasText: 'Garuda Rovers FC' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Squad Leaders')).toBeVisible();

    // 4. Navigate to Squad Tab & Edit Tactics
    await page.getByRole('button', { name: 'Squad', exact: true }).click();
    await expect(page.locator('text=Tactical Pitch')).toBeVisible();

    // Switch formation to 4-4-2
    await page.locator('button:has-text("4-4-2")').click();

    // Switch tactics to Attacking
    await page.locator('button:has-text("Attacking")').click();

    // Verify Starting XI is valid
    await expect(page.locator('text=Starting XI Valid')).toBeVisible();

    // 5. Navigate to Match Tab & Start Quick Match
    await page.getByRole('button', { name: 'Match', exact: true }).click();
    await expect(page.locator('text=Quick Match Simulator')).toBeVisible();

    // Kick off Match Simulation
    const kickOffBtn = page.locator('button:has-text("Kick Off Match Simulation")');
    await kickOffBtn.click();

    // 6. Verify Match Replay Canvas and Scoreboard
    await expect(page.locator('#phaser-match-container canvas')).toBeVisible();
    await expect(page.locator('button[title="Pause"], button[title="Resume"]')).toBeVisible();

    // Test replay speed toggle to 4x
    await page.locator('button:has-text("4x")').click();

    // Open Stats Breakdown
    const statsBtn = page.locator('button:has-text("Stats")');
    await statsBtn.click();
    await expect(page.locator('text=Match Statistics')).toBeVisible();
    await expect(page.locator('text=Possession')).toBeVisible();

    // Return Home
    await page.locator('button:has-text("Return Home")').click();

    // 7. Verify match is recorded in Recent Matches
    await expect(page.locator('text=Recent Matches')).toBeVisible();

    // 8. Refresh and verify data is restored from IndexedDB
    await page.reload();
    await expect(page.locator('h1, h2').filter({ hasText: 'Garuda Rovers FC' }).first()).toBeVisible({ timeout: 10000 });
  });
});
