/**
 * Pure fitness calculation functions (U.S. Navy body fat, BMI, FFMI, Mifflin-St Jeor BMR).
 * All linear measurements in inches; weight in pounds unless noted.
 */

export function getBMICategory(bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi >= 18.5 && bmi < 25) return 'Normal';
    if (bmi >= 25 && bmi < 30) return 'Overweight';
    if (bmi >= 30) return 'Obese';
    return '';
}

export function calculateBMI(weightLbs, heightInches) {
    return (weightLbs * 703) / Math.pow(heightInches, 2);
}

export function calculateBMIKg(weightKg, heightMeters) {
    return weightKg / Math.pow(heightMeters, 2);
}

/**
 * U.S. Navy body fat % — waist, neck, hips (females), height in inches.
 */
export function calculateBodyFatPercentage(isFemale, waist, neck, hips, height) {
    if (isFemale) {
        const hipsValue = hips > 0 ? hips : 40;
        const waistHipsNeck = waist + hipsValue - neck;
        if (waistHipsNeck <= 0 || height <= 0) return 0;
        return 163.205 * Math.log10(waistHipsNeck) - 97.684 * Math.log10(height) - 78.387;
    }
    const waistNeck = waist - neck;
    if (waistNeck <= 0 || height <= 0) return 0;
    return 86.010 * Math.log10(waistNeck) - 70.041 * Math.log10(height) + 36.76;
}

/** Mifflin-St Jeor; default age 30. */
export function calculateBMR(isFemale, weightKg, heightCm, age = 30) {
    if (isFemale) {
        return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
}

export function calculateTDEE(bmr, activityMultiplier) {
    return bmr * activityMultiplier;
}

/** Minimum recommended intake: BMR minus 10% (i.e. 90% of BMR). */
export const BMR_MIN_INTAKE_FACTOR = 0.9;

export function calculateBmrMinimumIntake(bmr) {
    if (!bmr || bmr <= 0) return 0;
    return Math.round(bmr * BMR_MIN_INTAKE_FACTOR);
}

export function isBelowBmrMinimumIntake(intakeCalories, bmr) {
    const floor = calculateBmrMinimumIntake(bmr);
    return intakeCalories < floor;
}

export function calculateFatFreeMass(weightLbs, bodyFatPercentage) {
    return weightLbs * (1 - bodyFatPercentage / 100);
}

export function calculateFFMI(fatFreeMassLbs, heightMeters) {
    const fatFreeMassKg = fatFreeMassLbs / 2.2;
    return fatFreeMassKg / Math.pow(heightMeters, 2);
}

export function calculateNormalizedFFMI(ffmi, heightMeters) {
    return ffmi + 6.3 * (1.8 - heightMeters);
}

export function getFFMIScaleRange(isFemale) {
    return isFemale ? { min: 14, max: 21 } : { min: 16, max: 30 };
}

export function calculateFFMIIndicatorPosition(ffmi, isFemale) {
    const { min, max } = getFFMIScaleRange(isFemale);
    const position = ((ffmi - min) / (max - min)) * 100;
    return Math.max(0, Math.min(position, 99));
}

export function clampBodyFatPercentage(raw) {
    return Math.max(0, Math.min(70, raw));
}

export function roundBodyFatDisplay(raw) {
    return Math.round(clampBodyFatPercentage(raw));
}

/**
 * Full metrics pipeline used by the UI.
 */
export function computeBodyMetrics({
    isFemale,
    heightInches,
    weightLbs,
    neckInches,
    waistInches,
    hipsInches,
    activityMultiplier,
    goalWeightLbs = null,
    age = 30,
}) {
    const heightMeters = heightInches * 0.0254;
    const heightCm = heightInches * 2.54;
    const weightKg = weightLbs / 2.2;

    const validWaist = isNaN(waistInches) || waistInches <= 0 ? 34 : waistInches;
    const validNeck = isNaN(neckInches) || neckInches <= 0 ? 15 : neckInches;
    const validHeight = isNaN(heightInches) || heightInches <= 0 ? 70 : heightInches;
    const validHips = isFemale
        ? (isNaN(hipsInches) || hipsInches <= 0 ? 40 : hipsInches)
        : 0;

    const bmiValue = calculateBMI(weightLbs, validHeight);
    const category = getBMICategory(bmiValue);

    const bodyFatRaw = calculateBodyFatPercentage(
        isFemale,
        validWaist,
        validNeck,
        validHips,
        validHeight
    );
    const bodyFatPercentage = roundBodyFatDisplay(bodyFatRaw);
    const fatFreeMass = calculateFatFreeMass(weightLbs, bodyFatPercentage);
    const ffmi = calculateFFMI(fatFreeMass, heightMeters);
    const normalizedFfmi = calculateNormalizedFFMI(ffmi, heightMeters);

    const bmr = calculateBMR(isFemale, weightKg, heightCm, age);
    const tdee = calculateTDEE(bmr, activityMultiplier);

    let weightChangeMode = 'loss';
    let cal1;
    let cal2;
    let weeks1lb = null;
    let weeks2lb = null;

    if (goalWeightLbs != null && goalWeightLbs > weightLbs) {
        weightChangeMode = 'gain';
        cal1 = Math.round(tdee + 500);
        cal2 = Math.round(tdee + 1000);
        const weightToGain = goalWeightLbs - weightLbs;
        weeks1lb = Math.ceil(weightToGain / 1);
        weeks2lb = Math.ceil(weightToGain / 2);
    } else if (goalWeightLbs != null && goalWeightLbs < weightLbs) {
        weightChangeMode = 'loss';
        cal1 = Math.max(0, Math.round(tdee - 500));
        cal2 = Math.max(0, Math.round(tdee - 1000));
        const weightToLose = weightLbs - goalWeightLbs;
        weeks1lb = Math.ceil(weightToLose / 1);
        weeks2lb = Math.ceil(weightToLose / 2);
    } else {
        weightChangeMode = 'loss';
        cal1 = Math.max(0, Math.round(tdee - 500));
        cal2 = Math.max(0, Math.round(tdee - 1000));
    }

    const ffmiIndicatorPosition = calculateFFMIIndicatorPosition(ffmi, isFemale);
    const bmrMinimumIntake = calculateBmrMinimumIntake(bmr);

    return {
        bmiValue,
        bmiCategory: category,
        bodyFatPercentage,
        bodyFatRaw,
        fatFreeMass,
        ffmi,
        normalizedFfmi,
        bmr,
        tdee,
        weightChangeMode,
        cal1,
        cal2,
        weeks1lb,
        weeks2lb,
        bmrMinimumIntake,
        ffmiIndicatorPosition,
        heightMeters,
        heightCm,
        weightKg,
    };
}
