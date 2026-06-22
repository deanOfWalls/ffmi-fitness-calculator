import { computeBodyMetrics } from './lib/calculations.mjs';
import {
    clampHeightInches,
    formatHeightStandard,
    formatHeightMetric,
    heightInchesToInputValue,
    parseHeightInput,
    getHeightInputBounds,
} from './lib/height-utils.mjs';
import { getWeightInputConfig, getLengthInputConfig } from './lib/measurement-utils.mjs';

document.addEventListener('DOMContentLoaded', function () {
    const genderToggle = document.getElementById('genderToggle');
    const unitToggle = document.getElementById('unitToggle');
    const heightSlider = document.getElementById('heightSlider');
    const heightInput = document.getElementById('heightInput');
    const heightInputUnitLabel = document.getElementById('heightInputUnitLabel');
    const weightSlider = document.getElementById('weightSlider');
    const weightInput = document.getElementById('weightInput');
    const weightInputUnitLabel = document.getElementById('weightInputUnitLabel');
    const neckSlider = document.getElementById('neckSlider');
    const neckInput = document.getElementById('neckInput');
    const neckInputUnitLabel = document.getElementById('neckInputUnitLabel');
    const waistSlider = document.getElementById('waistSlider');
    const waistInput = document.getElementById('waistInput');
    const waistInputUnitLabel = document.getElementById('waistInputUnitLabel');
    const hipsSlider = document.getElementById('hipsSlider');
    const hipsInput = document.getElementById('hipsInput');
    const hipsInputUnitLabel = document.getElementById('hipsInputUnitLabel');
    const hipsGroup = document.getElementById('hipsGroup');
    const bodyElement = document.body;

    const heightUnitLabel = document.getElementById('heightUnitLabel');
    const activityLevel = document.getElementById('activityLevel');
    const goalWeightInput = document.getElementById('goalWeightInput');
    const goalWeightUnitLabel = document.getElementById('goalWeightUnitLabel');
    const darkModeToggle = document.getElementById('darkModeToggle');

    const HISTORY_KEY = 'ffmi_daily_history';
    const MAX_HISTORY_DAYS = 365;
    let todayLiveState = null;
    const fieldBindings = [];

    function bindSliderInput({ slider, input, unitLabel, getConfig, isHeight = false }) {
        let syncing = false;

        const binding = {
            updateBounds() {
                if (isHeight) {
                    const bounds = getHeightInputBounds(unitToggle.checked);
                    input.min = String(bounds.min);
                    input.max = String(bounds.max);
                    input.step = String(bounds.step);
                    unitLabel.textContent = unitToggle.checked ? 'cm' : 'in';
                } else {
                    const cfg = getConfig();
                    input.min = String(cfg.min);
                    input.max = String(cfg.max);
                    input.step = String(cfg.step);
                    unitLabel.textContent = cfg.unit;
                }
                input.disabled = slider.disabled;
            },
            syncFromSlider() {
                if (syncing) return;
                syncing = true;
                if (isHeight) {
                    input.value = heightInchesToInputValue(slider.value, unitToggle.checked);
                } else {
                    const cfg = getConfig();
                    input.value = cfg.toInput(parseFloat(slider.value));
                }
                syncing = false;
            },
            applyFromInput() {
                if (syncing || input.disabled) return;
                let sliderVal;
                if (isHeight) {
                    sliderVal = parseHeightInput(input.value, unitToggle.checked);
                } else {
                    sliderVal = getConfig().toSlider(input.value);
                }
                if (sliderVal == null) return;
                syncing = true;
                slider.value = String(isHeight ? sliderVal : sliderVal);
                syncing = false;
                saveValues();
                updateUI();
            },
        };

        slider.addEventListener('input', function () {
            binding.syncFromSlider();
            saveValues();
            updateUI();
        });
        input.addEventListener('input', () => binding.applyFromInput());
        input.addEventListener('change', () => binding.applyFromInput());
        fieldBindings.push(binding);
        return binding;
    }

    const heightBinding = bindSliderInput({
        slider: heightSlider,
        input: heightInput,
        unitLabel: heightInputUnitLabel,
        isHeight: true,
    });

    bindSliderInput({
        slider: weightSlider,
        input: weightInput,
        unitLabel: weightInputUnitLabel,
        getConfig: () => getWeightInputConfig(
            unitToggle.checked,
            parseFloat(weightSlider.min),
            parseFloat(weightSlider.max),
            parseFloat(weightSlider.step)
        ),
    });

    bindSliderInput({
        slider: neckSlider,
        input: neckInput,
        unitLabel: neckInputUnitLabel,
        getConfig: () => getLengthInputConfig(
            unitToggle.checked,
            parseFloat(neckSlider.min),
            parseFloat(neckSlider.max),
            parseFloat(neckSlider.step)
        ),
    });

    bindSliderInput({
        slider: waistSlider,
        input: waistInput,
        unitLabel: waistInputUnitLabel,
        getConfig: () => getLengthInputConfig(
            unitToggle.checked,
            parseFloat(waistSlider.min),
            parseFloat(waistSlider.max),
            parseFloat(waistSlider.step)
        ),
    });

    const hipsBinding = bindSliderInput({
        slider: hipsSlider,
        input: hipsInput,
        unitLabel: hipsInputUnitLabel,
        getConfig: () => getLengthInputConfig(
            unitToggle.checked,
            parseFloat(hipsSlider.min),
            parseFloat(hipsSlider.max),
            parseFloat(hipsSlider.step)
        ),
    });

    function syncAllInputsFromSliders() {
        fieldBindings.forEach((b) => b.syncFromSlider());
    }

    function updateAllInputBounds() {
        fieldBindings.forEach((b) => b.updateBounds());
    }

    function setHipsEnabled(enabled) {
        hipsSlider.disabled = !enabled;
        hipsInput.disabled = !enabled;
        hipsGroup.classList.toggle('grayed-out', !enabled);
        document.querySelectorAll('[data-slider="hipsSlider"]').forEach((btn) => {
            btn.disabled = !enabled;
        });
        hipsBinding.updateBounds();
    }

    function loadSavedValues() {
        const saved = {
            gender: localStorage.getItem('ffmi_gender'),
            unit: localStorage.getItem('ffmi_unit'),
            darkMode: localStorage.getItem('ffmi_darkMode'),
            height: localStorage.getItem('ffmi_height'),
            weight: localStorage.getItem('ffmi_weight'),
            neck: localStorage.getItem('ffmi_neck'),
            waist: localStorage.getItem('ffmi_waist'),
            hips: localStorage.getItem('ffmi_hips'),
            activity: localStorage.getItem('ffmi_activity'),
            goalWeight: localStorage.getItem('ffmi_goalWeight'),
        };

        genderToggle.checked = saved.gender === 'true';
        unitToggle.checked = saved.unit === 'true';
        darkModeToggle.checked = saved.darkMode !== 'false';
        bodyElement.classList.toggle('dark', darkModeToggle.checked);

        heightSlider.value = String(clampHeightInches(saved.height || heightSlider.value));
        weightSlider.value = saved.weight || weightSlider.value;
        neckSlider.value = saved.neck || neckSlider.value;
        waistSlider.value = saved.waist || waistSlider.value;
        hipsSlider.value = saved.hips || hipsSlider.value;

        if (saved.activity) activityLevel.value = saved.activity;
        if (saved.goalWeight) goalWeightInput.value = saved.goalWeight;
    }

    function getCurrentFormState() {
        return {
            gender: genderToggle.checked,
            unit: unitToggle.checked,
            height: heightSlider.value,
            weight: weightSlider.value,
            neck: neckSlider.value,
            waist: waistSlider.value,
            hips: hipsSlider.value,
            activity: activityLevel.value,
            goalWeight: goalWeightInput.value,
        };
    }

    function applyFormState(state) {
        if (!state) return;
        genderToggle.checked = state.gender === true || state.gender === 'true';
        unitToggle.checked = state.unit === true || state.unit === 'true';
        heightSlider.value = String(clampHeightInches(state.height || heightSlider.value));
        weightSlider.value = state.weight || weightSlider.value;
        neckSlider.value = state.neck || neckSlider.value;
        waistSlider.value = state.waist || waistSlider.value;
        hipsSlider.value = state.hips || hipsSlider.value;
        if (state.activity != null) activityLevel.value = state.activity;
        goalWeightInput.value = state.goalWeight != null ? state.goalWeight : '';
        setHipsEnabled(genderToggle.checked);
        updateGoalWeightBounds();
        updateAllInputBounds();
        syncAllInputsFromSliders();
        updateFFMIScale(genderToggle.checked);
        updateColors(genderToggle.checked, darkModeToggle ? darkModeToggle.checked : false);
        updateUI();
    }

    function updateGoalWeightBounds() {
        if (unitToggle.checked) {
            goalWeightInput.min = '36';
            goalWeightInput.max = '182';
            goalWeightUnitLabel.textContent = 'kg';
        } else {
            goalWeightInput.min = '80';
            goalWeightInput.max = '400';
            goalWeightUnitLabel.textContent = 'lbs';
        }
    }

    function getTodayKey() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function getDailyHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveDailySnapshot() {
        const key = getTodayKey();
        const history = getDailyHistory();
        history[key] = getCurrentFormState();
        const keys = Object.keys(history).sort();
        if (keys.length > MAX_HISTORY_DAYS) {
            keys.slice(0, keys.length - MAX_HISTORY_DAYS).forEach((k) => delete history[k]);
        }
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }

    function saveValues() {
        localStorage.setItem('ffmi_gender', genderToggle.checked);
        localStorage.setItem('ffmi_unit', unitToggle.checked);
        localStorage.setItem('ffmi_height', heightSlider.value);
        localStorage.setItem('ffmi_weight', weightSlider.value);
        localStorage.setItem('ffmi_neck', neckSlider.value);
        localStorage.setItem('ffmi_waist', waistSlider.value);
        localStorage.setItem('ffmi_hips', hipsSlider.value);
        localStorage.setItem('ffmi_activity', activityLevel.value);
        localStorage.setItem('ffmi_goalWeight', goalWeightInput.value);
        localStorage.setItem('ffmi_darkMode', darkModeToggle.checked);
        const onToday = document.querySelector('input[name="historyDay"]:checked')?.value === 'today';
        if (onToday) {
            saveDailySnapshot();
            todayLiveState = getCurrentFormState();
        }
    }

    function formatHistoryDate(isoKey) {
        const [y, m, d] = isoKey.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const now = new Date();
        const isToday = now.getFullYear() === y && now.getMonth() === m - 1 && now.getDate() === d;
        if (isToday) return 'Today';
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function renderHistoryList() {
        const listEl = document.getElementById('historyList');
        if (!listEl) return;
        const history = getDailyHistory();
        const todayKey = getTodayKey();
        const keys = Object.keys(history).filter((k) => history[k] != null).sort().reverse();
        const selected = listEl.querySelector('input[name="historyDay"]:checked');
        const selectedValue = selected ? selected.value : 'today';

        let html = '';
        html += '<label class="history-item' + (selectedValue === 'today' ? ' is-selected' : '') + '"><input type="radio" class="history-item__radio" name="historyDay" value="today"' + (selectedValue === 'today' ? ' checked' : '') + '><span class="history-item__label">Today</span></label>';
        keys.forEach((key) => {
            if (key === todayKey) return;
            html += '<label class="history-item' + (selectedValue === key ? ' is-selected' : '') + '"><input type="radio" class="history-item__radio" name="historyDay" value="' + key + '"' + (selectedValue === key ? ' checked' : '') + '><span class="history-item__label">' + formatHistoryDate(key) + '</span></label>';
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('input[name="historyDay"]').forEach((radio) => {
            radio.addEventListener('change', function () {
                listEl.querySelectorAll('.history-item').forEach((el) => el.classList.remove('is-selected'));
                this.closest('.history-item').classList.add('is-selected');
                const value = this.value;
                if (value === 'today') {
                    applyFormState(todayLiveState);
                } else {
                    todayLiveState = getCurrentFormState();
                    const state = getDailyHistory()[value];
                    if (state) applyFormState(state);
                }
            });
        });
    }

    loadSavedValues();
    updateGoalWeightBounds();
    updateAllInputBounds();

    if (!genderToggle.checked) hipsSlider.value = 0;
    setHipsEnabled(genderToggle.checked);
    syncAllInputsFromSliders();

    updateUI();
    updateColors(genderToggle.checked, darkModeToggle ? darkModeToggle.checked : false);

    todayLiveState = getCurrentFormState();
    saveDailySnapshot();
    renderHistoryList();

    genderToggle.addEventListener('change', function () {
        setHipsEnabled(genderToggle.checked);
        if (!genderToggle.checked) {
            hipsSlider.value = 0;
        } else if (parseFloat(hipsSlider.value) === 0) {
            hipsSlider.value = 40;
        }
        hipsBinding.syncFromSlider();
        saveValues();
        updateFFMIScale(genderToggle.checked);
        updateColors(genderToggle.checked, darkModeToggle ? darkModeToggle.checked : false);
        updateUI();
    });

    const themeToggleBtn = document.getElementById('themeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function () {
            bodyElement.classList.toggle('dark', darkModeToggle.checked);
            saveValues();
            updateColors(genderToggle.checked, darkModeToggle.checked);
        });
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', function () {
                darkModeToggle.checked = !darkModeToggle.checked;
                darkModeToggle.dispatchEvent(new Event('change'));
            });
        }
    }

    unitToggle.addEventListener('change', function () {
        const currentGoalWeight = goalWeightInput.value.trim();
        if (currentGoalWeight) {
            const goalWeight = parseFloat(currentGoalWeight);
            if (!isNaN(goalWeight) && goalWeight > 0) {
                goalWeightInput.value = unitToggle.checked
                    ? (goalWeight / 2.2).toFixed(1)
                    : (goalWeight * 2.2).toFixed(1);
            }
        }
        updateGoalWeightBounds();
        updateAllInputBounds();
        syncAllInputsFromSliders();
        saveValues();
        updateUI();
    });

    activityLevel.addEventListener('change', function () {
        saveValues();
        updateUI();
    });

    goalWeightInput.addEventListener('input', function () {
        saveValues();
        updateUI();
    });

    function adjustSlider(sliderId, direction) {
        const slider = document.getElementById(sliderId);
        if (!slider || slider.disabled) return;

        const currentValue = parseFloat(slider.value);
        const step = parseFloat(slider.step) || 1;
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);

        const newValue = direction === 'increase'
            ? Math.min(max, currentValue + step)
            : Math.max(min, currentValue - step);

        slider.value = newValue;
        slider.dispatchEvent(new Event('input'));
    }

    document.querySelectorAll('.slider-btn').forEach((button) => {
        button.addEventListener('click', function () {
            adjustSlider(this.getAttribute('data-slider'), this.getAttribute('data-direction'));
        });
    });

    function updateUI() {
        const isMetric = unitToggle.checked;
        const isFemale = genderToggle.checked;

        const heightInches = parseFloat(heightSlider.value);
        const weightLbs = parseFloat(weightSlider.value);
        const neckInches = parseFloat(neckSlider.value);
        const waistInches = parseFloat(waistSlider.value);
        const hipsInches = isFemale ? parseFloat(hipsSlider.value) : 0;

        heightUnitLabel.textContent = isMetric ? '(cm)' : '(ft/in)';
        heightBinding.syncFromSlider();

        document.getElementById('heightValue').textContent = isMetric
            ? formatHeightMetric(heightInches)
            : formatHeightStandard(heightInches);

        const weightKgRounded = Math.round((weightLbs / 2.2) * 2) / 2;
        const weightLbsRounded = Math.round(weightLbs * 2) / 2;
        document.getElementById('weightValue').textContent = isMetric
            ? `${weightKgRounded.toFixed(1)} kg`
            : `${weightLbsRounded.toFixed(1)} lbs`;

        document.getElementById('neckValue').textContent = isMetric
            ? `${(neckInches * 2.54).toFixed(1)} cm`
            : `${neckSlider.value} in`;
        document.getElementById('waistValue').textContent = isMetric
            ? `${(waistInches * 2.54).toFixed(1)} cm`
            : `${waistSlider.value} in`;

        if (isFemale) {
            document.getElementById('hipsValue').textContent = isMetric
                ? `${(hipsInches * 2.54).toFixed(1)} cm`
                : `${hipsSlider.value} in`;
        } else {
            document.getElementById('hipsValue').textContent = isMetric ? '0 cm' : '0 in';
        }

        const activityMultiplier = parseFloat(activityLevel.value);

        let goalWeightLbs = null;
        const goalWeightValue = goalWeightInput.value.trim();
        if (goalWeightValue) {
            const goalWeight = parseFloat(goalWeightValue);
            if (!isNaN(goalWeight) && goalWeight > 0) {
                goalWeightLbs = isMetric ? goalWeight * 2.2 : goalWeight;
            }
        }

        calculateBodyMetrics(isMetric, heightInches, weightLbs, neckInches, waistInches, hipsInches, isFemale, activityMultiplier, goalWeightLbs);
    }

    function calculateBodyMetrics(isMetric, heightInches, weightLbs, neckInches, waistInches, hipsInches, isFemale, activityMultiplier, goalWeightLbs = null) {
        const metrics = computeBodyMetrics({
            isFemale,
            heightInches,
            weightLbs,
            neckInches,
            waistInches,
            hipsInches,
            activityMultiplier,
            goalWeightLbs,
        });

        document.getElementById('bmi').textContent = metrics.bmiValue.toFixed(2);
        const bmiCategoryElement = document.getElementById('bmiCategory');
        const category = metrics.bmiCategory;
        bmiCategoryElement.textContent = category;
        bmiCategoryElement.classList.remove('badge--good', 'badge--warn', 'badge--bad');
        bmiCategoryElement.classList.add('badge');
        if (category === 'Normal') {
            bmiCategoryElement.classList.add('badge--good');
        } else if (category === 'Underweight' || category === 'Overweight') {
            bmiCategoryElement.classList.add('badge--warn');
        } else if (category === 'Obese') {
            bmiCategoryElement.classList.add('badge--bad');
        }

        const fatFreeMassDisplay = isMetric ? metrics.fatFreeMass / 2.2 : metrics.fatFreeMass;
        document.getElementById('fatFreeMass').textContent = fatFreeMassDisplay.toFixed(2);
        document.getElementById('fatFreeMassUnit').textContent = isMetric ? 'kg' : 'lbs';
        document.getElementById('bodyFatCalc').textContent = `${metrics.bodyFatPercentage}%`;
        document.getElementById('ffmi').textContent = metrics.ffmi.toFixed(2);
        document.getElementById('adjustedFfmi').textContent = metrics.normalizedFfmi.toFixed(2);

        const label1 = document.getElementById('weightChangeLabel1');
        const label2 = document.getElementById('weightChangeLabel2');
        const weeksToGoal1lbElement = document.getElementById('weeksToGoal1lb');
        const weeksToGoal2lbElement = document.getElementById('weeksToGoal2lb');

        if (metrics.weightChangeMode === 'gain') {
            label1.textContent = 'Weight Gain';
            label2.textContent = 'Weight Gain';
            weeksToGoal1lbElement.textContent = `(~${metrics.weeks1lb} weeks to goal)`;
            weeksToGoal2lbElement.textContent = `(~${metrics.weeks2lb} weeks to goal)`;
        } else {
            label1.textContent = 'Weight Loss';
            label2.textContent = 'Weight Loss';
            if (metrics.weeks1lb != null) {
                weeksToGoal1lbElement.textContent = `(~${metrics.weeks1lb} weeks to goal)`;
                weeksToGoal2lbElement.textContent = `(~${metrics.weeks2lb} weeks to goal)`;
            } else {
                weeksToGoal1lbElement.textContent = '';
                weeksToGoal2lbElement.textContent = '';
            }
        }

        document.getElementById('bmr').textContent = Math.round(metrics.bmr);
        document.getElementById('bmrMinIntake').textContent = metrics.bmrMinimumIntake;
        document.getElementById('tdee').textContent = Math.round(metrics.tdee);
        document.getElementById('weightLoss1lb').textContent = metrics.cal1;
        document.getElementById('weightLoss2lb').textContent = metrics.cal2;

        const isLoss = metrics.weightChangeMode === 'loss';
        updateWeightLossFloorWarning(
            'weightLoss1lb',
            'bmrFloorWarning1lb',
            metrics.cal1,
            metrics.bmrMinimumIntake,
            isLoss
        );
        updateWeightLossFloorWarning(
            'weightLoss2lb',
            'bmrFloorWarning2lb',
            metrics.cal2,
            metrics.bmrMinimumIntake,
            isLoss
        );

        updateFFMIIndicator(isFemale, metrics.ffmiIndicatorPosition);
    }

    function updateWeightLossFloorWarning(calorieId, warningId, intake, minIntake, isLoss) {
        const calEl = document.getElementById(calorieId);
        const warningEl = document.getElementById(warningId);
        if (!calEl || !warningEl) return;

        if (!isLoss || intake >= minIntake) {
            calEl.classList.remove('weight-loss-cal--below-floor');
            warningEl.textContent = '';
            warningEl.className = 'bmr-floor-warning';
            return;
        }

        calEl.classList.add('weight-loss-cal--below-floor');
        warningEl.textContent = `Below minimum (${minIntake} cal/day)`;
        warningEl.className = 'bmr-floor-warning bmr-floor-warning--high';
    }

    function updateFFMIIndicator(isFemale, indicatorPosition) {
        const ffmiIndicator = isFemale
            ? document.getElementById('ffmiIndicatorFemale')
            : document.getElementById('ffmiIndicatorMale');
        ffmiIndicator.style.left = `${indicatorPosition}%`;
    }

    function updateColors(isFemale, isDark) {
        document.body.classList.toggle('female', isFemale);
        const accent = isFemale ? '#e891b0' : '#3FA2FF';
        const accentSoft = isFemale ? 'rgba(232, 145, 176, 0.18)' : 'rgba(63, 162, 255, 0.18)';
        document.documentElement.style.setProperty('--accent', accent);
        document.documentElement.style.setProperty('--accent-soft', accentSoft);
        document.documentElement.style.setProperty('--accent-hover', isFemale ? '#f0a0c0' : '#66B6FF');
    }

    function updateFFMIScale(isFemale) {
        document.getElementById('ffmiScaleMale').setAttribute('aria-hidden', isFemale ? 'true' : 'false');
        document.getElementById('ffmiScaleFemale').setAttribute('aria-hidden', isFemale ? 'false' : 'true');
    }

    document.querySelectorAll('.tooltip-trigger').forEach(function (trigger) {
        const tooltipText = trigger.querySelector('.tooltip-text');
        if (tooltipText) {
            tooltipText.textContent = trigger.getAttribute('data-tooltip');
        }
    });
});
