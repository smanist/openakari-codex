import { resolve } from "node:path";

import { describe, it, expect } from "vitest";

import {
  parseModuleRegistry,
  resolveRegisteredModule,
  type ModuleRegistryEntry,
} from "./project-modules.js";

describe("project-modules", () => {
  const repoRoot = resolve(process.cwd(), "../..");
  const registry = `
entries:
  - project: akari
    module: akari
    path: modules/akari
    type: local-scratch
  - project: dymad_dev
    module: dymad_dev
    path: modules/dymad_dev
    type: submodule
`.trim();

  it("parses module registry entries", () => {
    const result = parseModuleRegistry(registry);
    expect(result).toEqual<ModuleRegistryEntry[]>([
      {
        project: "akari",
        module: "akari",
        path: "modules/akari",
        type: "local-scratch",
      },
      {
        project: "dymad_dev",
        module: "dymad_dev",
        path: "modules/dymad_dev",
        type: "submodule",
      },
    ]);
  });

  it("resolves an existing module with existence metadata", async () => {
    const result = await resolveRegisteredModule(repoRoot, "dymad_dev");
    expect(result).toMatchObject({
      project: "dymad_dev",
      module: "dymad_dev",
      path: "modules/dymad_dev",
      type: "submodule",
      exists: true,
    });
    expect(result?.absolutePath).toContain("/modules/dymad_dev");
  });

  it("returns missing-path resolution when registry entry exists but path does not", async () => {
    const result = await resolveRegisteredModule(repoRoot, "akari");
    expect(result).toMatchObject({
      project: "akari",
      module: "akari",
      path: "modules/akari",
      type: "local-scratch",
      exists: false,
    });
  });

  it("returns null when project is not registered", async () => {
    await expect(resolveRegisteredModule(repoRoot, "unknown-project")).resolves.toBeNull();
  });
});
