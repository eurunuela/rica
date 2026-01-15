# Getting Started

This guide will help you get Rica up and running with your tedana output data.

## Installation Options

Rica offers four ways to use the application, from simplest to most flexible:

### Option 1: Online (Recommended)

The easiest way to use Rica - no installation required.

1. Visit [rica-fmri.netlify.app](https://rica-fmri.netlify.app)
2. Click **Select Folder**
3. Navigate to your tedana output directory
4. Click **Upload** to load your data

!!! tip "Best for most users"
    The online version is always up-to-date and requires no setup.

### Option 2: Local Server

Run Rica locally with automatic data loading - ideal for working with large datasets or slow connections.

1. Download from the [latest release](https://github.com/ME-ICA/rica/releases):
    - `index.html`
    - `rica_server.py`

2. Copy both files to your tedana output directory:
    ```bash
    cp index.html rica_server.py /path/to/tedana/output/
    ```

3. Start the server:
    ```bash
    cd /path/to/tedana/output/
    python rica_server.py
    ```

4. Rica opens automatically in your browser at `http://localhost:8000`

!!! info "Server Options"
    - `--port 9000` - Use a different port
    - `--no-open` - Don't open browser automatically

### Option 3: Development Mode

For contributors or those who want the latest features.

```bash
git clone https://github.com/ME-ICA/rica.git
cd rica
npm install
npm start
```

Opens at `http://localhost:3000`. You'll need to manually select a folder.

### Option 4: Build from Source

Create a standalone HTML file for offline use.

```bash
git clone https://github.com/ME-ICA/rica.git
cd rica
npm install
npm run build
npx gulp
```

The built files are in the `build/` directory.

## Required Files

Rica reads tedana output files directly from your filesystem. Here's what Rica looks for:

### Essential Files

| File | Description | Required |
|------|-------------|:--------:|
| `*_metrics.tsv` | Component metrics (kappa, rho, variance, etc.) | Yes |
| `*_mixing.tsv` | ICA mixing matrix (component time series) | Yes |
| `*stat-z_components.nii.gz` | 4D component statistical maps | Yes |
| `report.txt` | Tedana processing report | Recommended |

### Optional Enhancement Files

These files unlock additional features:

| File | Feature Enabled |
|------|-----------------|
| `*_desc-ICACrossComponent_metrics.json` | Elbow threshold lines on scatter plots |
| `figures/comp_*.png` | Static component figures (fallback for brain viewer) |
| `*.svg` | Carpet plots in Carpets tab |
| `decision_tree.json` + `status_table.tsv` | Decision Tree tab |
| `*confound_correlations*.svg` | External regressor heatmap (tedana 24.1+) |

### Quality Control Files

| File | Description |
|------|-------------|
| `T2starmap.nii*` | T2* brain map |
| `S0map.nii*` | S0 brain map |
| `rmse_statmap.nii*` | RMSE statistical map |

### Manual Classification

| File | Description |
|------|-------------|
| `manual_classification.tsv` | Previously saved classifications (auto-loaded) |

!!! warning "Manual Classification Warning"
    If Rica detects a `manual_classification.tsv` file, it will show a warning popup. This ensures you're aware that manual classifications have been applied to the data.

## First Steps

Once Rica loads your data:

1. **Info Tab**: Review the tedana processing report
2. **ICA Tab**: Start reviewing components
3. **Use keyboard shortcuts**: `A` (accept), `R` (reject), `←`/`→` (navigate)
4. **Save your work**: Click the save button to export classifications

Continue to the [Interface Overview](interface-overview.md) to learn about each tab in detail.
