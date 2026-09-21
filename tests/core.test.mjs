import test from "node:test";
import assert from "node:assert/strict";
import { buildMealPlan } from "../lib/meal-planner.ts";
import { parseBackup } from "../lib/pulso-backup.ts";

const sample = {
  version: 1,
  exportedAt: "2026-09-20T12:00:00.000Z",
  data: {
    profile: {
      height: 170, weight: 70, days: 3, level: "iniciante", place: "casa",
      favorite: "equilibrado", workoutReady: true, goal: "bem-estar",
      duration: 40, equipment: "corpo", diet: "vegana", meals: 4,
      menuVariant: 0, avoid: ["leite", "ovos"], freeFrequency: 1, fastHours: 12,
    },
    completed: [0], entries: [{ date: "2026-09-20", weight: 70, note: "Bem", energy: 4 }],
    freeMeals: [], fastHistory: [], fastStart: null,
  },
};

test("backup válido preserva os dados", () => {
  const parsed = parseBackup(JSON.stringify(sample));
  assert.equal(parsed.data.entries[0].energy, 4);
  assert.deepEqual(parsed.data.completed, [0]);
});

test("backup inválido não substitui os registros", () => {
  assert.throws(() => parseBackup(JSON.stringify({ ...sample, version: 2 })), /backup válido/);
  assert.throws(() => parseBackup(JSON.stringify({ ...sample, data: { ...sample.data, entries: [{ date: "2026-02-31", weight: 70, note: "" }] } })), /backup válido/);
  assert.throws(() => parseBackup("{"), /JSON válido/);
});

test("cardápio respeita estilo e ingredientes selecionados", () => {
  const plan = buildMealPlan("vegana", 5, 0, ["leite", "ovos", "peixe"]);
  assert.equal(plan.length, 5);
  assert.ok(plan.every(meal => !/frango|peixe|ovos|iogurte|leite/i.test(meal.text)));
  assert.notDeepEqual(buildMealPlan("onivora", 3, 0, []), buildMealPlan("onivora", 3, 1, []));
});
