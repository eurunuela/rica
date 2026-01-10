/**
 * Centralized version management
 *
 * The version is pulled from package.json at build time.
 * This ensures consistency across:
 * - npm package version
 * - UI display
 * - GitHub release tags
 *
 * To update the version:
 * 1. Run `npm version patch|minor|major` to bump the version
 * 2. The UI will automatically reflect the new version
 * 3. Tag the release with `git tag v<version>` and push tags
 */

// Import version from package.json
import pkg from "../../package.json";

export const VERSION = pkg.version;
export const VERSION_DISPLAY = `v${pkg.version}`;
