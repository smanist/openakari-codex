import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ModuleRegistryEntry {
  project: string;
  module: string;
  path: string;
  type: "submodule" | "local-scratch";
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
