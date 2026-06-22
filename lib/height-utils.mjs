/** Height is stored internally in inches (decimal). */

export const HEIGHT_IN_MIN = 48;
export const HEIGHT_IN_MAX = 96;
export const HEIGHT_CM_MIN = 121.9; // 48 in
export const HEIGHT_CM_MAX = 243.8; // 96 in

export function inchesToCm(inches) {
    return inches * 2.54;
}

export function cmToInches(cm) {
    return cm / 2.54;
}

export function clampHeightInches(inches) {
    const n = parseFloat(inches);
    if (isNaN(n)) return HEIGHT_IN_MIN;
    const rounded = Math.round(n * 10) / 10;
    return Math.max(HEIGHT_IN_MIN, Math.min(HEIGHT_IN_MAX, rounded));
}

export function formatHeightStandard(inches) {
    const total = parseFloat(inches);
    if (isNaN(total)) return '';
    const feet = Math.floor(total / 12);
    const remainder = Math.round((total - feet * 12) * 10) / 10;
    const inchStr = remainder % 1 === 0 ? String(Math.round(remainder)) : remainder.toFixed(1);
    return `${feet}' ${inchStr}"`;
}

export function formatHeightMetric(inches) {
    return `${inchesToCm(inches).toFixed(1)} cm`;
}

/** Value shown in the manual height number input. */
export function heightInchesToInputValue(inches, isMetric) {
    const clamped = clampHeightInches(inches);
    if (isMetric) {
        return inchesToCm(clamped).toFixed(1);
    }
    return clamped.toFixed(1);
}

/** Parse manual height input into inches; returns null if empty/invalid. */
export function parseHeightInput(rawValue, isMetric) {
    const trimmed = String(rawValue).trim();
    if (!trimmed) return null;
    const n = parseFloat(trimmed);
    if (isNaN(n)) return null;
    if (isMetric) {
        if (n < HEIGHT_CM_MIN || n > HEIGHT_CM_MAX) return null;
        return clampHeightInches(cmToInches(n));
    }
    if (n < HEIGHT_IN_MIN || n > HEIGHT_IN_MAX) return null;
    return clampHeightInches(n);
}

export function getHeightInputBounds(isMetric) {
    if (isMetric) {
        return { min: HEIGHT_CM_MIN, max: HEIGHT_CM_MAX, step: 0.1 };
    }
    return { min: HEIGHT_IN_MIN, max: HEIGHT_IN_MAX, step: 0.1 };
}
