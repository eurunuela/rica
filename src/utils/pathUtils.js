/**
 * Extract the folder name (last segment) from a file path.
 * Works with both Unix (/) and Windows (\) path separators.
 *
 * @param {string} path - The full file path
 * @returns {string} The folder name, or the original path if extraction fails
 */
export function getFolderName(path) {
  if (!path) return path;
  return path.split(/[/\\]/).filter(Boolean).pop() || path;
}
