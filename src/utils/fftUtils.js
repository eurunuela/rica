/**
 * Compute one-sided power spectrum from time series data.
 * Matches tedana's get_spectrum() exactly:
 *   power_spectrum = np.abs(np.fft.rfft(data)) ** 2
 *   freqs = np.fft.rfftfreq(power_spectrum.size * 2 - 1, tr)
 *
 * Uses a direct DFT (no zero-padding) to match numpy's rfft output
 * for arbitrary-length signals. For typical fMRI time series (100-1000 TRs)
 * this runs in under 50ms.
 *
 * @param {number[]} timeSeries - Array of time series values
 * @param {number} tr - Repetition time in seconds (default: 1, meaning frequencies in cycles/TR)
 * @returns {{ frequencies: number[], power: number[] }} - Frequency bins and power values
 */
export function computePowerSpectrum(timeSeries, tr = 1) {
  if (!timeSeries || timeSeries.length === 0) {
    return { frequencies: [], power: [] };
  }

  const N = timeSeries.length;
  // Number of one-sided bins: floor(N/2) + 1 (matches numpy rfft output size)
  const numBins = Math.floor(N / 2) + 1;
  const frequencies = [];
  const power = [];

  // Direct DFT for positive frequencies only (equivalent to numpy.fft.rfft)
  for (let k = 0; k < numBins; k++) {
    let re = 0;
    let im = 0;
    const angle = (-2 * Math.PI * k) / N;
    for (let n = 0; n < N; n++) {
      re += timeSeries[n] * Math.cos(angle * n);
      im += timeSeries[n] * Math.sin(angle * n);
    }

    // |FFT(data)|^2 (matches np.abs(np.fft.rfft(data)) ** 2)
    power.push(re * re + im * im);

    // Frequency bins matching tedana's: np.fft.rfftfreq(ps.size * 2 - 1, tr)
    // For even N this uses N+1, for odd N this uses N (replicates tedana exactly)
    frequencies.push(k / ((numBins * 2 - 1) * tr));
  }

  return { frequencies, power };
}

/**
 * Convert power spectrum to decibels (dB)
 *
 * @param {number[]} power - Array of power values
 * @param {number} reference - Reference value for dB calculation (default: max power)
 * @returns {number[]} - Power in decibels
 */
export function powerToDecibels(power, reference = null) {
  if (!power || power.length === 0) return [];

  const ref = reference || Math.max(...power);
  if (ref === 0) return power.map(() => 0);

  return power.map((p) => {
    if (p <= 0) return -100; // Floor for log(0)
    return 10 * Math.log10(p / ref);
  });
}
