import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    HEIGHT_IN_MIN,
    HEIGHT_IN_MAX,
    inchesToCm,
    cmToInches,
    clampHeightInches,
    formatHeightStandard,
    formatHeightMetric,
    heightInchesToInputValue,
    parseHeightInput,
    getHeightInputBounds,
} from '../lib/height-utils.mjs';

describe('height constants', () => {
    it('defines 4ft to 8ft range in inches', () => {
        assert.equal(HEIGHT_IN_MIN, 48);
        assert.equal(HEIGHT_IN_MAX, 96);
    });
});

describe('inchesToCm / cmToInches', () => {
    it('converts round-trip', () => {
        const inches = 70.5;
        assert.ok(Math.abs(cmToInches(inchesToCm(inches)) - inches) < 0.01);
    });
    it('converts 70 in to 177.8 cm', () => {
        assert.ok(Math.abs(inchesToCm(70) - 177.8) < 0.1);
    });
});

describe('clampHeightInches', () => {
    it('clamps below minimum', () => {
        assert.equal(clampHeightInches(40), 48);
    });
    it('clamps above maximum', () => {
        assert.equal(clampHeightInches(100), 96);
    });
    it('rounds to one decimal', () => {
        assert.equal(clampHeightInches(70.55), 70.6);
        assert.equal(clampHeightInches(70.54), 70.5);
    });
    it('returns minimum for NaN', () => {
        assert.equal(clampHeightInches('abc'), 48);
    });
});

describe('formatHeightStandard', () => {
    it('formats whole inches', () => {
        assert.equal(formatHeightStandard(70), '5\' 10"');
        assert.equal(formatHeightStandard(75), '6\' 3"');
    });
    it('formats fractional inches', () => {
        assert.equal(formatHeightStandard(70.5), '5\' 10.5"');
        assert.equal(formatHeightStandard(68.3), '5\' 8.3"');
    });
    it('formats exact feet', () => {
        assert.equal(formatHeightStandard(72), '6\' 0"');
    });
});

describe('formatHeightMetric', () => {
    it('formats cm with one decimal', () => {
        assert.equal(formatHeightMetric(70), '177.8 cm');
    });
});

describe('heightInchesToInputValue', () => {
    it('returns inches string in standard mode', () => {
        assert.equal(heightInchesToInputValue(70.5, false), '70.5');
    });
    it('returns cm string in metric mode', () => {
        assert.equal(heightInchesToInputValue(70, true), '177.8');
    });
});

describe('parseHeightInput', () => {
    it('parses decimal inches', () => {
        assert.equal(parseHeightInput('70.5', false), 70.5);
        assert.equal(parseHeightInput('75', false), 75);
    });
    it('parses cm in metric mode', () => {
        assert.equal(parseHeightInput('177.8', true), 70);
    });
    it('rejects out of range', () => {
        assert.equal(parseHeightInput('40', false), null);
        assert.equal(parseHeightInput('100', false), null);
        assert.equal(parseHeightInput('100', true), null);
    });
    it('rejects empty and invalid', () => {
        assert.equal(parseHeightInput('', false), null);
        assert.equal(parseHeightInput('   ', false), null);
        assert.equal(parseHeightInput('abc', false), null);
    });
    it('clamps edge values', () => {
        assert.equal(parseHeightInput('48', false), 48);
        assert.equal(parseHeightInput('96', false), 96);
    });
});

describe('getHeightInputBounds', () => {
    it('returns inch bounds in standard mode', () => {
        const b = getHeightInputBounds(false);
        assert.equal(b.min, 48);
        assert.equal(b.max, 96);
        assert.equal(b.step, 0.1);
    });
    it('returns cm bounds in metric mode', () => {
        const b = getHeightInputBounds(true);
        assert.ok(b.min > 120);
        assert.ok(b.max < 250);
    });
});
