const { test, expect } = require('@playwright/test');

test.describe('FFMI Calculator – UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => {
      const bmi = document.getElementById('bmi')?.textContent;
      return bmi && parseFloat(bmi) > 0;
    });
  });

  test('page loads with title and main sections', async ({ page }) => {
    await expect(page).toHaveTitle(/Body Fat, FFMI & BMI Calculator/);
    await expect(page.locator('h1')).toHaveText('All-in-One Fitness Calculator');
    await expect(page.locator('.ffmi-results')).toBeVisible();
    await expect(page.locator('.tdee-results')).toBeVisible();
    await expect(page.locator('.history-panel')).toBeVisible();
  });

  test('sliders update displayed values', async ({ page }) => {
    await page.locator('#heightSlider').fill('75');
    await page.waitForTimeout(100);
    await expect(page.locator('#heightValue')).toContainText('6\' 3"');

    await page.locator('#weightSlider').fill('200');
    await page.waitForTimeout(100);
    await expect(page.locator('#weightValue')).toContainText('200');
  });

  test('height slider supports 0.1 inch precision', async ({ page }) => {
    await page.locator('#heightSlider').fill('70.5');
    await page.waitForTimeout(100);
    await expect(page.locator('#heightValue')).toContainText('5\' 10.5"');
    await expect(page.locator('#heightInput')).toHaveValue('70.5');
  });

  test('height manual input syncs to slider and display', async ({ page }) => {
    await page.locator('#heightInput').fill('72.3');
    await page.locator('#heightInput').blur();
    await page.waitForTimeout(100);
    await expect(page.locator('#heightSlider')).toHaveValue('72.3');
    await expect(page.locator('#heightValue')).toContainText('6\' 0.3"');
  });

  test('height slider syncs to manual input', async ({ page }) => {
    await page.locator('#heightSlider').fill('68.7');
    await page.waitForTimeout(100);
    await expect(page.locator('#heightInput')).toHaveValue('68.7');
  });

  test('height +/- buttons adjust by 0.1 inch', async ({ page }) => {
    await page.locator('#heightSlider').fill('70');
    await page.waitForTimeout(50);
    await page.locator('[data-slider="heightSlider"][data-direction="increase"]').click();
    await page.waitForTimeout(100);
    await expect(page.locator('#heightSlider')).toHaveValue('70.1');
    await expect(page.locator('#heightInput')).toHaveValue('70.1');
  });

  test('gender toggle switches accent and female styling', async ({ page }) => {
    let accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    );
    expect(accent).toBe('#3FA2FF');

    await page.locator('label.switch').first().click();
    await page.waitForTimeout(200);

    accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    );
    expect(accent).toBe('#e891b0');
    await expect(page.locator('body')).toHaveClass(/female/);
  });

  test('female toggle enables hips slider', async ({ page }) => {
    await expect(page.locator('#hipsSlider')).toBeDisabled();
    await page.locator('label.switch').first().click();
    await page.waitForTimeout(200);
    await expect(page.locator('#hipsSlider')).toBeEnabled();
  });

  test('male toggle disables hips and shows 0', async ({ page }) => {
    await page.locator('label.switch').first().click();
    await page.waitForTimeout(200);
    await page.locator('label.switch').first().click();
    await page.waitForTimeout(200);
    await expect(page.locator('#hipsSlider')).toBeDisabled();
    await expect(page.locator('#hipsValue')).toContainText('0');
  });

  test('weight manual input syncs to slider', async ({ page }) => {
    await page.locator('#weightInput').fill('200');
    await page.locator('#weightInput').blur();
    await page.waitForTimeout(100);
    await expect(page.locator('#weightSlider')).toHaveValue('200');
    await expect(page.locator('#weightValue')).toContainText('200');
  });

  test('neck and waist manual inputs sync to sliders', async ({ page }) => {
    await page.locator('#neckInput').fill('16');
    await page.locator('#neckInput').blur();
    await page.locator('#waistInput').fill('36');
    await page.locator('#waistInput').blur();
    await page.waitForTimeout(100);
    await expect(page.locator('#neckSlider')).toHaveValue('16');
    await expect(page.locator('#waistSlider')).toHaveValue('36');
  });

  test('female hips manual input syncs to slider', async ({ page }) => {
    await page.locator('label.switch').first().click();
    await page.waitForTimeout(200);
    await page.locator('#hipsInput').fill('42');
    await page.locator('#hipsInput').blur();
    await page.waitForTimeout(100);
    await expect(page.locator('#hipsSlider')).toHaveValue('42');
  });

  test('unit toggle updates labels to metric', async ({ page }) => {
    await page.locator('label.switch').nth(1).click();
    await page.waitForTimeout(200);
    await expect(page.locator('#heightUnitLabel')).toHaveText('(cm)');
    await expect(page.locator('#weightInputUnitLabel')).toHaveText('kg');
    await expect(page.locator('#heightInputUnitLabel')).toHaveText('cm');
  });

  test('height input shows cm in metric mode', async ({ page }) => {
    await page.locator('label.switch').nth(1).click();
    await page.waitForTimeout(200);
    const inputVal = await page.locator('#heightInput').inputValue();
    expect(parseFloat(inputVal)).toBeGreaterThan(170);
    expect(parseFloat(inputVal)).toBeLessThan(180);
  });

  test('metric height input updates calculations', async ({ page }) => {
    await page.locator('label.switch').nth(1).click();
    await page.waitForTimeout(200);
    await page.locator('#heightInput').fill('180');
    await page.locator('#heightInput').blur();
    await page.waitForTimeout(150);
    const bmi = parseFloat(await page.locator('#bmi').textContent());
    expect(bmi).toBeGreaterThan(0);
  });

  test('theme toggle switches dark class', async ({ page }) => {
    const wasDark = await page.locator('body').evaluate((el) => el.classList.contains('dark'));
    await page.locator('#themeToggle').click();
    await page.waitForTimeout(150);
    const isDark = await page.locator('body').evaluate((el) => el.classList.contains('dark'));
    expect(isDark).not.toBe(wasDark);
  });

  test('activity level change updates TDEE', async ({ page }) => {
    const tdeeSedentary = await getTdeeForActivity(page, '1.2');
    const tdeeActive = await getTdeeForActivity(page, '1.9');
    expect(tdeeActive).toBeGreaterThan(tdeeSedentary);
  });

  test('FFMI scale switches with gender', async ({ page }) => {
    await expect(page.locator('#ffmiScaleMale')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#ffmiScaleFemale')).toHaveAttribute('aria-hidden', 'true');
    await page.locator('label.switch').first().click();
    await page.waitForTimeout(200);
    await expect(page.locator('#ffmiScaleMale')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#ffmiScaleFemale')).toHaveAttribute('aria-hidden', 'false');
  });
});

test.describe('FFMI Calculator – calculations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => {
      const bmi = document.getElementById('bmi')?.textContent;
      return bmi && parseFloat(bmi) > 0;
    });
  });

  test('BMI updates when weight changes', async ({ page }) => {
    await page.locator('#weightSlider').fill('250');
    await page.waitForTimeout(100);
    const bmi = parseFloat(await page.locator('#bmi').textContent());
    expect(bmi).toBeGreaterThan(25);
  });

  test('BMI category badge is applied', async ({ page }) => {
    await page.locator('#weightSlider').fill('250');
    await page.waitForTimeout(100);
    const category = await page.locator('#bmiCategory').textContent();
    expect(['Overweight', 'Obese']).toContain(category);
    await expect(page.locator('#bmiCategory')).toHaveClass(/badge/);
  });

  test('body fat and FFMI are positive', async ({ page }) => {
    const bodyFat = await page.locator('#bodyFatCalc').textContent();
    expect(bodyFat).toMatch(/\d+%/);
    expect(parseFloat(await page.locator('#ffmi').textContent())).toBeGreaterThan(0);
    expect(parseFloat(await page.locator('#adjustedFfmi').textContent())).toBeGreaterThan(0);
    expect(parseFloat(await page.locator('#fatFreeMass').textContent())).toBeGreaterThan(0);
  });

  test('TDEE and BMR are calculated', async ({ page }) => {
    const bmr = parseInt(await page.locator('#bmr').textContent(), 10);
    const tdee = parseInt(await page.locator('#tdee').textContent(), 10);
    expect(bmr).toBeGreaterThan(1000);
    expect(tdee).toBeGreaterThan(bmr);
  });

  test('weight loss mode when current weight > goal weight', async ({ page }) => {
    await page.locator('#weightSlider').fill('200');
    await page.waitForTimeout(100);
    await page.locator('#goalWeightInput').fill('180');
    await page.locator('#goalWeightInput').blur();
    await page.waitForTimeout(200);

    await expect(page.locator('#weightChangeLabel1')).toHaveText('Weight Loss');
    await expect(page.locator('#weightChangeLabel2')).toHaveText('Weight Loss');

    const tdee = parseInt(await page.locator('#tdee').textContent(), 10);
    const cal1 = parseInt(await page.locator('#weightLoss1lb').textContent(), 10);
    const cal2 = parseInt(await page.locator('#weightLoss2lb').textContent(), 10);
    expect(cal1).toBe(tdee - 500);
    expect(cal2).toBe(tdee - 1000);

    await expect(page.locator('#weeksToGoal1lb')).toContainText('weeks to goal');
    await expect(page.locator('#weeksToGoal2lb')).toContainText('weeks to goal');
    expect(await page.locator('#weeksToGoal1lb').textContent()).toMatch(/~20 weeks/);
    expect(await page.locator('#weeksToGoal2lb').textContent()).toMatch(/~10 weeks/);
  });

  test('weight gain mode when current weight < goal weight', async ({ page }) => {
    await page.locator('#weightSlider').fill('160');
    await page.waitForTimeout(100);
    await page.locator('#goalWeightInput').fill('180');
    await page.locator('#goalWeightInput').blur();
    await page.waitForTimeout(200);

    await expect(page.locator('#weightChangeLabel1')).toHaveText('Weight Gain');
    await expect(page.locator('#weightChangeLabel2')).toHaveText('Weight Gain');

    const tdee = parseInt(await page.locator('#tdee').textContent(), 10);
    const cal1 = parseInt(await page.locator('#weightLoss1lb').textContent(), 10);
    const cal2 = parseInt(await page.locator('#weightLoss2lb').textContent(), 10);
    expect(cal1).toBe(tdee + 500);
    expect(cal2).toBe(tdee + 1000);

    expect(await page.locator('#weeksToGoal1lb').textContent()).toMatch(/~20 weeks/);
    expect(await page.locator('#weeksToGoal2lb').textContent()).toMatch(/~10 weeks/);
  });

  test('no goal weight shows weight loss and no weeks to goal', async ({ page }) => {
    await page.locator('#weightSlider').fill('180');
    await page.waitForTimeout(100);
    await page.locator('#goalWeightInput').fill('');
    await page.locator('#goalWeightInput').blur();
    await page.waitForTimeout(200);

    await expect(page.locator('#weightChangeLabel1')).toHaveText('Weight Loss');
    const tdee = parseInt(await page.locator('#tdee').textContent(), 10);
    expect(parseInt(await page.locator('#weightLoss1lb').textContent(), 10)).toBe(tdee - 500);
    expect(parseInt(await page.locator('#weightLoss2lb').textContent(), 10)).toBe(tdee - 1000);
    await expect(page.locator('#weeksToGoal1lb')).toHaveText('');
    await expect(page.locator('#weeksToGoal2lb')).toHaveText('');
  });

  test('fractional height changes BMI vs whole inches', async ({ page }) => {
    await page.locator('#heightInput').fill('70');
    await page.locator('#heightInput').blur();
    await page.waitForTimeout(100);
    const bmi70 = parseFloat(await page.locator('#bmi').textContent());

    await page.locator('#heightInput').fill('70.5');
    await page.locator('#heightInput').blur();
    await page.waitForTimeout(100);
    const bmi705 = parseFloat(await page.locator('#bmi').textContent());

    expect(bmi705).toBeLessThan(bmi70);
    expect(bmi70 - bmi705).toBeGreaterThan(0.05);
  });

  test('neck and waist sliders update displayed values', async ({ page }) => {
    await page.locator('#neckSlider').fill('16');
    await page.locator('#waistSlider').fill('36');
    await page.waitForTimeout(100);
    await expect(page.locator('#neckValue')).toContainText('16');
    await expect(page.locator('#waistValue')).toContainText('36');
  });

  test('tooltips are populated from data attributes', async ({ page }) => {
    const text = await page.locator('.tooltip-trigger').first().getAttribute('data-tooltip');
    expect(text.length).toBeGreaterThan(10);
  });

  test('history panel shows Today entry', async ({ page }) => {
    await expect(page.locator('#historyList')).toContainText('Today');
  });
});

async function getTdeeForActivity(page, value) {
  await page.locator('#activityLevel').selectOption(value);
  await page.waitForTimeout(150);
  return parseInt(await page.locator('#tdee').textContent(), 10);
}
