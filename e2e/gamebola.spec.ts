import { test, expect } from '@playwright/test';

test.describe('MainBola PWA Vertical Slice', () => {
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

    // Verify v0.7.0 Tactical Role badge on player card
    const roleBadgeBtn = page.locator('button:has-text("Poacher"), button:has-text("Stopper"), button:has-text("Playmaker")').first();
    if (await roleBadgeBtn.isVisible()) {
      await roleBadgeBtn.click();
      await expect(page.locator('text=Peranan Taktikal Pemain')).toBeVisible();
      await page.getByRole('button', { name: 'Kekalkan Pilihan Sedia Ada' }).click();
      await expect(page.locator('text=Peranan Taktikal Pemain')).not.toBeVisible();
    }

    // 5. Navigate to Match Tab & Start Quick Match
    await page.getByRole('button', { name: 'Match', exact: true }).click();
    await expect(page.locator('text=Quick Match Simulator')).toBeVisible();

    // Verify v0.6.0 Weather indicator, Press Conference, and PvP buttons
    await expect(page.locator('text=Ramalan Cuaca Padang')).toBeVisible();
    await expect(page.locator('text=Sidang Media Pra-Perlawanan')).toBeVisible();
    await expect(page.locator('text=Cabaran PvP (Lawan Rakan)')).toBeVisible();

    // Verify v0.7.0 Scouting Report Modal
    const scoutBtn = page.getByRole('button', { name: 'Semak' });
    await expect(scoutBtn).toBeVisible();
    await scoutBtn.click();
    await expect(page.locator('text=Laporan Pengakap Lawan')).toBeVisible();
    await page.getByRole('button', { name: 'Faham & Rangka Taktik' }).click();
    await expect(page.locator('text=Laporan Pengakap Lawan')).not.toBeVisible();

    // Verify v0.7.0 Scenario Challenge Modal
    const scenarioBtn = page.getByRole('button', { name: 'Pilih Misi' });
    await expect(scenarioBtn).toBeVisible();
    await scenarioBtn.click();
    await expect(page.locator('text=Misi Keajaiban (Mod Senario)')).toBeVisible();
    await page.locator('div[role="dialog"] button, .fixed button').filter({ hasText: '' }).first().click();

    // Test Press Conference Modal
    const pressBtn = page.getByRole('button', { name: 'Masuk' });
    await expect(pressBtn).toBeVisible();
    await pressBtn.click();
    await expect(page.locator('text=Pilih Jawapan Pengurus:')).toBeVisible();
    // Select first answer
    await page.locator('button:has-text("Moral")').first().click();
    await expect(page.locator('text=Kenyataan Diterbitkan:')).toBeVisible();
    await page.locator('button:has-text("Kembali Ke Persediaan Perlawanan")').click();

    // Kick off Match Simulation
    const kickOffBtn = page.locator('button:has-text("Kick Off Match Simulation")');
    await kickOffBtn.click();

    // 6. Verify Match Replay Canvas and Scoreboard
    await expect(page.locator('#phaser-match-container canvas')).toBeVisible();
    await expect(page.locator('button[title="Pause"], button[title="Resume"]')).toBeVisible();

    // Test replay speed toggle to 4x
    await page.locator('button:has-text("4x")').click();

    // Test audio toggle (v0.4.0)
    const audioBtn = page.getByTestId('sound-toggle');
    await expect(audioBtn).toBeVisible();
    await audioBtn.click();

    // Test commentary voice toggle (v0.7.0)
    const voiceBtn = page.getByTestId('commentary-voice-toggle');
    await expect(voiceBtn).toBeVisible();
    await voiceBtn.click();

    // Test stadium ambience toggle and volume slider (v0.7.1)
    const bgSoundBtn = page.getByTestId('bg-sound-toggle');
    await expect(bgSoundBtn).toBeVisible();
    await bgSoundBtn.click();

    const audioSlidersBtn = page.getByTestId('audio-sliders-toggle');
    await expect(audioSlidersBtn).toBeVisible();
    await audioSlidersBtn.click();
    await expect(page.locator('text=Kelantangan Bunyi Latar Stadium')).toBeVisible();

    // Open Stats Breakdown
    const statsBtn = page.locator('button:has-text("Stats")');
    await statsBtn.click();
    await expect(page.locator('text=Statistik Perlawanan')).toBeVisible();
    await expect(page.locator('text=Penguasaan Bola')).toBeVisible();
    await expect(page.locator('text=Pemain Terbaik Perlawanan (MOTM)')).toBeVisible();

    // Return Home
    await page.locator('button:has-text("Return Home")').click();

    // 7. Verify match is recorded in Recent Matches
    await expect(page.locator('text=Recent Matches')).toBeVisible();

    // 8. Refresh and verify data is restored from IndexedDB
    await page.reload();
    await expect(page.locator('h1, h2').filter({ hasText: 'Garuda Rovers FC' }).first()).toBeVisible({ timeout: 10000 });

    // 9. Phase 2: Navigate to League Tab and Create Private League
    await page.getByRole('button', { name: 'League', exact: true }).click();
    await expect(page.locator('text=Private Leagues')).toBeVisible();

    const leagueNameInput = page.locator('input[placeholder="e.g. Premier Cup, Super 4"]');
    await leagueNameInput.fill('Champions Cup');

    const foundLeagueBtn = page.locator('button:has-text("Found League & Schedule Fixtures")');
    await foundLeagueBtn.click();

    // Verify League Header and Standings
    await expect(page.locator('text=Champions Cup')).toBeVisible();
    await expect(page.locator('text=League Table')).toBeVisible();
    await expect(page.locator('td').filter({ hasText: 'Garuda Rovers FC' })).toBeVisible();

    // Verify v0.7.0 Team of the Week (TOTW)
    const totwBtn = page.getByRole('button', { name: 'Lihat TOTW' });
    if (await totwBtn.isVisible()) {
      await totwBtn.click();
      await expect(page.locator('text=Pasukan Terbaik Mingguan (TOTW)')).toBeVisible();
      await page.getByRole('button', { name: 'Tutup Senarai TOTW' }).click();
    }

    // Switch to Fixtures Tab
    await page.locator('button:has-text("Fixtures")').click();
    await expect(page.locator('text=Round 1')).toBeVisible();

    // Lock in Tactics
    const lockTacticsBtn = page.locator('button:has-text("Lock In Tactics")').first();
    if (await lockTacticsBtn.isVisible()) {
      await lockTacticsBtn.click();
      await expect(page.locator('text=Tactics Submitted').first()).toBeVisible();
    }

    // Simulate Matchday 1
    const simMatchdayBtn = page.locator('button:has-text("Simulate Matchday")');
    await simMatchdayBtn.click();

    // Verify Round advances to Round 2
    await expect(page.locator('button:has-text("Round 2")')).toBeVisible();

    // Verify Watch Replay button is visible for played fixture
    await page.locator('button:has-text("Round 1")').click();
    const watchReplayBtn = page.locator('button:has-text("Watch Replay")').first();
    await expect(watchReplayBtn).toBeVisible();
    await watchReplayBtn.click();

    // Replay modal opened
    await expect(page.locator('text=Matchday 1 Replay')).toBeVisible();
    await page.locator('button:has-text("Close Replay")').click();

    // 10. Phase 3: Player Training & Transfer Market Flow
    await page.getByRole('button', { name: 'Squad', exact: true }).click();

    // Go to Training Ground sub-tab
    await page.getByRole('button', { name: 'Latihan', exact: true }).click();
    await expect(page.locator('text=Klinik Fisioterapi Pasukan')).toBeVisible();
    await expect(page.locator('text=Pilih Modul Latihan')).toBeVisible();

    // Run training drill on first player
    const trainFirstBtn = page.getByRole('button', { name: 'Latih', exact: true }).first();
    await trainFirstBtn.click();
    await expect(page.locator('text=complete')).toBeVisible();

    // Go to Transfer Market sub-tab
    await page.getByRole('button', { name: 'Pasaran', exact: true }).click();
    await expect(page.locator('text=Pusat Pemindahan & Bakat')).toBeVisible();
    await expect(page.locator('text=Calon Bakat Ditemui Pengakap')).toBeVisible();

    // Sign a scouted transfer player if funds permit, or inspect market
    const signBtn = page.getByRole('button', { name: /Tandatangani/ }).first();
    if (await signBtn.isVisible()) {
      await signBtn.click();
      await expect(page.locator('text=Signed')).toBeVisible();
      await expect(page.locator('text=Kapasiti Skuad: 16 / 20')).toBeVisible();
    } else {
      // All targets exceeded budget, switch to Jual Pemain tab to verify sell market functionality
      await page.getByRole('button', { name: /Jual Pemain/ }).first().click();
      await expect(page.locator('text=Kapasiti Skuad: 15 / 20')).toBeVisible();
    }

    // 11. Phase 4: Trophy Cabinet in Profile Tab
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await expect(page.locator('text=Kabinet Trofi & Pencapaian')).toBeVisible();
    await expect(page.locator('text=Juara Liga')).toBeVisible();
    await expect(page.locator('text=Kasut Emas')).toBeVisible();

    // 12. Phase 5: Club Infrastructure, Knockout Cup & Data Sharing
    // Verify Profile Tab Data Sharing
    await expect(page.locator('text=Pengurusan & Sandaran Data (JSON)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eksport Simpanan (JSON)', exact: true })).toBeVisible();

    // Verify Home Tab Club Facilities Section
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.locator('text=Pengurusan Kelab & Kemudahan')).toBeVisible();
    await expect(page.locator('text=Kapasiti Penonton')).toBeVisible();

    // Verify League Tab Knockout Cup Bracket Sub-tab
    await page.getByRole('button', { name: 'League', exact: true }).click();
    await page.getByRole('button', { name: /Piala MainBola/ }).click();
    await expect(page.locator('text=Sertai Kejohanan Piala Kalah Mati')).toBeVisible();
    await expect(page.getByRole('button', { name: /Mulakan Kejohanan Piala MainBola/ })).toBeVisible();
  });
});
