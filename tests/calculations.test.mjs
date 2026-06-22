import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    getBMICategory,
    calculateBMI,
    calculateBMIKg,
    calculateBodyFatPercentage,
    calculateBMR,
    calculateTDEE,
    calculateBmrMinimumIntake,
    isBelowBmrMinimumIntake,
    BMR_MIN_INTAKE_FACTOR,
    calculateFatFreeMass,
    calculateFFMI,
    calculateNormalizedFFMI,
    getFFMIScaleRange,
    calculateFFMIIndicatorPosition,
    clampBodyFatPercentage,
    roundBodyFatDisplay,
    computeBodyMetrics,
} from '../lib/calculations.mjs';

const EPS = 0.05;

describe('getBMICategory', () => {
    it('classifies underweight', () => {
        assert.equal(getBMICategory(17), 'Underweight');
        assert.equal(getBMICategory(18.49), 'Underweight');
    });
    it('classifies normal', () => {
        assert.equal(getBMICategory(18.5), 'Normal');
        assert.equal(getBMICategory(24.9), 'Normal');
    });
    it('classifies overweight', () => {
        assert.equal(getBMICategory(25), 'Overweight');
        assert.equal(getBMICategory(29.9), 'Overweight');
    });
    it('classifies obese', () => {
        assert.equal(getBMICategory(30), 'Obese');
        assert.equal(getBMICategory(40), 'Obese');
    });
});

describe('calculateBMI', () => {
    it('matches standard formula for 188 lbs at 70 in', () => {
        const bmi = calculateBMI(188, 70);
        assert.ok(Math.abs(bmi - 26.97) < 0.1);
    });
    it('increases with weight', () => {
        assert.ok(calculateBMI(200, 70) > calculateBMI(180, 70));
    });
    it('decreases with height', () => {
        assert.ok(calculateBMI(188, 72) < calculateBMI(188, 68));
    });
});

describe('calculateBMIKg', () => {
    it('matches metric formula', () => {
        const kg = 85.45;
        const m = 1.778;
        const bmi = calculateBMIKg(kg, m);
        assert.ok(Math.abs(bmi - calculateBMI(188, 70)) < 0.15);
    });
});

describe('calculateBodyFatPercentage (U.S. Navy)', () => {
    it('computes male body fat for typical measurements', () => {
        const bf = calculateBodyFatPercentage(false, 34, 15, 0, 70);
        assert.ok(Math.abs(bf - 17.5) < 1);
    });
    it('computes female body fat for typical measurements', () => {
        const bf = calculateBodyFatPercentage(true, 28, 13, 38, 65);
        assert.ok(Math.abs(bf - 26) < 2);
    });
    it('returns 0 when male waist-neck is non-positive', () => {
        assert.equal(calculateBodyFatPercentage(false, 15, 15, 0, 70), 0);
    });
    it('returns 0 when height is non-positive', () => {
        assert.equal(calculateBodyFatPercentage(false, 34, 15, 0, 0), 0);
    });
    it('uses default hips for female when hips is 0', () => {
        const withDefault = calculateBodyFatPercentage(true, 28, 13, 0, 65);
        const withHips = calculateBodyFatPercentage(true, 28, 13, 40, 65);
        assert.notEqual(withDefault, 0);
        assert.ok(Math.abs(withDefault - withHips) < EPS);
    });
});

describe('calculateBMR (Mifflin-St Jeor, age 30)', () => {
    it('computes male BMR', () => {
        const bmr = calculateBMR(false, 85.45, 177.8, 30);
        assert.ok(Math.abs(bmr - 1821) < 5);
    });
    it('computes female BMR lower than male at same stats', () => {
        const male = calculateBMR(false, 60, 165, 30);
        const female = calculateBMR(true, 60, 165, 30);
        assert.ok(female < male);
        assert.ok(Math.abs(male - female - 166) < 1);
    });
});

describe('calculateTDEE', () => {
    it('multiplies BMR by activity factor', () => {
        const bmr = 1800;
        assert.equal(calculateTDEE(bmr, 1.55), 2790);
    });
});

describe('calculateBmrMinimumIntake', () => {
    it('returns 90% of BMR rounded', () => {
        assert.equal(calculateBmrMinimumIntake(1000), 900);
        assert.equal(calculateBmrMinimumIntake(2000), 1800);
    });

    it('detects intake below floor', () => {
        assert.equal(isBelowBmrMinimumIntake(899, 1000), true);
        assert.equal(isBelowBmrMinimumIntake(900, 1000), false);
        assert.equal(isBelowBmrMinimumIntake(1200, 1000), false);
    });
});

describe('FFMI calculations', () => {
    it('computes fat-free mass', () => {
        assert.ok(Math.abs(calculateFatFreeMass(200, 20) - 160) < EPS);
    });
    it('computes FFMI', () => {
        const ffm = calculateFatFreeMass(188, 17);
        const ffmi = calculateFFMI(ffm, 1.778);
        assert.ok(ffmi > 15 && ffmi < 30);
    });
    it('computes normalized FFMI', () => {
        const ffmi = 20;
        const norm = calculateNormalizedFFMI(ffmi, 1.778);
        assert.ok(norm > ffmi - 1 && norm < ffmi + 1);
    });
});

describe('FFMI scale', () => {
    it('returns correct ranges by gender', () => {
        assert.deepEqual(getFFMIScaleRange(false), { min: 16, max: 30 });
        assert.deepEqual(getFFMIScaleRange(true), { min: 14, max: 21 });
    });
    it('clamps indicator position between 0 and 99', () => {
        assert.equal(calculateFFMIIndicatorPosition(10, false), 0);
        assert.equal(calculateFFMIIndicatorPosition(50, false), 99);
        const mid = calculateFFMIIndicatorPosition(23, false);
        assert.ok(mid > 0 && mid < 99);
    });
});

describe('body fat clamping', () => {
    it('clamps negative and extreme values', () => {
        assert.equal(clampBodyFatPercentage(-5), 0);
        assert.equal(clampBodyFatPercentage(80), 70);
    });
    it('rounds for display', () => {
        assert.equal(roundBodyFatDisplay(17.4), 17);
        assert.equal(roundBodyFatDisplay(17.6), 18);
    });
});

describe('computeBodyMetrics (full pipeline)', () => {
    const baseMale = {
        isFemale: false,
        heightInches: 70,
        weightLbs: 188,
        neckInches: 15,
        waistInches: 34,
        hipsInches: 0,
        activityMultiplier: 1.55,
        goalWeightLbs: null,
    };

    it('returns consistent BMI and category', () => {
        const m = computeBodyMetrics(baseMale);
        assert.ok(Math.abs(m.bmiValue - 26.97) < 0.15);
        assert.equal(m.bmiCategory, 'Overweight');
    });

    it('returns positive body fat, FFMI, BMR, TDEE', () => {
        const m = computeBodyMetrics(baseMale);
        assert.ok(m.bodyFatPercentage > 0 && m.bodyFatPercentage < 50);
        assert.ok(m.ffmi > 0);
        assert.ok(m.normalizedFfmi > 0);
        assert.ok(m.bmr > 1000);
        assert.ok(m.tdee > m.bmr);
    });

    it('weight loss mode with goal below current', () => {
        const m = computeBodyMetrics({ ...baseMale, goalWeightLbs: 170 });
        assert.equal(m.weightChangeMode, 'loss');
        assert.equal(m.cal1, Math.max(0, Math.round(m.tdee - 500)));
        assert.equal(m.cal2, Math.max(0, Math.round(m.tdee - 1000)));
        assert.equal(m.weeks1lb, 18);
        assert.equal(m.weeks2lb, 9);
    });

    it('weight gain mode with goal above current', () => {
        const m = computeBodyMetrics({ ...baseMale, goalWeightLbs: 200 });
        assert.equal(m.weightChangeMode, 'gain');
        assert.equal(m.cal1, Math.round(m.tdee + 500));
        assert.equal(m.cal2, Math.round(m.tdee + 1000));
        assert.equal(m.weeks1lb, 12);
        assert.equal(m.weeks2lb, 6);
    });

    it('no goal shows loss calories without weeks', () => {
        const m = computeBodyMetrics(baseMale);
        assert.equal(m.weightChangeMode, 'loss');
        assert.equal(m.weeks1lb, null);
        assert.equal(m.weeks2lb, null);
        assert.equal(m.bmrMinimumIntake, Math.round(m.bmr * BMR_MIN_INTAKE_FACTOR));
        assert.equal(isBelowBmrMinimumIntake(m.cal1, m.bmr), false);
    });

    it('weight gain mode still computes minimum intake', () => {
        const m = computeBodyMetrics({ ...baseMale, goalWeightLbs: 200 });
        assert.ok(m.bmrMinimumIntake > 0);
    });

    it('sedentary 2 lb/week can fall below BMR minimum intake', () => {
        const m = computeBodyMetrics({ ...baseMale, activityMultiplier: 1.2 });
        assert.equal(isBelowBmrMinimumIntake(m.cal2, m.bmr), true);
        assert.equal(isBelowBmrMinimumIntake(m.cal1, m.bmr), false);
    });

    it('uses female formula and hips', () => {
        const m = computeBodyMetrics({
            ...baseMale,
            isFemale: true,
            hipsInches: 40,
            heightInches: 65,
            weightLbs: 140,
            waistInches: 28,
            neckInches: 13,
        });
        assert.ok(m.bodyFatPercentage > 0);
        assert.ok(m.ffmiIndicatorPosition >= 0 && m.ffmiIndicatorPosition <= 99);
    });

    it('falls back to defaults for invalid measurements', () => {
        const m = computeBodyMetrics({
            ...baseMale,
            waistInches: 0,
            neckInches: -1,
            heightInches: 0,
        });
        assert.ok(m.bmiValue > 0);
        assert.ok(m.bodyFatPercentage >= 0);
    });

    it('BMI changes with fractional height precision', () => {
        const at70 = computeBodyMetrics({ ...baseMale, heightInches: 70 });
        const at705 = computeBodyMetrics({ ...baseMale, heightInches: 70.5 });
        assert.ok(at705.bmiValue < at70.bmiValue);
        assert.ok(Math.abs(at70.bmiValue - at705.bmiValue) > 0.05);
    });
});
