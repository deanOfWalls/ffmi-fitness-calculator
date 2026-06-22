import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    getWeightInputConfig,
    getLengthInputConfig,
    roundToStep,
    clampValue,
} from '../lib/measurement-utils.mjs';

describe('getWeightInputConfig', () => {
    it('converts lbs slider value to kg input', () => {
        const cfg = getWeightInputConfig(true, 100, 350, 0.5);
        assert.equal(cfg.unit, 'kg');
        assert.equal(cfg.toInput(188), '85.5');
    });

    it('parses kg input back to lbs', () => {
        const cfg = getWeightInputConfig(true, 100, 350, 0.5);
        const lbs = cfg.toSlider('85.5');
        assert.ok(Math.abs(lbs - 188.1) < 0.2);
    });

    it('keeps lbs in standard mode', () => {
        const cfg = getWeightInputConfig(false, 100, 350, 0.5);
        assert.equal(cfg.toInput(188), '188.0');
        assert.equal(cfg.toSlider('200'), 200);
    });
});

describe('getLengthInputConfig', () => {
    it('converts inches to cm for display input', () => {
        const cfg = getLengthInputConfig(true, 10, 30, 0.5);
        assert.equal(cfg.unit, 'cm');
        assert.equal(cfg.toInput(15), '38.1');
    });

    it('parses cm back to inches', () => {
        const cfg = getLengthInputConfig(true, 20, 60, 0.5);
        const inches = cfg.toSlider('86.4');
        assert.ok(Math.abs(inches - 34) < 0.2);
    });
});

describe('roundToStep / clampValue', () => {
    it('rounds to step', () => {
        assert.equal(roundToStep(188.3, 0.5), 188.5);
    });
    it('clamps within range', () => {
        assert.equal(clampValue(50, 100, 350, 0.5), 100);
    });
});
