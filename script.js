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

    // Set default to Standard system and Male (male by default)
    unitToggle.checked = false; // Default to standard (US system)
    genderToggle.checked = false; // Default to Male

    // Set default hip value to 0 when male is selected
    hipsSlider.value = 0;
    document.getElementById('hipsValue').textContent = '0 in'; // Will be updated by updateUI()

    // Gray out hip slider by default since male is selected
    hipsSlider.disabled = true;
    hipsGroup.classList.add('grayed-out'); // Adding a class to indicate it's grayed out

    updateUI();
    updateColors(genderToggle.checked);

    // Gender Toggle (Male/Female)
    genderToggle.addEventListener('change', function () {
        hipsSlider.disabled = !genderToggle.checked; // Enable only when female is selected
        hipsGroup.classList.toggle('grayed-out', !genderToggle.checked); // Gray out when male

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

        updateFFMIScale(genderToggle.checked); // Switch FFMI scale based on gender
        updateColors(genderToggle.checked); // Update colors based on gender
        updateUI();
    });

    // Unit System Toggle (Standard/Metric)
    unitToggle.addEventListener('change', function () {
        updateUI(); // Update the display without moving sliders
    });

    // Activity Level Selector - already defined above
    activityLevel.addEventListener('change', updateUI);

    // Update input listeners
    heightSlider.addEventListener('input', updateUI);
    weightSlider.addEventListener('input', updateUI);
    neckSlider.addEventListener('input', updateUI);
    waistSlider.addEventListener('input', updateUI);
    hipsSlider.addEventListener('input', updateUI);

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
        calculateBodyMetrics(isMetric, heightInches, weightLbs, neckInches, waistInches, hipsInches, isFemale, activityMultiplier);
    }

    function calculateBodyMetrics(isMetric, heightInches, weightLbs, neckInches, waistInches, hipsInches, isFemale, activityMultiplier) {
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
        document.getElementById('bmiCategory').textContent = `(${getBMICategory(bmiValue)})`;

        // Body Fat Calculation - U.S. Navy method
        const bodyFatPercentageRaw = calculateBodyFatPercentage(isFemale, waistInches, neckInches, hipsInches, heightInches);
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
        
        // Calculate weight loss calories (1 lb/week = 500 cal deficit, 2 lb/week = 1000 cal deficit)
        const weightLoss1lb = Math.max(0, Math.round(tdee - 500));
        const weightLoss2lb = Math.max(0, Math.round(tdee - 1000));

        // Update TDEE and weight loss values
        document.getElementById('bmr').textContent = Math.round(bmr);
        document.getElementById('tdee').textContent = Math.round(tdee);
        document.getElementById('weightLoss1lb').textContent = weightLoss1lb;
        document.getElementById('weightLoss2lb').textContent = weightLoss2lb;

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

// Update the colors based on gender
function updateColors(isFemale) {
    const primaryColor = isFemale ? '#ff8ab8' : '#4a90e2'; // Softer pink for female, softer blue for male
    const primaryColorLight = isFemale ? '#ffe4f0' : '#dbeaff'; // Lighter background shades
    const sliderColor = primaryColor; // Matching slider color to primary
    
    // Set CSS custom properties for primary and slider colors
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--primary-color-light', primaryColorLight);
    document.documentElement.style.setProperty('--slider-color', sliderColor); // Update slider bar color
    
    // Set the entire page background color
    bodyElement.style.backgroundColor = primaryColorLight; // Light background colors for male and female
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
        document.getElementById('ffmiScaleMale').style.display = isFemale ? 'none' : 'block';
        document.getElementById('ffmiScaleFemale').style.display = isFemale ? 'block' : 'none';
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
