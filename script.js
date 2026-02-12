document.addEventListener('DOMContentLoaded', function () {
    const genderToggle = document.getElementById('genderToggle'); // Male/Female toggle
    const unitToggle = document.getElementById('unitToggle'); // Standard/Metric toggle
    const heightSlider = document.getElementById('heightSlider');
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
        updateUI(); // Update the display without moving sliders
    });

    // Activity Level Selector - already defined above
    activityLevel.addEventListener('change', function() {
        saveValues(); // Save to localStorage
        updateUI();
    });

    // Update input listeners - save values on change
    heightSlider.addEventListener('input', function() {
        saveValues();
        updateUI();
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
            const heightCm = (heightInches * 2.54).toFixed(1); // Convert inches to cm
            document.getElementById('heightValue').textContent = `${heightCm} cm`;
        } else {
            const feet = Math.floor(heightInches / 12);
            const inches = Math.round(heightInches % 12);
            document.getElementById('heightValue').textContent = `${feet}' ${inches}"`;
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
        // Convert height/weight to metric if necessary
        const heightMeters = heightInches * 0.0254;
        const heightCm = heightInches * 2.54;
        const weightKg = weightLbs / 2.2;

        // BMI Calculation
        // Standard BMI formula: weight(kg) / height(m)² or weight(lbs) × 703 / height(in)²
        const bmiValue = isMetric
            ? (weightKg / Math.pow(heightMeters, 2))
            : ((weightLbs * 703) / Math.pow(heightInches, 2));
        
        document.getElementById('bmi').textContent = bmiValue.toFixed(2);
        const bmiCategoryElement = document.getElementById('bmiCategory');
        const category = getBMICategory(bmiValue);
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

        // Body Fat Calculation - U.S. Navy method
        // Note: Body fat % depends on waist, neck, hips (females), and height - NOT weight
        // Ensure all values are valid numbers, use defaults if invalid
        const validWaist = isNaN(waistInches) || waistInches <= 0 ? 34 : waistInches;
        const validNeck = isNaN(neckInches) || neckInches <= 0 ? 15 : neckInches;
        const validHeight = isNaN(heightInches) || heightInches <= 0 ? 70 : heightInches;
        const validHips = isFemale ? (isNaN(hipsInches) || hipsInches <= 0 ? 40 : hipsInches) : 0;
        
        const bodyFatPercentageRaw = calculateBodyFatPercentage(isFemale, validWaist, validNeck, validHips, validHeight);
        // Clamp body fat percentage to reasonable range (0-70% to handle edge cases)
        const bodyFatPercentageClamped = Math.max(0, Math.min(70, bodyFatPercentageRaw));
        const bodyFatPercentage = Math.round(bodyFatPercentageClamped); // Round to whole percentage
        const fatFreeMass = weightLbs * (1 - (bodyFatPercentage / 100));
        const ffmi = (fatFreeMass / 2.2) / Math.pow(heightMeters, 2);
        const normalizedFfmi = ffmi + (6.3 * (1.8 - heightMeters));

        // Update calculated values with proper units
        const fatFreeMassDisplay = isMetric ? (fatFreeMass / 2.2) : fatFreeMass;
        const fatFreeMassUnit = isMetric ? 'kg' : 'lbs';
        document.getElementById('fatFreeMass').textContent = fatFreeMassDisplay.toFixed(2);
        document.getElementById('fatFreeMassUnit').textContent = fatFreeMassUnit;
        document.getElementById('bodyFatCalc').textContent = `${bodyFatPercentage}%`;
        document.getElementById('ffmi').textContent = ffmi.toFixed(2);
        document.getElementById('adjustedFfmi').textContent = normalizedFfmi.toFixed(2);

        // Calculate BMR and TDEE
        const bmr = calculateBMR(isFemale, weightKg, heightCm);
        const tdee = bmr * activityMultiplier;
        
        const label1 = document.getElementById('weightChangeLabel1');
        const label2 = document.getElementById('weightChangeLabel2');
        const weeksToGoal1lbElement = document.getElementById('weeksToGoal1lb');
        const weeksToGoal2lbElement = document.getElementById('weeksToGoal2lb');
        
        let cal1, cal2;
        if (goalWeightLbs && goalWeightLbs > weightLbs) {
            // Goal weight above current = weight gain (surplus: +500 cal for 1 lb/week, +1000 for 2 lb/week)
            label1.textContent = 'Weight Gain';
            label2.textContent = 'Weight Gain';
            cal1 = Math.round(tdee + 500);
            cal2 = Math.round(tdee + 1000);
            
            const weightToGain = goalWeightLbs - weightLbs;
            const weeks1lb = Math.ceil(weightToGain / 1);
            const weeks2lb = Math.ceil(weightToGain / 2);
            weeksToGoal1lbElement.textContent = `(~${weeks1lb} weeks to goal)`;
            weeksToGoal2lbElement.textContent = `(~${weeks2lb} weeks to goal)`;
        } else if (goalWeightLbs && goalWeightLbs < weightLbs) {
            // Goal weight below current = weight loss (deficit)
            label1.textContent = 'Weight Loss';
            label2.textContent = 'Weight Loss';
            cal1 = Math.max(0, Math.round(tdee - 500));
            cal2 = Math.max(0, Math.round(tdee - 1000));
            
            const weightToLose = weightLbs - goalWeightLbs;
            const weeks1lb = Math.ceil(weightToLose / 1);
            const weeks2lb = Math.ceil(weightToLose / 2);
            weeksToGoal1lbElement.textContent = `(~${weeks1lb} weeks to goal)`;
            weeksToGoal2lbElement.textContent = `(~${weeks2lb} weeks to goal)`;
        } else {
            // No goal or goal equals current: show weight loss options, no weeks
            label1.textContent = 'Weight Loss';
            label2.textContent = 'Weight Loss';
            cal1 = Math.max(0, Math.round(tdee - 500));
            cal2 = Math.max(0, Math.round(tdee - 1000));
            weeksToGoal1lbElement.textContent = '';
            weeksToGoal2lbElement.textContent = '';
        }

        document.getElementById('bmr').textContent = Math.round(bmr);
        document.getElementById('tdee').textContent = Math.round(tdee);
        document.getElementById('weightLoss1lb').textContent = cal1;
        document.getElementById('weightLoss2lb').textContent = cal2;

        // Update FFMI indicator (ensure it is overlayed on the color bar)
        updateFFMIIndicator(ffmi, isFemale);
    }

    // Update FFMI indicator based on gender
    function updateFFMIIndicator(ffmi, isFemale) {
        let ffmiMin, ffmiMax;

        // Adjust FFMI ranges based on gender
        if (isFemale) {
            ffmiMin = 14;
            ffmiMax = 21;
        } else {
            ffmiMin = 16;
            ffmiMax = 30;
        }

        // Place the indicator on the FFMI scale
        const indicatorPosition = ((ffmi - ffmiMin) / (ffmiMax - ffmiMin)) * 100;

        const ffmiIndicator = isFemale ? document.getElementById('ffmiIndicatorFemale') : document.getElementById('ffmiIndicatorMale');

        ffmiIndicator.style.left = `${Math.max(0, Math.min(indicatorPosition, 99))}%`; // Ensure padding
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


    // Determine BMI category based on correct ranges
    function getBMICategory(bmi) {
        if (bmi < 18.5) return "Underweight";
        if (bmi >= 18.5 && bmi < 25) return "Normal";
        if (bmi >= 25 && bmi < 30) return "Overweight";
        if (bmi >= 30) return "Obese";
    }

    // Calculate body fat percentage (U.S. Navy method)
    // Formulas verified from official U.S. Navy body composition assessment
    // Male: BF% = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
    // Female: BF% = 163.205 × log10(waist + hips - neck) - 97.684 × log10(height) - 78.387
    function calculateBodyFatPercentage(isFemale, waist, neck, hips, height) {
        if (isFemale) {
            // Ensure hips is valid (not 0) for female calculation
            const hipsValue = hips > 0 ? hips : 40; // Default to 40 if hips is 0 or invalid
            const waistHipsNeck = waist + hipsValue - neck;
            // Ensure the value is positive for log10 calculation
            if (waistHipsNeck <= 0 || height <= 0) {
                return 0; // Return 0 if calculation would be invalid
            }
            // U.S. Navy formula for females (all measurements in inches)
            const bf = 163.205 * Math.log10(waistHipsNeck) - 97.684 * Math.log10(height) - 78.387;
            return bf;
        } else {
            const waistNeck = waist - neck;
            // Ensure the value is positive for log10 calculation
            if (waistNeck <= 0 || height <= 0) {
                return 0; // Return 0 if calculation would be invalid
            }
            // U.S. Navy formula for males (all measurements in inches)
            const bf = 86.010 * Math.log10(waistNeck) - 70.041 * Math.log10(height) + 36.76;
            return bf;
        }
    }

    // Toggle between FFMI scales based on gender
    function updateFFMIScale(isFemale) {
        document.getElementById('ffmiScaleMale').setAttribute('aria-hidden', isFemale ? 'true' : 'false');
        document.getElementById('ffmiScaleFemale').setAttribute('aria-hidden', isFemale ? 'false' : 'true');
    }

    // Calculate BMR using Mifflin-St Jeor Equation
    // BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + gender_factor
    // For simplicity, we'll use age 30 as default (most common use case)
    // Male: +5, Female: -161
    function calculateBMR(isFemale, weightKg, heightCm) {
        const age = 30; // Default age, can be made configurable later
        if (isFemale) {
            return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
        } else {
            return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
        }
    }

    // Initialize tooltips
    document.querySelectorAll('.tooltip-trigger').forEach(function(trigger) {
        const tooltipText = trigger.querySelector('.tooltip-text');
        if (tooltipText) {
            tooltipText.textContent = trigger.getAttribute('data-tooltip');
        }
    });
});
