/**
 * Convert a Windows-native absolute path into the POSIX form understood by
 * Git Bash. Arguments are still passed directly to spawnSync, so path content
 * is never evaluated as shell source.
 */
export function toGitBashPath(nativePath, platform = process.platform) {
  if (platform !== "win32") return nativePath;
  if (typeof nativePath !== "string" || nativePath.length === 0 || nativePath.includes("\0")) {
    throw new Error("Git Bash requires a non-empty path without NUL bytes");
  }

  let normalized = nativePath.replaceAll("\\", "/");

  if (/^\/\/\?\/UNC\//iu.test(normalized)) {
    normalized = `//${normalized.slice(8)}`;
  } else if (/^\/\/\?\/[A-Za-z]:\//u.test(normalized)) {
    normalized = normalized.slice(4);
  } else if (/^\/\/[?.]\//u.test(normalized)) {
    throw new Error(`unsupported Windows device path: ${nativePath}`);
  }

  const drive = normalized.match(/^([A-Za-z]):\/([\s\S]*)$/u);
  if (drive) return `/${drive[1].toLowerCase()}/${drive[2]}`;

  if (/^\/\/[^/]+\/[^/]+(?:\/|$)/u.test(normalized)) return normalized;

  throw new Error(`expected an absolute Windows drive or UNC path: ${nativePath}`);
}
