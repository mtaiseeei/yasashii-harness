/**
 * POSIX mode bits are useful as a second permission signal, including when the
 * current process has elevated access. Windows does not model directory search
 * permission as POSIX execute bits, so Node may report no 0o111 bit for a
 * writable directory. Keep read/write mode checks and fs.accessSync unchanged.
 */
export function permissionBitsAllow(stat, mask, platform = process.platform) {
  const effectiveMask = platform === "win32" ? mask & ~0o111 : mask;
  return effectiveMask === 0 || (stat.mode & effectiveMask) !== 0;
}
