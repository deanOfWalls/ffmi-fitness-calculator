/** Shared helpers for slider + number input sync (stored internally in lbs or inches). */

export function roundToStep(value, step) {
    const stepStr = String(step);
    const decimals = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;
    const rounded = Math.round(value / step) * step;
    return parseFloat(rounded.toFixed(decimals));
}

export function clampValue(value, min, max, step) {
    const n = parseFloat(value);
    if (isNaN(n)) return null;
    return roundToStep(Math.max(min, Math.min(max, n)), step);
}

export const LBS_TO_KG = 1 / 2.2;

export function lbsToKg(lbs) {
    return lbs * LBS_TO_KG;
}

export function kgToLbs(kg) {
    return kg / LBS_TO_KG;
}

export function inchesToCm(inches) {
    return inches * 2.54;
}

export function cmToInches(cm) {
    return cm / 2.54;
}

/** Weight slider stores lbs. */
export function getWeightInputConfig(isMetric, minLbs = 100, maxLbs = 350, stepLbs = 0.5) {
    if (isMetric) {
        const min = roundToStep(lbsToKg(minLbs), 0.5);
        const max = roundToStep(lbsToKg(maxLbs), 0.5);
        return {
            min,
            max,
            step: 0.5,
            unit: 'kg',
            toInput: (lbs) => roundToStep(lbsToKg(lbs), 0.5).toFixed(1),
            toSlider: (raw) => {
                const kg = parseFloat(raw);
                if (isNaN(kg) || kg < min || kg > max) return null;
                return clampValue(kgToLbs(kg), minLbs, maxLbs, stepLbs);
            },
        };
    }
    return {
        min: minLbs,
        max: maxLbs,
        step: stepLbs,
        unit: 'lbs',
        toInput: (lbs) => roundToStep(lbs, stepLbs).toFixed(1),
        toSlider: (raw) => clampValue(raw, minLbs, maxLbs, stepLbs),
    };
}

/** Length sliders store inches (neck, waist, hips). */
export function getLengthInputConfig(isMetric, minIn, maxIn, stepIn = 0.5) {
    if (isMetric) {
        const min = roundToStep(inchesToCm(minIn), 0.1);
        const max = roundToStep(inchesToCm(maxIn), 0.1);
        return {
            min,
            max,
            step: 0.1,
            unit: 'cm',
            toInput: (inches) => roundToStep(inchesToCm(inches), 0.1).toFixed(1),
            toSlider: (raw) => {
                const cm = parseFloat(raw);
                if (isNaN(cm) || cm < min || cm > max) return null;
                return clampValue(cmToInches(cm), minIn, maxIn, stepIn);
            },
        };
    }
    return {
        min: minIn,
        max: maxIn,
        step: stepIn,
        unit: 'in',
        toInput: (inches) => roundToStep(inches, stepIn).toFixed(1),
        toSlider: (raw) => clampValue(raw, minIn, maxIn, stepIn),
    };
}
