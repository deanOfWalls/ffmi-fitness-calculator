const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('FFMI Calculator Tests', () => {
  test.beforeEach(async ({ page }) => {
    const filePath = path.join(__dirname, 'index.html');
    await page.goto(`file://${filePath}`);
  });

  test('sliders update values when moved', async ({ page }) => {
    // Test height slider - 75 inches = 6' 3"
    const heightSlider = page.locator('#heightSlider');
    const heightValue = page.locator('#heightValue');
    
    await heightSlider.fill('75');
    await page.waitForTimeout(100);
    // Should display as 6' 3" in standard mode
    await expect(heightValue).toContainText('6\' 3"');
    
    // Test weight slider
    const weightSlider = page.locator('#weightSlider');
    const weightValue = page.locator('#weightValue');
    
    await weightSlider.fill('200');
    await page.waitForTimeout(100);
    await expect(weightValue).toContainText('200');
  });

  test('gender toggle switches to female styling', async ({ page }) => {
    // Click the label/switch instead of the hidden checkbox
    const genderToggleLabel = page.locator('label.switch').first();
    const body = page.locator('body');
    
    // Check initial state (male - blue)
    let primaryColor = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()
    );
    expect(primaryColor).toBe('#4a90e2'); // Male blue
    
    // Toggle to female by clicking the switch label
    await genderToggleLabel.click();
    await page.waitForTimeout(200);
    
    // Check if colors updated (should be pink)
    primaryColor = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()
    );
    expect(primaryColor).toBe('#ff8ab8'); // Female pink
    
    // Check background color
    const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).toContain('rgb');
  });

  test('calculations update when sliders change', async ({ page }) => {
    const weightSlider = page.locator('#weightSlider');
    const bmi = page.locator('#bmi');
    
    // Change weight
    await weightSlider.fill('250');
    await page.waitForTimeout(100);
    
    // BMI should update (not be 0)
    const bmiValue = await bmi.textContent();
    expect(parseFloat(bmiValue)).toBeGreaterThan(0);
  });

  test('female toggle enables hips slider', async ({ page }) => {
    // Click the label/switch instead of the hidden checkbox
    const genderToggleLabel = page.locator('label.switch').first();
    const hipsSlider = page.locator('#hipsSlider');
    
    // Initially disabled (male)
    await expect(hipsSlider).toBeDisabled();
    
    // Toggle to female by clicking the switch label
    await genderToggleLabel.click();
    await page.waitForTimeout(200);
    
    // Should be enabled
    await expect(hipsSlider).toBeEnabled();
  });

  test('TDEE calculations work', async ({ page }) => {
    await page.waitForTimeout(500); // Wait for initial calculations
    
    const tdee = page.locator('#tdee');
    const tdeeValue = await tdee.textContent();
    
    // TDEE should be calculated (not 0)
    expect(parseInt(tdeeValue)).toBeGreaterThan(0);
  });

  test('weight loss mode when current weight > goal weight', async ({ page }) => {
    await page.waitForTimeout(300);
    // Set current weight to 200 lbs
    await page.locator('#weightSlider').fill('200');
    await page.waitForTimeout(100);
    // Set goal weight below current (e.g. 180 lbs)
    await page.locator('#goalWeightInput').fill('180');
    await page.locator('#goalWeightInput').blur();
    await page.waitForTimeout(200);

    await expect(page.locator('#weightChangeLabel1')).toHaveText('Weight Loss');
    await expect(page.locator('#weightChangeLabel2')).toHaveText('Weight Loss');

    const tdee = parseInt(await page.locator('#tdee').textContent());
    const cal1 = parseInt(await page.locator('#weightLoss1lb').textContent());
    const cal2 = parseInt(await page.locator('#weightLoss2lb').textContent());
    expect(cal1).toBe(tdee - 500);
    expect(cal2).toBe(tdee - 1000);

    await expect(page.locator('#weeksToGoal1lb')).toContainText('weeks to goal');
    await expect(page.locator('#weeksToGoal2lb')).toContainText('weeks to goal');
    const weeks1 = await page.locator('#weeksToGoal1lb').textContent();
    const weeks2 = await page.locator('#weeksToGoal2lb').textContent();
    expect(weeks1).toMatch(/~20 weeks/); // 20 lbs at 1 lb/week
    expect(weeks2).toMatch(/~10 weeks/);  // 20 lbs at 2 lb/week
  });

  test('weight gain mode when current weight < goal weight', async ({ page }) => {
    await page.waitForTimeout(300);
    // Set current weight to 160 lbs
    await page.locator('#weightSlider').fill('160');
    await page.waitForTimeout(100);
    // Set goal weight above current (e.g. 180 lbs)
    await page.locator('#goalWeightInput').fill('180');
    await page.locator('#goalWeightInput').blur();
    await page.waitForTimeout(200);

    await expect(page.locator('#weightChangeLabel1')).toHaveText('Weight Gain');
    await expect(page.locator('#weightChangeLabel2')).toHaveText('Weight Gain');

    const tdee = parseInt(await page.locator('#tdee').textContent());
    const cal1 = parseInt(await page.locator('#weightLoss1lb').textContent());
    const cal2 = parseInt(await page.locator('#weightLoss2lb').textContent());
    expect(cal1).toBe(tdee + 500);
    expect(cal2).toBe(tdee + 1000);

    await expect(page.locator('#weeksToGoal1lb')).toContainText('weeks to goal');
    await expect(page.locator('#weeksToGoal2lb')).toContainText('weeks to goal');
    const weeks1 = await page.locator('#weeksToGoal1lb').textContent();
    const weeks2 = await page.locator('#weeksToGoal2lb').textContent();
    expect(weeks1).toMatch(/~20 weeks/); // 20 lbs at 1 lb/week
    expect(weeks2).toMatch(/~10 weeks/);  // 20 lbs at 2 lb/week
  });

  test('no goal weight shows weight loss and no weeks to goal', async ({ page }) => {
    await page.waitForTimeout(300);
    await page.locator('#weightSlider').fill('180');
    await page.waitForTimeout(100);
    // Clear goal weight if any
    await page.locator('#goalWeightInput').fill('');
    await page.locator('#goalWeightInput').blur();
    await page.waitForTimeout(200);

    await expect(page.locator('#weightChangeLabel1')).toHaveText('Weight Loss');
    await expect(page.locator('#weightChangeLabel2')).toHaveText('Weight Loss');

    const tdee = parseInt(await page.locator('#tdee').textContent());
    const cal1 = parseInt(await page.locator('#weightLoss1lb').textContent());
    const cal2 = parseInt(await page.locator('#weightLoss2lb').textContent());
    expect(cal1).toBe(tdee - 500);
    expect(cal2).toBe(tdee - 1000);

    await expect(page.locator('#weeksToGoal1lb')).toHaveText('');
    await expect(page.locator('#weeksToGoal2lb')).toHaveText('');
  });
});

