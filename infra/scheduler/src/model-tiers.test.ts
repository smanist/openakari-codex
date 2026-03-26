import { describe, it, expect } from "vitest";
import {
  computeEffectiveModel,
  inferModelTier,
  DEFAULT_MODEL_BY_TIER,
} from "./model-tiers.js";

describe("inferModelTier", () => {
  it("infers tier labels directly", () => {
    expect(inferModelTier("fast")).toBe("fast");
    expect(inferModelTier("standard")).toBe("standard");
    expect(inferModelTier("strong")).toBe("strong");
    expect(inferModelTier("frontier")).toBe("frontier");
  });

  it("infers legacy aliases", () => {
    expect(inferModelTier("haiku")).toBe("fast");
    expect(inferModelTier("sonnet")).toBe("standard");
    expect(inferModelTier("opus")).toBe("frontier");
  });

  it("infers concrete GPT model ids", () => {
    expect(inferModelTier("gpt-5.1-codex-mini")).toBe("fast");
    expect(inferModelTier("gpt-5.4-mini")).toBe("standard");
    expect(inferModelTier("gpt-5.3-codex")).toBe("strong");
    expect(inferModelTier("gpt-5.4")).toBe("frontier");
  });
});

describe("computeEffectiveModel", () => {
  it("uses strong default when no model or minimum is provided", () => {
    expect(computeEffectiveModel()).toBe(DEFAULT_MODEL_BY_TIER.strong);
  });

  it("uses minimum tier when no model is provided", () => {
    expect(computeEffectiveModel(undefined, "frontier")).toBe(DEFAULT_MODEL_BY_TIER.frontier);
  });

  it("normalizes legacy aliases to concrete defaults", () => {
    expect(computeEffectiveModel("sonnet")).toBe(DEFAULT_MODEL_BY_TIER.standard);
    expect(computeEffectiveModel("opus")).toBe(DEFAULT_MODEL_BY_TIER.frontier);
  });

  it("applies minimum tier floor for known models", () => {
    expect(computeEffectiveModel("gpt-5.1-codex-mini", "strong")).toBe(DEFAULT_MODEL_BY_TIER.strong);
    expect(computeEffectiveModel("standard", "frontier")).toBe(DEFAULT_MODEL_BY_TIER.frontier);
  });

  it("preserves unknown explicit models even when a minimum is present", () => {
    expect(computeEffectiveModel("o3", "frontier")).toBe("o3");
  });
});

