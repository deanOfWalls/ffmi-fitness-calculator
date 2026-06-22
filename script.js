import { computeBodyMetrics } from './lib/calculations.mjs';
import {
    clampHeightInches,
    formatHeightStandard,
    formatHeightMetric,
    heightInchesToInputValue,
    parseHeightInput,
    getHeightInputBounds,
} from './lib/height-utils.mjs';

document.addEventListener('DOMContentLoaded', function () {
    const genderToggle = document.getElementById('genderToggle'); // Male/Female toggle
    const unitToggle = document.getElementById('unitToggle'); // Standard/Metric toggle
    const heightSlider = document.getElementById('heightSlider');
    const heightInput = document.getElementById('heightInput');
    const heightInputUnitLabel = document.getElementById('heightInputUnitLabel');
    const weightSlider = document.getElementById('weightSlider');
    const neckSlider = document.getElementById('neckSlider');
    const waistSlider = document.getElementById('waistSlider');
    const hipsSlider = document.getElementById('hipsSlider');
    const hipsGroup = document.getElementById('hipsGroup');
    const ffmiIndicator = document.getElementById('ffmiIndicatorMale'); // Default male
    const bodyElement = document.body;

    // Unit Labels
    const heightUnitLabel = document.getElementById('heightUnitLabel');
    const weightUnitLabel = document.getElementById('weightUnitLabel');
    const neckUnitLabel = document.getElementById('neckUnitLabel');
    const waistUnitLabel = document.getElementById('waistUnitLabel');
    const hipsUnitLabel = document.getElementById('hipsUnitLabel');

    // Activity Level Selector - must be defined before updateUI() is called
    const activityLevel = document.getElementById('activityLevel');
    
    // Goal Weight Input
    const goalWeightInput = document.getElementById('goalWeightInput');
    const goalWeightUnitLabel = document.getElementById('goalWeightUnitLabel');
    const darkModeToggle = document.getElementById('darkModeToggle');

    // Load saved values from localStorage or use defaults
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
            goalWeight: localStorage.getItem('ffmi_goalWeight')
        };

        // Load gender (default: false = Male)
        genderToggle.checked = saved.gender === 'true';

        // Load unit system (default: false = Standard)
        unitToggle.checked = saved.unit === 'true';

        // Load dark mode (default: true = Dark when no preference saved)
        darkModeToggle.checked = saved.darkMode !== 'false';
        bodyElement.classList.toggle('dark', darkModeToggle.checked);

        // Load slider values with defaults from HTML
        heightSlider.value = saved.height || heightSlider.value;
        heightSlider.value = String(clampHeightInches(heightSlider.value));
        weightSlider.value = saved.weight || weightSlider.value;
        neckSlider.value = saved.neck || neckSlider.value;
        waistSlider.value = saved.waist || waistSlider.value;
        hipsSlider.value = saved.hips || hipsSlider.value;

        // Load activity level
        if (saved.activity) {
            activityLevel.value = saved.activity;
        }
        
        // Load goal weight
        if (saved.goalWeight) {
            goalWeightInput.value = saved.goalWeight;
        }
    }

    const HISTORY_KEY = 'ffmi_daily_history';
    const MAX_HISTORY_DAYS = 365;

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
            goalWeight: goalWeightInput.value
        };
    }

    function applyFormState(state) {
        if (!state) return;
        genderToggle.checked = state.gender === true || state.gender === 'true';
        unitToggle.checked = state.unit === true || state.unit === 'true';
        heightSlider.value = state.height || heightSlider.value;
        heightSlider.value = String(clampHeightInches(heightSlider.value));
        syncHeightInputFromSlider();
        weightSlider.value = state.weight || weightSlider.value;
        neckSlider.value = state.neck || neckSlider.value;
        waistSlider.value = state.waist || waistSlider.value;
        hipsSlider.value = state.hips || hipsSlider.value;
        if (state.activity != null) activityLevel.value = state.activity;
        goalWeightInput.value = state.goalWeight != null ? state.goalWeight : '';
        hipsSlider.disabled = !genderToggle.checked;
        hipsGroup.classList.toggle('grayed-out', !genderToggle.checked);
        document.querySelectorAll('[data-slider="hipsSlider"]').forEach(btn => btn.disabled = !genderToggle.checked);
        if (unitToggle.checked) {
            goalWeightInput.min = '36';
            goalWeightInput.max = '182';
        } else {
            goalWeightInput.min = '80';
            goalWeightInput.max = '400';
        }
        updateFFMIScale(genderToggle.checked);
        updateColors(genderToggle.checked, darkModeToggle ? darkModeToggle.checked : false);
        updateUI();
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
            keys.slice(0, keys.length - MAX_HISTORY_DAYS).forEach(k => delete history[k]);
        }
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }

    // Save values to localStorage
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

    // Today's live state (restored when switching back from a past day)
    let todayLiveState = null;
    let syncingHeight = false;

    function updateHeightInputBounds() {
        const bounds = getHeightInputBounds(unitToggle.checked);
        heightInput.min = String(bounds.min);
        heightInput.max = String(bounds.max);
        heightInput.step = String(bounds.step);
        heightInputUnitLabel.textContent = unitToggle.checked ? 'cm' : 'inches';
    }

    function syncHeightInputFromSlider() {
        if (syncingHeight) return;
        syncingHeight = true;
        heightInput.value = heightInchesToInputValue(heightSlider.value, unitToggle.checked);
        syncingHeight = false;
    }

    function applyHeightFromManualInput() {
        if (syncingHeight) return;
        const inches = parseHeightInput(heightInput.value, unitToggle.checked);
        if (inches == null) return;
        syncingHeight = true;
        heightSlider.value = String(inches);
        syncingHeight = false;
        saveValues();
        updateUI();
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
        const keys = Object.keys(history).filter(k => history[k] != null).sort().reverse();
        const selected = listEl.querySelector('input[name="historyDay"]:checked');
        const selectedValue = selected ? selected.value : 'today';

        let html = '';
        html += '<label class="history-item' + (selectedValue === 'today' ? ' is-selected' : '') + '"><input type="radio" name="historyDay" value="today"' + (selectedValue === 'today' ? ' checked' : '') + '> <span class="history-item__label">Today</span></label>';
        keys.forEach(key => {
            if (key === todayKey) return;
            html += '<label class="history-item' + (selectedValue === key ? ' is-selected' : '') + '"><input type="radio" name="historyDay" value="' + key + '"' + (selectedValue === key ? ' checked' : '') + '> <span class="history-item__label">' + formatHistoryDate(key) + '</span></label>';
        });
        listEl.innerHTML = html;

        listEl.querySelectorAll('input[name="historyDay"]').forEach(radio => {
            radio.addEventListener('change', function () {
                listEl.querySelectorAll('.history-item').forEach(el => el.classList.remove('is-selected'));
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

    // Load saved values
    loadSavedValues();
    updateHeightInputBounds();
    syncHeightInputFromSlider();
    
    // Set initial goal weight input min/max based on unit system
    if (unitToggle.checked) {
        goalWeightInput.min = '36';
        goalWeightInput.max = '182';
    } else {
        goalWeightInput.min = '80';
        goalWeightInput.max = '400';
    }

    // Set default hip value to 0 when male is selected
    if (!genderToggle.checked) {
        hipsSlider.value = 0;
    }
    document.getElementById('hipsValue').textContent = '0 in'; // Will be updated by updateUI()

    // Gray out hip slider by default since male is selected
    hipsSlider.disabled = !genderToggle.checked;
    hipsGroup.classList.toggle('grayed-out', !genderToggle.checked);
    
    // Disable hip slider buttons initially if male
    const hipsButtons = document.querySelectorAll('[data-slider="hipsSlider"]');
    hipsButtons.forEach(btn => btn.disabled = !genderToggle.checked);

    updateUI();
    updateColors(genderToggle.checked, darkModeToggle ? darkModeToggle.checked : false);

    todayLiveState = getCurrentFormState();
    saveDailySnapshot();
    renderHistoryList();

    // Gender Toggle (Male/Female)
    genderToggle.addEventListener('change', function () {
        hipsSlider.disabled = !genderToggle.checked; // Enable only when female is selected
        hipsGroup.classList.toggle('grayed-out', !genderToggle.checked); // Gray out when male
        
        // Disable/enable hip slider buttons
        const hipsButtons = document.querySelectorAll('[data-slider="hipsSlider"]');
        hipsButtons.forEach(btn => btn.disabled = !genderToggle.checked);

        // Set default hip value to 0 if male is selected
        if (!genderToggle.checked) {
            hipsSlider.value = 0;
            const isMetric = unitToggle.checked;
            document.getElementById('hipsValue').textContent = isMetric ? '0 cm' : '0 in';
        } else {
            // When switching to female, set a reasonable default if hips is 0
            if (parseFloat(hipsSlider.value) === 0) {
                hipsSlider.value = 40; // Default hip measurement
            }
        }

        saveValues(); // Save to localStorage
        updateFFMIScale(genderToggle.checked); // Switch FFMI scale based on gender
        updateColors(genderToggle.checked, darkModeToggle ? darkModeToggle.checked : false);
        updateUI();
    });

    // Dark mode: theme button (top-right) toggles hidden checkbox; icon reflects current mode via CSS
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

    // Unit System Toggle (Standard/Metric)
    unitToggle.addEventListener('change', function () {
        // Convert goal weight value when switching units
        const currentGoalWeight = goalWeightInput.value.trim();
        if (currentGoalWeight) {
            const goalWeight = parseFloat(currentGoalWeight);
            if (!isNaN(goalWeight) && goalWeight > 0) {
                if (unitToggle.checked) {
                    // Converting from lbs to kg
                    goalWeightInput.value = (goalWeight / 2.2).toFixed(1);
                } else {
                    // Converting from kg to lbs
                    goalWeightInput.value = (goalWeight * 2.2).toFixed(1);
                }
            }
        }
        
        // Update goal weight input min/max based on unit system
        if (unitToggle.checked) {
            // Metric: convert 80-400 lbs to ~36-182 kg
            goalWeightInput.min = '36';
            goalWeightInput.max = '182';
        } else {
            // Standard: 80-400 lbs
            goalWeightInput.min = '80';
            goalWeightInput.max = '400';
        }
        
        saveValues(); // Save to localStorage
        updateHeightInputBounds();
        syncHeightInputFromSlider();
        updateUI(); // Update the display without moving sliders
    });

    // Activity Level Selector - already defined above
    activityLevel.addEventListener('change', function() {
        saveValues(); // Save to localStorage
        updateUI();
    });

    // Update input listeners - save values on change
    heightSlider.addEventListener('input', function() {
        syncHeightInputFromSlider();
        saveValues();
        updateUI();
    });
    heightInput.addEventListener('input', function() {
        applyHeightFromManualInput();
    });
    heightInput.addEventListener('change', function() {
        applyHeightFromManualInput();
    });
    weightSlider.addEventListener('input', function() {
        saveValues();
        updateUI();
    });
    neckSlider.addEventListener('input', function() {
        saveValues();
        updateUI();
    });
    waistSlider.addEventListener('input', function() {
        saveValues();
        updateUI();
    });
    hipsSlider.addEventListener('input', function() {
        saveValues();
        updateUI();
    });
    
    // Goal weight input listener
    goalWeightInput.addEventListener('input', function() {
        saveValues();
        updateUI();
    });

    // Add arrow button functionality for precise slider control
    function adjustSlider(sliderId, direction) {
        const slider = document.getElementById(sliderId);
        if (!slider || slider.disabled) return;
        
        const currentValue = parseFloat(slider.value);
        const step = parseFloat(slider.step) || 1;
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        
        let newValue;
        if (direction === 'increase') {
            newValue = Math.min(max, currentValue + step);
        } else {
            newValue = Math.max(min, currentValue - step);
        }
        
        slider.value = newValue;
        saveValues();
        updateUI();
    }

    // Add event listeners to all slider buttons
    document.querySelectorAll('.slider-btn').forEach(button => {
        button.addEventListener('click', function() {
            const sliderId = this.getAttribute('data-slider');
            const direction = this.getAttribute('data-direction');
            adjustSlider(sliderId, direction);
        });
    });

    // Update the UI calculations and input values
    function updateUI() {
        const isMetric = unitToggle.checked;
        const isFemale = genderToggle.checked;

        let heightInches = parseFloat(heightSlider.value);
        let weightLbs = parseFloat(weightSlider.value);
        let neckInches = parseFloat(neckSlider.value);
        let waistInches = parseFloat(waistSlider.value);
        let hipsInches = isFemale ? parseFloat(hipsSlider.value) : 0;

        // Toggle Unit Labels based on Metric/Standard
        heightUnitLabel.textContent = isMetric ? 'cm' : 'ft/in';
        weightUnitLabel.textContent = isMetric ? 'kg' : 'lbs';
        neckUnitLabel.textContent = isMetric ? 'cm' : 'inches';
        waistUnitLabel.textContent = isMetric ? 'cm' : 'inches';
        hipsUnitLabel.textContent = isMetric ? 'cm' : 'inches';
        goalWeightUnitLabel.textContent = isMetric ? 'kg' : 'lbs';

        // Update height display with correct suffix (but don't change the slider position)
        if (isMetric) {
            document.getElementById('heightValue').textContent = formatHeightMetric(heightInches);
        } else {
            document.getElementById('heightValue').textContent = formatHeightStandard(heightInches);
        }
        if (!syncingHeight) {
            syncHeightInputFromSlider();
        }

        // Update weight display with correct suffix (but don't change the slider position)
        if (isMetric) {
            const weightKg = (weightLbs / 2.2);
            // Round to nearest 0.5 for display
            const weightKgRounded = Math.round(weightKg * 2) / 2;
            document.getElementById('weightValue').textContent = `${weightKgRounded.toFixed(1)} kg`;
        } else {
            // Round to nearest 0.5 for display
            const weightLbsRounded = Math.round(weightLbs * 2) / 2;
            document.getElementById('weightValue').textContent = `${weightLbsRounded.toFixed(1)} lbs`;
        }

        // Update neck and waist display with correct suffix (but don't change the slider position)
        if (isMetric) {
            const neckCm = (neckInches * 2.54).toFixed(1); // Convert inches to cm
            const waistCm = (waistInches * 2.54).toFixed(1); // Convert inches to cm
            document.getElementById('neckValue').textContent = `${neckCm} cm`;
            document.getElementById('waistValue').textContent = `${waistCm} cm`;
        } else {
            document.getElementById('neckValue').textContent = `${neckSlider.value} in`;
            document.getElementById('waistValue').textContent = `${waistSlider.value} in`;
        }

        // Update hips display if applicable
        if (isFemale) {
            if (isMetric) {
                const hipsCm = (hipsInches * 2.54).toFixed(1); // Convert inches to cm
                document.getElementById('hipsValue').textContent = `${hipsCm} cm`;
            } else {
                document.getElementById('hipsValue').textContent = `${hipsSlider.value} in`;
            }
        } else {
            // Set hip value to 0 when male is selected, respecting unit system
            document.getElementById('hipsValue').textContent = isMetric ? '0 cm' : '0 in';
        }

        // BMI, FFMI, and other calculations
        const activityMultiplier = parseFloat(activityLevel.value);
        
        // Get goal weight and convert to lbs if needed
        let goalWeightLbs = null;
        const goalWeightValue = goalWeightInput.value.trim();
        if (goalWeightValue) {
            const goalWeight = parseFloat(goalWeightValue);
            if (!isNaN(goalWeight) && goalWeight > 0) {
                goalWeightLbs = isMetric ? (goalWeight * 2.2) : goalWeight;
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

        const bmiValue = metrics.bmiValue;
        document.getElementById('bmi').textContent = bmiValue.toFixed(2);
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

        const bodyFatPercentage = metrics.bodyFatPercentage;
        const fatFreeMass = metrics.fatFreeMass;
        const ffmi = metrics.ffmi;
        const normalizedFfmi = metrics.normalizedFfmi;
        const bmr = metrics.bmr;
        const tdee = metrics.tdee;

        const fatFreeMassDisplay = isMetric ? (fatFreeMass / 2.2) : fatFreeMass;
        const fatFreeMassUnit = isMetric ? 'kg' : 'lbs';
        document.getElementById('fatFreeMass').textContent = fatFreeMassDisplay.toFixed(2);
        document.getElementById('fatFreeMassUnit').textContent = fatFreeMassUnit;
        document.getElementById('bodyFatCalc').textContent = `${bodyFatPercentage}%`;
        document.getElementById('ffmi').textContent = ffmi.toFixed(2);
        document.getElementById('adjustedFfmi').textContent = normalizedFfmi.toFixed(2);

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

        document.getElementById('bmr').textContent = Math.round(bmr);
        document.getElementById('tdee').textContent = Math.round(tdee);
        document.getElementById('weightLoss1lb').textContent = metrics.cal1;
        document.getElementById('weightLoss2lb').textContent = metrics.cal2;

        updateFFMIIndicator(ffmi, isFemale, metrics.ffmiIndicatorPosition);
    }

    function updateFFMIIndicator(ffmi, isFemale, indicatorPosition) {
        const ffmiIndicator = isFemale
            ? document.getElementById('ffmiIndicatorFemale')
            : document.getElementById('ffmiIndicatorMale');
        ffmiIndicator.style.left = `${indicatorPosition}%`;
    }

// Sync accent with gender; style.css uses body.female for --primary-color / --slider-color
function updateColors(isFemale, isDark) {
    document.body.classList.toggle('female', isFemale);
    const accent = isFemale ? '#e891b0' : '#3FA2FF';
    const accentSoft = isFemale ? 'rgba(232, 145, 176, 0.18)' : 'rgba(63, 162, 255, 0.18)';
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-soft', accentSoft);
    document.documentElement.style.setProperty('--accent-hover', isFemale ? '#f0a0c0' : '#66B6FF');
}


    // Toggle between FFMI scales based on gender
    function updateFFMIScale(isFemale) {
        document.getElementById('ffmiScaleMale').setAttribute('aria-hidden', isFemale ? 'true' : 'false');
        document.getElementById('ffmiScaleFemale').setAttribute('aria-hidden', isFemale ? 'false' : 'true');
    }

    // Initialize tooltips
    document.querySelectorAll('.tooltip-trigger').forEach(function(trigger) {
        const tooltipText = trigger.querySelector('.tooltip-text');
        if (tooltipText) {
            tooltipText.textContent = trigger.getAttribute('data-tooltip');
        }
    });
});
