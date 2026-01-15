# QC Tab Guide

The Quality Control (QC) tab provides diagnostic visualizations to assess the quality of your multi-echo fMRI data and tedana processing.

## Overview

The QC tab displays:

- Brain maps derived from multi-echo fitting
- Histograms of parameter distributions
- Diagnostic time series plots

These visualizations help you identify data quality issues that may affect component classification.

## Brain Maps

### T2* Map

**What it shows**: The estimated T2* relaxation time at each voxel.

**How to interpret**:

| Region | Expected T2* | Notes |
|--------|--------------|-------|
| Gray matter | 30-50 ms | Varies by field strength |
| White matter | 40-60 ms | Slightly longer than GM |
| CSF | Very long | May appear saturated |
| Air/bone | Very short/zero | Signal dropout |

**What to look for**:

- **Uniform values in gray matter**: Good data quality
- **Spotty or noisy**: Motion or acquisition issues
- **Very low values near sinuses**: Expected susceptibility dropout
- **Asymmetric patterns**: Potential shimming issues

!!! note "Field Strength Matters"
    T2* values scale with field strength. Values above are approximate for 3T.

### S0 Map

**What it shows**: The estimated signal intensity at TE=0 (proton density weighted).

**How to interpret**:

| Feature | Interpretation |
|---------|----------------|
| Bright gray matter | Normal |
| Bright CSF | Normal |
| Dark white matter | Normal |
| Very bright spots | Possible vessels or artifacts |
| Dark spots in brain | Signal dropout |

**What to look for**:

- **Smooth intensity**: Good coil sensitivity
- **Bright edges**: Potential surface artifacts
- **Rings or bands**: Acquisition artifacts

### RMSE Map

**What it shows**: Root Mean Square Error of the multi-echo fitting.

**How to interpret**:

| RMSE Level | Interpretation |
|------------|----------------|
| Low (dark) | Good model fit |
| High (bright) | Poor fit, unreliable estimates |

**What to look for**:

- **Low RMSE in gray matter**: Model fits well
- **High RMSE at edges**: Expected due to partial voluming
- **High RMSE in brain interior**: Potential issues with:
    - Motion
    - Physiological noise
    - Multi-echo timing errors

## Histograms

Histograms show the distribution of values across the brain.

### T2* Histogram

- **X-axis**: T2* values (ms)
- **Y-axis**: Number of voxels

**What to look for**:

- **Main peak at 30-50 ms**: Normal gray matter
- **Secondary peak**: May indicate white matter or different tissue
- **Long tail to high values**: CSF contribution
- **Spike at zero**: Masked voxels

### S0 Histogram

- Shows distribution of signal intensity
- Should show smooth distribution
- Outliers may indicate artifacts

## Time Series Plots

Diagnostic temporal plots help identify:

- **Global signal fluctuations**: Large-scale intensity changes
- **Motion effects**: Sudden shifts in signal
- **Scanner drift**: Slow intensity changes over time

## Using QC for Classification

QC information can inform your component classification:

| QC Finding | Classification Impact |
|------------|----------------------|
| High RMSE region | Components localized here may be unreliable |
| Signal dropout | Expect fewer reliable components in dropout areas |
| Motion artifacts in QC | Be more skeptical of edge-localized components |

## Troubleshooting

### Maps Not Showing

If brain maps don't appear:

1. Check that files exist in your tedana output:
    - `T2starmap.nii*`
    - `S0map.nii*`
    - `rmse_statmap.nii*`

2. These files are optional tedana outputs - not all tedana runs generate them

### Unexpected Values

| Issue | Possible Cause |
|-------|----------------|
| T2* values too high | Wrong TE values provided |
| T2* values too low | Field inhomogeneity |
| Noisy S0 map | Motion during acquisition |
| High RMSE everywhere | Fundamental data quality issue |

## Best Practices

1. **Review QC before classifying**: Understanding data quality helps calibrate expectations

2. **Note problem regions**: If QC shows issues in specific areas, be cautious about components localized there

3. **Compare across subjects**: Consistent QC issues may indicate systematic problems

4. **Document findings**: Note any QC concerns for your records

## QC Checklist

Before trusting your classifications:

- [ ] T2* map shows reasonable values in gray matter
- [ ] S0 map is smooth without major artifacts
- [ ] RMSE is low in brain interior
- [ ] No unexpected patterns in any maps
- [ ] Histograms show expected distributions
