import { describe, expect, it } from "vitest";
import { validateWeights } from "@/lib/validation/score-settings";

describe("weight validation", () => {
  it("fails out-of-range", () => {
    const result = validateWeights({
      tasks: 50,
      grow: 20,
      habits: 10,
      exercise: 10,
      grateful: 5,
      water: 5
    });
    expect(result.ok).toBe(false);
  });

  it("fails sum != 100", () => {
    const result = validateWeights({
      tasks: 30,
      grow: 20,
      habits: 10,
      exercise: 10,
      grateful: 10,
      water: 10
    });
    expect(result.ok).toBe(false);
  });

  it("fails if required section is 0", () => {
    const result = validateWeights({
      tasks: 0,
      grow: 30,
      habits: 20,
      exercise: 20,
      grateful: 15,
      water: 15
    });
    expect(result.ok).toBe(false);
  });

  it("fails if fewer than 4 active", () => {
    const result = validateWeights({
      tasks: 40,
      grow: 30,
      habits: 0,
      exercise: 0,
      grateful: 0,
      water: 30
    });
    expect(result.ok).toBe(false);
  });

  it("passes a valid configuration", () => {
    const result = validateWeights({
      tasks: 30,
      grow: 20,
      habits: 10,
      exercise: 10,
      grateful: 10,
      water: 20
    });
    expect(result.ok).toBe(true);
  });
});
