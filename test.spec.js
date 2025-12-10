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
});

