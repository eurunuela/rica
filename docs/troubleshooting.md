# Troubleshooting

This guide covers common issues and their solutions when using Rica.

## Loading Issues

### "No valid files found"

**Cause**: Rica couldn't find the required tedana output files.

**Solution**:

1. Verify your folder contains at minimum:
    - `*_metrics.tsv`
    - `*_mixing.tsv`
    - `*stat-z_components.nii.gz`

2. Check file naming follows tedana conventions

3. Ensure you selected the correct folder (the tedana output directory, not a parent)

### Files Load But Visualizations Are Empty

**Cause**: Files may be corrupted or in unexpected format.

**Solution**:

1. Try opening the TSV files in a text editor - are they valid?
2. Check the NIfTI file with another viewer (FSLeyes, etc.)
3. Verify tedana completed successfully

### Browser Folder Selection Doesn't Work

**Cause**: Some browsers restrict folder access.

**Solution**:

1. Use Chrome or Edge (best support for folder selection)
2. Try the [local server option](getting-started.md#option-2-local-server) instead
3. Ensure you're not blocking browser permissions

## Performance Issues

### Rica Is Slow or Laggy

**Cause**: Interactive brain viewer can be demanding.

**Solutions**:

1. **Switch to static view**: Toggle from interactive Niivue to PNG view
2. **Close other tabs**: Free up browser memory
3. **Use local server**: Avoids re-uploading large files
4. **Try a different browser**: Chrome often performs best

### Brain Viewer Not Rendering

**Cause**: WebGL compatibility issues.

**Solutions**:

1. Update your browser to the latest version
2. Update graphics drivers
3. Try a different browser
4. Disable browser extensions that might interfere

## Data Issues

### Components Look Wrong

**Possible causes**:

| Symptom | Likely Cause |
|---------|--------------|
| All components rejected | Tedana threshold too aggressive |
| Spatial maps look noisy | Data quality issue |
| Time series all flat | Wrong mixing file |
| Metrics all zero | Parsing error |

**Solution**: Verify your tedana run completed without errors.

### Manual Classification Not Loading

**Cause**: File format doesn't match expected format.

**Solution**:

1. Ensure file is named `manual_classification.tsv`
2. Check file has correct columns (component, classification)
3. Verify tab-separated format (not comma-separated)

### External Regressor Heatmap Missing

**Cause**: Feature requires tedana 24.1 or later.

**Solution**:

1. Update tedana: `pip install --upgrade tedana`
2. Re-run tedana on your data
3. Check for `*confound_correlations*.svg` in output

## Display Issues

### Theme Not Switching

**Cause**: Browser localStorage issue.

**Solution**:

1. Clear browser cache for Rica
2. Try incognito/private mode
3. Refresh the page

### Layout Looks Broken

**Cause**: Screen too small or zoom level wrong.

**Solutions**:

1. Use a screen at least 1024px wide
2. Reset browser zoom to 100% (Ctrl/Cmd + 0)
3. Refresh the page

### Text Overlapping or Cut Off

**Cause**: Browser font rendering differences.

**Solution**:

1. Try a different browser
2. Adjust browser zoom level
3. Report the issue on GitHub

## Export Issues

### Save Button Not Working

**Cause**: Browser download permissions.

**Solutions**:

1. Check browser isn't blocking downloads
2. Try right-click → Save As
3. Check your downloads folder

### Saved File Has Wrong Format

**Expected format**:

```
Component	classification
0	accepted
1	rejected
2	accepted
...
```

If format differs, please report on GitHub.

## Local Server Issues

### Server Won't Start

**Error**: "Address already in use"

**Solution**: Port 8000 is occupied. Use a different port:

```bash
python rica_server.py --port 9000
```

**Error**: "Python not found"

**Solution**: Install Python 3 or use `python3` instead:

```bash
python3 rica_server.py
```

### Browser Doesn't Open Automatically

**Solution**: Manually navigate to `http://localhost:8000` or use:

```bash
python rica_server.py --no-open
# Then open browser manually
```

### CORS Errors in Console

**Cause**: Accessing files from wrong location.

**Solution**: Ensure you started the server from the tedana output directory.

## Getting Help

If your issue isn't covered here:

1. **Check GitHub Issues**: [github.com/ME-ICA/rica/issues](https://github.com/ME-ICA/rica/issues)
2. **Search existing issues**: Your problem may already have a solution
3. **Open a new issue**: Include:
    - Browser and version
    - Operating system
    - Steps to reproduce
    - Error messages (check browser console: F12)
    - Screenshots if relevant

## Reporting Bugs

When reporting bugs, please include:

```
## Environment
- Rica version: [from About popup]
- Browser: [e.g., Chrome 120]
- OS: [e.g., macOS 14.1]

## Steps to reproduce
1. [First step]
2. [Second step]
3. [etc.]

## Expected behavior
[What should happen]

## Actual behavior
[What actually happens]

## Console errors
[Open browser console with F12, copy any red errors]
```
