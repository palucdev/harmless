/**
 * Environment configuration for fs tools.
 */

import path from 'node:path';

/**
 * A mount point mapping a virtual name to a real filesystem path.
 */
export interface Mount {
  /** Virtual name (used in paths like "vault/notes.md") */
  readonly name: string;
  /** Absolute path to the directory */
  readonly absolutePath: string;
}

export interface FsConfig {
  readonly MOUNTS: Mount[];
}

/**
 * Parse FS_ROOTS environment variable into mount points.
 * Format: comma-separated paths, e.g. "/path/to/vault,/path/to/projects"
 * Each path becomes a mount with the folder name as the virtual name.
 * Falls back to FS_ROOT for backward compatibility.
 */
function parseMounts(): Mount[] {
  const rootsEnv = process.env['FS_ROOTS'] ?? process.env['FS_ROOT'] ?? '.';
  const paths = rootsEnv
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const mounts: Mount[] = [];
  const usedNames = new Set<string>();

  for (const rawPath of paths) {
    const absolutePath = path.isAbsolute(rawPath) ? path.resolve(rawPath) : path.resolve(process.cwd(), rawPath);

    let name = path.basename(absolutePath);

    if (!name || name === '/') {
      name = 'root';
    }

    // Ensure unique names by adding suffix if needed
    let uniqueName = name;
    let counter = 2;
    while (usedNames.has(uniqueName)) {
      uniqueName = `${name}_${counter}`;
      counter++;
    }
    usedNames.add(uniqueName);

    mounts.push({ name: uniqueName, absolutePath });
  }

  return mounts;
}

/** Global configuration instance */
export const config: FsConfig = {
  MOUNTS: parseMounts(),
};
