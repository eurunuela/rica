# Updating Rica Without Rerunning Tedana

When tedana runs, it generates an `open_rica_report.py` script in the output directory. This script automatically downloads the latest Rica from GitHub every time it runs, so **you usually don't need to do anything special** — just run the script and it will self-update.

This page explains how the update mechanism works and what to do in less common situations (offline use, pinning a specific version, or using a local build).

## How `open_rica_report.py` Works

Each time you run `open_rica_report.py`, it:

1. Queries the GitHub API for the latest Rica release
2. Compares it against the version cached at `~/Library/Caches/tedana/rica/` (macOS) or the platform equivalent
3. Downloads `index.html` and `rica_server.py` if a newer version is available
4. Copies the files into a `rica/` subdirectory of your tedana output folder
5. Starts a local HTTP server and opens Rica at `http://localhost:8000/rica/index.html`

So to get the latest Rica, simply run:

```bash
python open_rica_report.py
```

## Forcing a Re-download

If you suspect the cache is stale or want to guarantee a fresh download:

```bash
python open_rica_report.py --force-download
```

This bypasses the version comparison and always downloads the latest release.

## Offline / Air-Gapped Use

When there is no network access, the script falls back to the last cached version automatically. You will see a warning like:

```
[Rica] Warning: Could not check for updates (...)
[Rica] Using cached version v2.1.5
```

No action is needed — Rica continues to work with the cached files.

If you need to set up Rica on a machine that has never had network access, pre-populate the cache directory manually:

| Platform | Cache Path |
|----------|-----------|
| macOS | `~/Library/Caches/tedana/rica/` |
| Linux | `~/.cache/tedana/rica/` |
| Windows | `%LOCALAPPDATA%\tedana\rica\` |

Place `index.html`, `rica_server.py`, and a `VERSION` file (containing the version tag, e.g. `v2.1.5`) in that directory. Download these from the [Rica releases page](https://github.com/ME-ICA/rica/releases/latest).

## Using a Local or Custom Build

Set the `TEDANA_RICA_PATH` environment variable to a directory containing `index.html` and `rica_server.py`. The script will use those files directly and skip the GitHub download entirely.

```bash
export TEDANA_RICA_PATH=/path/to/your/rica/build
python open_rica_report.py
```

This is useful for:

- Testing a development build of Rica against real tedana data
- Pinning a specific version without auto-updates
- Air-gapped environments where you manage files manually

To build Rica from source:

```bash
git clone https://github.com/ME-ICA/rica.git
cd rica
npm install
npm run build
npx gulp
# Built files are in build/
export TEDANA_RICA_PATH=/path/to/rica/build
```

## Checking the Current Version

The Rica version is shown in the **About** popup (the `(i)` button in the top-right corner). The version of the files installed in your output directory is also stored in `rica/VERSION`:

```bash
cat /path/to/tedana/output/rica/VERSION
```

Compare this to the [latest release](https://github.com/ME-ICA/rica/releases/latest) to see if an update is available.

## Troubleshooting

### Port Already in Use

If port 8000 is occupied, the script automatically tries the next available port. You can also specify one explicitly:

```bash
python open_rica_report.py --port 9000
```

### Browser Does Not Open Automatically

Navigate manually to the URL printed in the terminal, or suppress auto-open and open it yourself:

```bash
python open_rica_report.py --no-open
# Then open http://localhost:8000/rica/index.html
```

### Script Can't Find tedana Output Files

Make sure `open_rica_report.py` is in the tedana output directory (where the `*_metrics.tsv` files are). The script uses its own location to find data.

See [Troubleshooting](troubleshooting.md) for more help.
