# Rica

[![DOI](https://zenodo.org/badge/391155862.svg)](https://zenodo.org/badge/latestdoi/391155862)
[![Documentation](https://img.shields.io/badge/docs-online-blue)](https://me-ica.github.io/rica/)

**Rica** (Reports for ICA) is an interactive visualization tool for reviewing and classifying ICA components from [tedana](https://github.com/ME-ICA/tedana) multi-echo fMRI analysis.

**[View Documentation](https://me-ica.github.io/rica/)** | **[Launch Rica Online](https://rica-fmri.netlify.app)**

**Pronunciation:** [ˈrika]. [Hear it here](https://easypronunciation.com/en/spanish/word/rica).

## Features

### ICA Component Analysis
- **Interactive scatter plots** - Kappa vs Rho, Kappa/Rho Rank plots with elbow threshold lines, zoom/pan
- **Pie chart** - Component variance distribution, click to select
- **3D brain viewer** - Interactive stat-z maps using Niivue with mosaic view (7 slices per orientation)
- **Time series & FFT** - Component time courses and power spectra
- **Component table** - Full metrics with sorting and selection sync
- **External regressor heatmap** - Interactive correlation visualization (requires tedana 24.1+)

### Quality Control (QC) Tab
- **Brain maps** - T2\*, S0, and RMSE maps with Niivue mosaic viewer
- **Histograms** - Distribution plots for QC metrics
- **Carpet plots** - Time series visualization in dedicated Carpets tab

### User Experience
- **Classification toggle** - Accept/reject components with A/R keyboard shortcuts
- **Arrow navigation** - Previous/next component with wrap-around
- **Light/dark theme** - Toggle with the sun/moon button
- **Export** - Save modified classifications as TSV

## How to Use

For comprehensive guides, see the **[Documentation](https://me-ica.github.io/rica/)**.

For a video tutorial, see [this walkthrough](https://www.loom.com/share/ad37cf6f3c2d41e48721f62168a8284e).

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `A` | Accept component |
| `R` | Reject component |
| `←` | Previous component |
| `→` | Next component |

## Using Rica

### Option 1: Online (Easiest)

Visit **https://rica-fmri.netlify.app** and select your tedana output folder.

### Option 2: Local Server (Recommended for Local Use)

Run Rica directly from your tedana output folder with automatic data loading:

1. Download the latest release files:
   - `index.html` (self-contained single-file app with embedded logo)
   - `rica_server.py`

2. Copy these files to your tedana output folder:
   ```bash
   cp index.html rica_server.py /path/to/tedana/output/
   ```

3. Run the server:
   ```bash
   cd /path/to/tedana/output/
   python rica_server.py
   ```

4. Your browser opens automatically and data loads instantly!

> **Note:** The "New" button is hidden in local server mode since data is loaded automatically.

### Option 3: Development Server

For development or if you want to load different folders:

```bash
# Clone and install
git clone https://github.com/ME-ICA/rica.git
cd rica
npm install

# Start development server
npm start
```

Then open http://localhost:3000 and select your tedana output folder.

### Option 4: Build from Source

Build a single-file HTML distribution:

```bash
# Install dependencies
npm install

# Build with inlined assets
npm run build
npx gulp

# Output files in build/
# - index.html (self-contained single-file app)
# - rica_server.py (local server)
```

## Required Files

Rica expects these files from tedana output:

| File Pattern | Description |
|--------------|-------------|
| `*_metrics.tsv` | Component metrics table (required) |
| `*_mixing.tsv` | ICA mixing matrix (time series) |
| `*stat-z_components.nii.gz` | 4D component stat maps |
| `*_desc-ICACrossComponent_metrics.json` | Elbow thresholds for reference lines |
| `figures/comp_*.png` | Component figures |
| `*.svg` | Carpet plots and diagnostic figures |
| `report.txt` | Tedana report |
| `T2starmap.nii*`, `S0map.nii*`, `rmse_statmap.nii*` | QC brain maps |

## Versioning

Rica version is displayed in the About popup and managed centrally:
- Version is defined in `package.json`
- UI automatically displays the current version
- GitHub releases should be tagged as `v<version>` (e.g., `v2.0.0`)

To bump the version:
```bash
npm version patch  # 2.0.0 -> 2.0.1
npm version minor  # 2.0.0 -> 2.1.0
npm version major  # 2.0.0 -> 3.0.0
```

## Contributing

Questions, suggestions, or contributions? Open an issue on [GitHub](https://github.com/ME-ICA/rica/issues)!
