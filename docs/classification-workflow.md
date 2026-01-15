# Classification Workflow

This guide describes a practical workflow for reviewing and classifying ICA components using Rica.

## Overview

The goal of manual component classification is to:

1. Verify tedana's automatic classifications
2. Correct any misclassified components
3. Export your decisions for use in tedana

## Before You Start

### Understand Your Data

Before classifying components:

- Review the **Info tab** to understand processing parameters
- Note the number of components and their distribution
- Check the **QC tab** for data quality issues

### Set Your Environment

- Use a large monitor (recommended: 1920x1080 or larger)
- Switch to dark or light theme based on your preference
- Consider using keyboard shortcuts for efficiency

## Recommended Workflow

### Step 1: Review the Big Picture

Start in the **ICA tab** and look at the scatter plot:

1. **Identify clusters**: Do accepted and rejected components form distinct groups?
2. **Check elbow lines**: Are tedana's thresholds reasonable?
3. **Note outliers**: Which components fall in ambiguous regions?

### Step 2: Quick Scan of Accepted Components

Review tedana's **accepted** components first:

```
For each accepted component:
  1. Check spatial map → Does it look like brain signal?
  2. Check time series → Is it smooth and plausible?
  3. Check FFT → Is energy in expected frequency bands?
  4. If suspicious → Consider rejecting
```

!!! tip "What to look for in accepted components"
    - Spatial maps localized to gray matter
    - Time series without sudden spikes
    - Frequency content in BOLD range (0.01-0.1 Hz)

### Step 3: Review Rejected Components

Check tedana's **rejected** components:

```
For each rejected component:
  1. Check if it looks like true signal
  2. If it looks like BOLD → Consider accepting
  3. Common false rejections:
     - Strong task activation
     - Unusual but real brain networks
```

!!! warning "Common noise patterns to confirm rejection"
    - Ring artifacts at brain edges
    - Ventricle-localized signal
    - Stripe patterns from motion
    - Spiky time series

### Step 4: Focus on Edge Cases

Components near the decision boundaries deserve extra attention:

1. **Low kappa, low rho**: Often unclear - use your judgment
2. **Near elbow thresholds**: Could go either way
3. **Unusual spatial patterns**: May be artifact or real signal

### Step 5: Save Your Classifications

When finished:

1. Click the **Save** button
2. File downloads as `manual_classification.tsv`
3. Move the file to your tedana output directory

## Using Classifications with Tedana

Apply your manual classifications in tedana:

```bash
tedana -d your_data.nii.gz \
       -e 14.5 29 43.5 \
       --manual-classification manual_classification.tsv
```

Tedana will use your classifications instead of running automatic classification.

## Classification Criteria

### Accept if:

| Criterion | Description |
|-----------|-------------|
| Spatial pattern | Localized to gray matter, follows known networks |
| Time series | Smooth, no spikes, physiologically plausible |
| Frequency | Energy primarily in BOLD range |
| Kappa/Rho | High kappa relative to rho |

### Reject if:

| Criterion | Description |
|-----------|-------------|
| Spatial pattern | Edges, ventricles, outside brain, stripes |
| Time series | Spiky, sudden jumps, drift |
| Frequency | High frequency noise, respiratory/cardiac peaks |
| Kappa/Rho | Low kappa and/or high rho |

### Edge Cases

Some situations require judgment:

| Situation | Consideration |
|-----------|---------------|
| Motion-correlated but brain-like | May contain both signal and noise |
| Strong task activation | High kappa but could look unusual |
| Large draining veins | Real signal but may want to remove |
| Global signal | Controversial - depends on your analysis |

## Tips for Efficiency

### Use Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` | Next component |
| `←` | Previous component |
| `A` | Accept |
| `R` | Reject |

### Batch Similar Components

If you notice a pattern (e.g., all edge artifacts):

1. Sort the table by a relevant metric
2. Review similar components together
3. Apply consistent criteria

### Take Breaks

- Component classification requires sustained attention
- Take breaks every 20-30 components
- Fresh eyes catch mistakes

## Quality Control Checklist

Before finalizing your classifications:

- [ ] Reviewed all tedana-accepted components
- [ ] Spot-checked rejected components
- [ ] Examined edge cases carefully
- [ ] Pie chart shows reasonable variance distribution
- [ ] Saved classifications to file

## Documenting Your Decisions

For reproducibility, consider documenting:

- How many components you changed
- Criteria you used for edge cases
- Any unusual patterns in your data

This helps when:

- Returning to the analysis later
- Explaining decisions to collaborators
- Writing methods sections
