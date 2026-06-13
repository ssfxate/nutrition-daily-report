import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGoalComparisonUpdate,
  parseNutritionGoals,
  updateDailyNoteText
} from "../src/transform";

const dailyNote = [
  "---",
  "ft-calories: 2000",
  "ft-fats: 70",
  "ft-saturated_fats: 20",
  "ft-protein: 120",
  "ft-carbs: 250",
  "ft-fiber: 30",
  "ft-sugar: 40",
  "ft-sodium: 1800",
  "---",
  "# 2026-06-13",
  "",
  "## Food",
  "",
  "Breakfast entry",
  "",
  "## Water",
  "",
  "2L"
].join("\n");

const goalsNote = [
  "```yaml",
  "ft-calories: 1800",
  "ft-fats: 60",
  "ft-saturated_fats: 18",
  "ft-protein: 110",
  "ft-carbs: 230",
  "ft-fiber: 28",
  "ft-sugar: 35",
  "ft-sodium: 1700",
  "```"
].join("\n");

test("parseNutritionGoals reads the first fenced block", () => {
  assert.deepEqual(parseNutritionGoals(goalsNote), {
    calories: 1800,
    fats: 60,
    saturated_fats: 18,
    protein: 110,
    carbs: 230,
    fiber: 28,
    sugar: 35,
    sodium: 1700
  });
});

test("parseNutritionGoals reads goal values from frontmatter", () => {
  const frontmatterGoalsNote = [
    "---",
    "ft-calories: 1800",
    "ft-fats: 60",
    "ft-saturated_fats: 18",
    "ft-protein: 110",
    "ft-carbs: 230",
    "ft-fiber: 28",
    "ft-sugar: 35",
    "ft-sodium: 1700",
    "---",
    "",
    "No fenced block here"
  ].join("\n");

  assert.deepEqual(parseNutritionGoals(frontmatterGoalsNote), {
    calories: 1800,
    fats: 60,
    saturated_fats: 18,
    protein: 110,
    carbs: 230,
    fiber: 28,
    sugar: 35,
    sodium: 1700
  });
});

test("inserts the comparison block after Food", () => {
  const updated = buildGoalComparisonUpdate(dailyNote, goalsNote);

  assert.ok(updated.includes("### Goal comparison"));
  assert.ok(updated.includes("| Calories       | 1800 |    +200 |   2000 |"));
  assert.ok(updated.includes("| Fiber          |   28 |      +2 |     30 |"));
  assert.ok(updated.indexOf("### Goal comparison") < updated.indexOf("Breakfast entry"));
  assert.ok(updated.indexOf("Breakfast entry") < updated.indexOf("## Water"));
});

test("re-running the transform is idempotent", () => {
  const once = buildGoalComparisonUpdate(dailyNote, goalsNote);
  const twice = buildGoalComparisonUpdate(once, goalsNote);

  assert.equal(twice, once);
});

test("updateDailyNoteText throws when Food section is missing", () => {
  assert.throws(
    () => updateDailyNoteText("# Note\n\n## Other\n", "### Goal comparison"),
    /Could not find ## Food section/
  );
});

test("updateDailyNoteText supports a custom heading", () => {
  const customDailyNote = dailyNote.replace("## Food", "## Meals");
  const updated = updateDailyNoteText(customDailyNote, "### Goal comparison", "Meals");

  assert.ok(updated.includes("### Goal comparison"));
  assert.ok(updated.indexOf("### Goal comparison") < updated.indexOf("Breakfast entry"));
});

test("buildGoalComparisonUpdate supports a custom heading", () => {
  const customDailyNote = dailyNote.replace("## Food", "## Meals");
  const updated = buildGoalComparisonUpdate(customDailyNote, goalsNote, "Meals");

  assert.ok(updated.includes("| Calories       | 1800 |    +200 |   2000 |"));
});

test("buildGoalComparisonUpdate throws when goals block is missing", () => {
  assert.throws(
    () => buildGoalComparisonUpdate(dailyNote, "no fenced block here"),
    /Could not find nutrition goals block or frontmatter/
  );
});
