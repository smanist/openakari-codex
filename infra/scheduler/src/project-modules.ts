import { existsSync, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

export interface ModuleRegistryEntry {
  project: string;
  module: string;
  path: string;
  type: "submodule" | "local-scratch";
}

export interface ResolvedModuleEntry extends ModuleRegistryEntry {
  absolutePath: string;
  exists: boolean;
}

export function parseModuleRegistry(content: string): ModuleRegistryEntry[] {
  const entries: ModuleRegistryEntry[] = [];
  let current: Partial<ModuleRegistryEntry> | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trimEnd();
    const projectMatch = line.match(/^\s*-\s+project:\s*(.+)$/);
    if (projectMatch) {
      if (current?.project && current.module && current.path && current.type) {
        entries.push(current as ModuleRegistryEntry);
      }
      current = { project: projectMatch[1].trim() };
      continue;
    }

    const fieldMatch = line.match(/^\s+(module|path|type):\s*(.+)$/);
    if (!fieldMatch || current === null) continue;
    const [, key, value] = fieldMatch;
    if (key === "type") {
      current.type = value.trim() === "local-scratch" ? "local-scratch" : "submodule";
    } else if (key === "module") {
      current.module = value.trim();
    } else if (key === "path") {
      current.path = value.trim();
    }
  }

  if (current?.project && current.module && current.path && current.type) {
    entries.push(current as ModuleRegistryEntry);
  }

  return entries;
}

export function loadModuleRegistry(repoRoot: string): ModuleRegistryEntry[] {
  const registryPath = join(repoRoot, "modules", "registry.yaml");
  if (!existsSync(registryPath)) return [];
  return parseModuleRegistry(readFileSync(registryPath, "utf-8"));
}

export function resolveRegisteredModulePath(repoRoot: string, project: string): string | null {
  const entry = loadModuleRegistry(repoRoot).find((candidate) => candidate.project === project);
  return entry?.path ?? null;
}

export async function resolveRegisteredModule(repoRoot: string, project: string): Promise<ResolvedModuleEntry | null> {
  const entry = loadModuleRegistry(repoRoot).find((candidate) => candidate.project === project);
  if (!entry) return null;

  const absolutePath = isAbsolute(entry.path) ? entry.path : resolve(repoRoot, entry.path);
  let exists = false;
  try {
    exists = (await stat(absolutePath)).isDirectory();
  } catch {
    exists = false;
  }

  return {
    ...entry,
    absolutePath,
    exists,
  };
}
