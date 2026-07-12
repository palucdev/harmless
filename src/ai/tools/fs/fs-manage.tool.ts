/**
 * fs_manage Tool
 *
 * Structural filesystem operations (delete, rename, move, copy, mkdir, stat).
 */

import fs from 'node:fs/promises';
import { z } from 'zod';
import { getMounts, resolvePath as resolveVirtualPath, validatePathChain } from './lib/index.js';

// ─────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────

export const fsManageInputSchema = z
  .object({
    operation: z
      .enum(['delete', 'rename', 'move', 'copy', 'mkdir', 'stat'])
      .describe('Operation: delete (remove file/dir), rename (same mount only), move (can cross mounts), ' + 'copy (duplicate), mkdir (create directory), stat (get size/dates).'),

    path: z.string().min(1).describe('Source file or directory path. Example: "vault/notes/old.md".'),

    target: z.string().optional().describe('Destination path for rename/move/copy. Example: "vault/archive/old.md".'),

    recursive: z
      .boolean()
      .optional()
      .default(false)
      .describe('For mkdir: create parent directories. For copy/move: include subdirectories. ' + 'NOT supported for delete (safety). Default false.'),

    force: z.boolean().optional().default(false).describe('Overwrite if target exists. Default false.'),
  })
  .passthrough()
  .refine(
    (data) => {
      if (['rename', 'move', 'copy'].includes(data.operation)) {
        return Boolean(data.target);
      }
      return true;
    },
    { message: 'target is required for rename/move/copy operations', path: ['target'] }
  );

export type FsManageInput = z.infer<typeof fsManageInputSchema>;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface FsManageResult {
  success: boolean;
  operation: string;
  path: string;
  target?: string;
  stat?: {
    size: number;
    modified: string;
    created: string;
    isDirectory: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
  hint: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function pathExists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureTargetAvailable(absTarget: string, force: boolean): Promise<{ ok: true } | { ok: false; error: FsManageResult }> {
  if (!(await pathExists(absTarget))) {
    return { ok: true };
  }

  if (!force) {
    return {
      ok: false,
      error: {
        success: false,
        operation: 'validate',
        path: absTarget,
        error: { code: 'ALREADY_EXISTS', message: 'Target already exists' },
        hint: 'Target already exists. Use force=true to overwrite.',
      },
    };
  }

  await fs.rm(absTarget, { recursive: true, force: true });
  return { ok: true };
}

async function deletePath(absPath: string, recursive: boolean): Promise<void> {
  await fs.rm(absPath, { recursive, force: false });
}

async function copyPath(absSource: string, absTarget: string, options: { recursive: boolean; force: boolean }): Promise<void> {
  await fs.cp(absSource, absTarget, { recursive: options.recursive, force: options.force });
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────

export const fsManageTool = {
  name: 'fs_manage',
  description: `Perform structural filesystem operations on files and directories.

SANDBOXED FILESYSTEM — Only mounted directories are accessible.
Use fs_read(".") to see available mounts.

OPERATIONS:
- delete: Remove single file or empty directory (no recursive delete for safety)
- rename: Rename within same mount
- move: Move to different location (can cross mounts)
- copy: Duplicate file or directory
- mkdir: Create directory (use recursive=true for nested paths)
- stat: Get file/directory metadata (size, modified, created)

EXAMPLES:
- Delete file: { operation: "delete", path: "vault/old.md" }
- Delete empty folder: { operation: "delete", path: "vault/empty-folder/" }
- Rename: { operation: "rename", path: "vault/old.md", target: "vault/new.md" }
- Move: { operation: "move", path: "vault/file.md", target: "archive/file.md" }
- Copy: { operation: "copy", path: "vault/template.md", target: "vault/new.md" }
- Create dir: { operation: "mkdir", path: "vault/new-folder", recursive: true }
- Get stats: { operation: "stat", path: "vault/file.md" }

DELETE IS PERMANENT — only single files or empty directories can be deleted (no recursive delete).`,

  inputSchema: fsManageInputSchema,

  handler: async (args: unknown): Promise<unknown> => {
    const parsed = fsManageInputSchema.safeParse(args);
    if (!parsed.success) {
      const result: FsManageResult = {
        success: false,
        operation: (args as { operation?: string })?.operation ?? '',
        path: (args as { path?: string })?.path ?? '',
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        hint: 'Check the input parameters and try again.',
      };
      return result;
    }

    const input = parsed.data;

    const resolved = resolveVirtualPath(input.path);
    if (!resolved.ok) {
      const mounts = getMounts();
      const mountExample = mounts[0]?.name ?? 'vault';

      const result: FsManageResult = {
        success: false,
        operation: input.operation,
        path: input.path,
        error: { code: 'OUT_OF_SCOPE', message: resolved.error },
        hint: `Path must be within a mount. Example: "${mountExample}/". Use fs_read(".") to see available mounts.`,
      };
      return result;
    }

    const source = resolved.resolved;

    // Security: Validate symlinks don't escape mount
    const symlinkCheck = await validatePathChain(source.absolutePath, source.mount);
    if (!symlinkCheck.ok) {
      const result: FsManageResult = {
        success: false,
        operation: input.operation,
        path: source.virtualPath,
        error: { code: 'SYMLINK_ESCAPE', message: symlinkCheck.error },
        hint: 'Symlinks pointing outside the mounted directory are not allowed for security.',
      };
      return result;
    }

    let targetResolved: { ok: true; resolved: typeof source } | { ok: false; error: string } | undefined;
    if (input.target) {
      targetResolved = resolveVirtualPath(input.target);
      if (!targetResolved.ok) {
        const result: FsManageResult = {
          success: false,
          operation: input.operation,
          path: source.virtualPath,
          target: input.target,
          error: { code: 'OUT_OF_SCOPE', message: targetResolved.error },
          hint: 'Target must be within a mount. Use fs_read(".") to see available mounts.',
        };
        return result;
      }

      // Security: Validate target symlinks don't escape mount
      const targetSymlinkCheck = await validatePathChain(targetResolved.resolved.absolutePath, targetResolved.resolved.mount);
      if (!targetSymlinkCheck.ok) {
        const result: FsManageResult = {
          success: false,
          operation: input.operation,
          path: source.virtualPath,
          target: input.target,
          error: { code: 'SYMLINK_ESCAPE', message: targetSymlinkCheck.error },
          hint: 'Symlinks pointing outside the mounted directory are not allowed for security.',
        };
        return result;
      }
    }

    const absSource = source.absolutePath;
    const virtualSource = source.virtualPath;

    let stat: Awaited<ReturnType<typeof fs.stat>> | null;
    try {
      stat = await fs.stat(absSource);
    } catch {
      stat = null;
    }

    if (input.operation !== 'mkdir' && input.operation !== 'stat') {
      if (!stat) {
        const result: FsManageResult = {
          success: false,
          operation: input.operation,
          path: virtualSource,
          error: { code: 'NOT_FOUND', message: `Path does not exist: ${virtualSource}` },
          hint: 'Use fs_read on the parent directory to see what exists.',
        };
        return result;
      }
    }

    try {
      switch (input.operation) {
        case 'stat': {
          if (!stat) {
            const result: FsManageResult = {
              success: false,
              operation: input.operation,
              path: virtualSource,
              error: { code: 'NOT_FOUND', message: `Path does not exist: ${virtualSource}` },
              hint: 'Use fs_read to locate the path or check the spelling.',
            };
            return result;
          }

          const result: FsManageResult = {
            success: true,
            operation: input.operation,
            path: virtualSource,
            stat: {
              size: stat.size,
              modified: stat.mtime.toISOString(),
              created: stat.birthtime.toISOString(),
              isDirectory: stat.isDirectory(),
            },
            hint: 'Stat retrieved successfully.',
          };

          return result;
        }

        case 'mkdir': {
          const absTarget = absSource;
          if (await pathExists(absTarget)) {
            if (!input.recursive) {
              const result: FsManageResult = {
                success: false,
                operation: input.operation,
                path: virtualSource,
                error: { code: 'ALREADY_EXISTS', message: `Path already exists: ${virtualSource}` },
                hint: 'Directory already exists. Use recursive=true to ignore existing paths.',
              };
              return result;
            }

            const result: FsManageResult = {
              success: true,
              operation: input.operation,
              path: virtualSource,
              hint: 'Directory already exists; recursive=true treated as success.',
            };
            return result;
          }

          await fs.mkdir(absTarget, { recursive: input.recursive });
          const result: FsManageResult = {
            success: true,
            operation: input.operation,
            path: virtualSource,
            hint: 'Directory created successfully.',
          };
          return result;
        }

        case 'delete': {
          if (!stat) {
            const result: FsManageResult = {
              success: false,
              operation: input.operation,
              path: virtualSource,
              error: { code: 'NOT_FOUND', message: `Path does not exist: ${virtualSource}` },
              hint: 'Use fs_read to locate the path or check the spelling.',
            };
            return result;
          }

          // Safety: Only allow deleting files or empty directories
          if (stat.isDirectory()) {
            // Check if directory is empty
            const entries = await fs.readdir(absSource);
            if (entries.length > 0) {
              const result: FsManageResult = {
                success: false,
                operation: input.operation,
                path: virtualSource,
                error: {
                  code: 'DIRECTORY_NOT_EMPTY',
                  message: `Directory contains ${entries.length} item(s) and cannot be deleted`,
                },
                hint: 'Delete all files inside first, or use fs_read to inspect contents. Recursive delete is disabled for safety.',
              };
              return result;
            }
          }

          // Delete single file or empty directory
          await fs.rm(absSource, { recursive: false, force: false });
          const result: FsManageResult = {
            success: true,
            operation: input.operation,
            path: virtualSource,
            hint: stat.isDirectory() ? 'Empty directory deleted.' : 'File deleted.',
          };
          return result;
        }

        case 'rename':
        case 'move':
        case 'copy': {
          if (!targetResolved || !targetResolved.ok) {
            const result: FsManageResult = {
              success: false,
              operation: input.operation,
              path: virtualSource,
              error: { code: 'INVALID_TARGET', message: 'Target path is required.' },
              hint: 'Provide a target path.',
            };
            return result;
          }

          const target = targetResolved.resolved;
          const absTarget = target.absolutePath;
          const virtualTarget = target.virtualPath;

          if (input.operation === 'rename' && target.mount.name !== source.mount.name) {
            const result: FsManageResult = {
              success: false,
              operation: input.operation,
              path: virtualSource,
              target: virtualTarget,
              error: { code: 'CROSS_MOUNT', message: 'Rename cannot cross mounts' },
              hint: 'Use operation="move" to move across mounts.',
            };
            return result;
          }

          if (!stat) {
            const result: FsManageResult = {
              success: false,
              operation: input.operation,
              path: virtualSource,
              target: virtualTarget,
              error: { code: 'NOT_FOUND', message: `Path does not exist: ${virtualSource}` },
              hint: 'Use fs_read to locate the path or check the spelling.',
            };
            return result;
          }

          if (stat.isDirectory() && input.operation !== 'rename' && !input.recursive) {
            const result: FsManageResult = {
              success: false,
              operation: input.operation,
              path: virtualSource,
              target: virtualTarget,
              error: {
                code: 'DIRECTORY_NOT_EMPTY',
                message: 'Directory operation requires recursive=true',
              },
              hint: 'Set recursive=true to move/copy directories and their contents.',
            };
            return result;
          }

          const availability = await ensureTargetAvailable(absTarget, input.force);
          if (!availability.ok) {
            const errorResult = availability.error;
            errorResult.operation = input.operation;
            errorResult.path = virtualSource;
            errorResult.target = virtualTarget;
            return errorResult;
          }

          if (input.operation === 'copy') {
            await copyPath(absSource, absTarget, {
              recursive: input.recursive || stat.isDirectory(),
              force: input.force,
            });

            const result: FsManageResult = {
              success: true,
              operation: input.operation,
              path: virtualSource,
              target: virtualTarget,
              hint: 'Copy completed successfully.',
            };
            return result;
          }

          // rename or move
          try {
            await fs.rename(absSource, absTarget);
          } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (input.operation === 'move' && err.code === 'EXDEV') {
              await copyPath(absSource, absTarget, {
                recursive: input.recursive || stat.isDirectory(),
                force: true,
              });
              await deletePath(absSource, input.recursive || stat.isDirectory());
            } else {
              throw error;
            }
          }

          const result: FsManageResult = {
            success: true,
            operation: input.operation,
            path: virtualSource,
            target: virtualTarget,
            hint: input.operation === 'rename' ? 'Rename completed successfully.' : 'Move completed successfully.',
          };
          return result;
        }

        default: {
          const result: FsManageResult = {
            success: false,
            operation: input.operation,
            path: virtualSource,
            error: { code: 'INVALID_OPERATION', message: `Unknown operation: ${input.operation}` },
            hint: 'Valid operations: delete, rename, move, copy, mkdir, stat',
          };
          return result;
        }
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      const result: FsManageResult = {
        success: false,
        operation: input.operation,
        path: virtualSource,
        target: input.target,
        error: { code: err.code ?? 'IO_ERROR', message: err.message },
        hint: 'Operation failed. Check paths and permissions, or try again with recursive/force if appropriate.',
      };
      return result;
    }
  },
};
