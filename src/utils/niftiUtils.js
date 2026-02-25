/**
 * Extract the repetition time (TR) from a NIfTI file buffer.
 * Reads pixdim[4] from the NIfTI-1 or NIfTI-2 header, matching
 * tedana's: io_generator.reference_img.header.get_zooms()[-1]
 *
 * @param {ArrayBuffer} buffer - Raw (possibly gzipped) NIfTI file buffer
 * @returns {Promise<number|null>} - TR in seconds, or null if not found
 */
export async function extractTRFromNifti(buffer) {
  let headerBytes;

  // Check if gzipped (magic bytes 0x1f 0x8b)
  const magic = new Uint8Array(buffer, 0, 2);
  if (magic[0] === 0x1f && magic[1] === 0x8b) {
    headerBytes = await decompressHeader(buffer);
  } else {
    headerBytes = buffer;
  }

  if (!headerBytes || headerBytes.byteLength < 348) {
    return null;
  }

  const view = new DataView(headerBytes);

  // Try little-endian first, then big-endian
  for (const littleEndian of [true, false]) {
    const sizeof_hdr = view.getInt32(0, littleEndian);

    if (sizeof_hdr === 348) {
      // NIfTI-1: pixdim[4] is at offset 76 + 4*4 = 92, float32
      const tr = view.getFloat32(92, littleEndian);
      if (Number.isFinite(tr) && tr > 0) return tr;
    } else if (sizeof_hdr === 540 && headerBytes.byteLength >= 540) {
      // NIfTI-2: pixdim[4] is at offset 104 + 4*8 = 136, float64
      const tr = view.getFloat64(136, littleEndian);
      if (Number.isFinite(tr) && tr > 0) return tr;
    }
  }

  return null;
}

/**
 * Decompress enough of a gzipped buffer to read the NIfTI header.
 * Uses the browser's built-in DecompressionStream API.
 */
async function decompressHeader(gzBuffer) {
  try {
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    await writer.write(new Uint8Array(gzBuffer));
    await writer.close();

    // Read enough bytes for the largest NIfTI header (540 bytes for NIfTI-2)
    const chunks = [];
    let totalBytes = 0;
    while (totalBytes < 540) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.byteLength;
    }
    reader.cancel().catch(() => {});

    const result = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result.buffer;
  } catch {
    return null;
  }
}
