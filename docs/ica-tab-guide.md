# ICA Tab Guide

The ICA tab is the primary workspace for reviewing and classifying components. This guide explains each visualization panel and how to use them effectively.

## Overview

The ICA tab presents multiple synchronized views of your ICA components. Selecting a component in any view highlights it across all visualizations.

## Scatter Plots

### Kappa vs Rho Plot

The main scatter plot shows components plotted by their two key metrics:

- **X-axis (Kappa)**: TE-dependent signal weight - higher values indicate more BOLD-like signal
- **Y-axis (Rho)**: TE-independent signal weight - higher values indicate more noise-like signal

**Interpreting the plot:**

| Position | Interpretation |
|----------|----------------|
| High Kappa, Low Rho | Likely BOLD signal (accept) |
| Low Kappa, High Rho | Likely noise (reject) |
| Low Kappa, Low Rho | Unclear - needs manual review |
| High Kappa, High Rho | Mixed signal - needs manual review |

**Features:**

- **Zoom**: Scroll to zoom in/out
- **Pan**: Click and drag to pan
- **Select**: Click a point to select that component
- **Elbow lines**: Dashed lines show tedana's automatic thresholds (if available)

### Rank Plots

Two additional plots show:

- **Kappa Rank**: Components ordered by kappa value
- **Rho Rank**: Components ordered by rho value

Connecting lines between plots help visualize how a component's kappa and rho ranks compare.

## Pie Chart

Shows the proportion of total variance explained by each classification category:

- **Accepted** (green): Components kept in the denoised data
- **Rejected** (red): Components removed as noise
- **Ignored** (gray): Components set aside (if applicable)

The pie chart updates in real-time as you reclassify components.

## Brain Viewer

The interactive brain viewer displays the spatial map of the selected component.

**Display:**

- Mosaic view with 7 slices per orientation (axial, coronal, sagittal)
- Statistical z-map overlaid on anatomical template
- Color scale indicates component weight at each voxel

**Controls:**

- Toggle between **Interactive** (Niivue) and **Static** (PNG) views
- Interactive view allows slice navigation
- Static view shows tedana-generated figures (if available)

!!! tip "Performance"
    If Rica feels slow, switch to static PNG view. Interactive Niivue rendering can be demanding on some systems.

## Time Series

Displays the component's time course from the mixing matrix.

**What to look for:**

| Pattern | Interpretation |
|---------|----------------|
| Smooth, oscillating | Could be BOLD or physiological |
| Spiky, irregular | Likely motion artifact |
| Slow drift | Scanner drift or physiological |
| Step changes | Motion or acquisition issues |

The x-axis shows time (in TRs), and the y-axis shows the mixing weight.

## FFT Spectrum

Shows the frequency content of the component time series.

**What to look for:**

| Frequency | Typical Source |
|-----------|----------------|
| < 0.01 Hz | Scanner drift, very slow physiology |
| 0.01-0.1 Hz | BOLD signal range |
| 0.15-0.4 Hz | Respiratory (~0.3 Hz) |
| 0.8-1.2 Hz | Cardiac (~1 Hz) |
| High frequency spikes | Motion artifacts |

!!! note
    Exact frequencies depend on your TR. The above assumes a typical TR of ~2 seconds.

## Component Table

A sortable table showing all component metrics.

**Columns include:**

- Component number
- Classification (accepted/rejected/ignored)
- Kappa and Rho values
- Variance explained
- Additional tedana metrics

**Features:**

- Click column headers to sort
- Click a row to select that component
- Toggle table visibility with the collapse button
- Option to keep original order or regroup by classification

## Classification Controls

### Toggle Switch

Three-state toggle for each component:

| State | Color | Meaning |
|-------|-------|---------|
| Accepted | Green | Keep in denoised output |
| Rejected | Red | Remove as noise |
| Ignored | Gray | Set aside (rare) |

### Keyboard Shortcuts

For efficient classification:

- `A` - Accept current component
- `R` - Reject current component
- `←` - Go to previous component
- `→` - Go to next component

## External Regressor Heatmap

If your tedana output includes external regressor correlations (tedana 24.1+), a heatmap shows how each component correlates with:

- Motion parameters
- Physiological regressors
- Custom regressors you provided

High correlations with motion suggest the component captures motion artifacts.

## Save Your Work

The **Save** button exports your classifications to a TSV file:

- File name: `manual_classification.tsv`
- Compatible with tedana's `--manual-classification` option
- Contains original and manual classification columns

!!! warning "Save Often"
    Rica runs entirely in your browser. If you close the tab without saving, your classifications are lost!

## Best Practices

1. **Start with accepted components**: Review tedana's accepted components first to understand what "good" looks like in your data

2. **Use multiple views**: Don't rely on a single visualization - check time series, FFT, and spatial maps together

3. **Look for patterns**: Physiological noise often has characteristic spatial patterns (edge effects, ventricles)

4. **Trust but verify**: Tedana's automatic classification is good, but not perfect - that's why you're reviewing!

5. **Document decisions**: Consider keeping notes on why you accepted/rejected edge cases
