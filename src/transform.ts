export const METRICS = [
  "calories",
  "fats",
  "saturated_fats",
  "protein",
  "carbs",
  "fiber",
  "sugar",
  "sodium",
] as const;

const FOOD_HEADING_RE = /^##\s+Food\s*$/;
const GOAL_HEADING_RE = /^###\s+Goal comparison\s*$/;
const NEXT_HEADING_RE = /^##\s+/;
const NEXT_SUBHEADING_RE = /^###\s+/;
const TABLE_ROW_RE = /^\s*\|/;
const BLANK_LINE_RE = /^\s*$/;

export type Frontmatter = Record<string, string>;
export type NutritionGoals = Partial<Record<(typeof METRICS)[number], number>>;

function normalizeText(text: string): string {
  return String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

export function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-9) {
    return String(rounded);
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function formatDelta(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (Math.abs(value) < 1e-9) {
    return "0";
  }

  return value > 0 ? `+${formatNumber(value)}` : `−${formatNumber(Math.abs(value))}`;
}

function titleFromMetric(metric: string): string {
  return metric
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseFrontmatter(text: string): { frontmatter: Frontmatter; body: string } {
  const normalized = normalizeText(text);
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: {}, body: normalized };
  }

  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: normalized };
  }

  const frontmatter: Frontmatter = {};
  for (const line of match[1].split("\n")) {
    const fieldMatch = line.match(/^([A-Za-z0-9_.-]+):\s*(.*?)\s*$/);
    if (!fieldMatch) {
      continue;
    }

    frontmatter[fieldMatch[1]] = fieldMatch[2];
  }

  return { frontmatter, body: match[2] };
}

export function parseNutritionGoals(goalsText: string): Record<string, number> {
  const text = normalizeText(goalsText);
  const blockMatch = text.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
  if (!blockMatch) {
    throw new Error("Could not find nutrition goals block in nutrition goals note");
  }

  const goals: Record<string, number> = {};
  for (const line of blockMatch[1].split("\n")) {
    const fieldMatch = line.match(/^([A-Za-z0-9_.-]+):\s*(.*?)\s*$/);
    if (!fieldMatch) {
      continue;
    }

    const parsed = parseNumber(fieldMatch[2]);
    if (parsed !== null) {
      const key = fieldMatch[1].startsWith("ft-") ? fieldMatch[1].slice(3) : fieldMatch[1];
      goals[key] = parsed;
    }
  }

  return goals;
}

function buildComparisonRow(metric: string, actual: number | null, goal: number | null): string {
  const label = titleFromMetric(metric);
  const delta = actual === null || goal === null ? null : actual - goal;
  return `| ${label.padEnd(14)} | ${formatNumber(goal).padStart(4)} | ${formatDelta(delta).padStart(7)} | ${formatNumber(actual).padStart(6)} |`;
}

export function buildGoalComparisonBlock(goals: Record<string, number>, dailyFrontmatter: Frontmatter): string {
  const lines = [
    "### Goal comparison",
    "| Metric | Goal | Delta | Today |",
    "| --- | ---: | ---: | ---: |"
  ];

  for (const metric of METRICS) {
    const actual = parseNumber(dailyFrontmatter[`ft-${metric}`]);
    lines.push(buildComparisonRow(metric, actual, goals[metric] ?? null));
  }

  return lines.join("\n");
}

export function removeExistingGoalComparison(sectionLines: string[]): string[] {
  const cleaned: string[] = [];

  for (let i = 0; i < sectionLines.length; i += 1) {
    const line = sectionLines[i];
    if (!GOAL_HEADING_RE.test(line)) {
      cleaned.push(line);
      continue;
    }

    i += 1;
    while (i < sectionLines.length) {
      const next = sectionLines[i];
      if (TABLE_ROW_RE.test(next) || BLANK_LINE_RE.test(next)) {
        i += 1;
        continue;
      }

      i -= 1;
      break;
    }
  }

  return cleaned;
}

export function updateDailyNoteText(text: string, goalComparisonBlock: string): string {
  const normalized = normalizeText(text);
  const lines = normalized.split("\n");
  const foodIndex = lines.findIndex((line) => FOOD_HEADING_RE.test(line));

  if (foodIndex === -1) {
    throw new Error("Could not find ## Food section in the active note");
  }

  let nextSectionIndex = lines.length;
  for (let i = foodIndex + 1; i < lines.length; i += 1) {
    if (NEXT_HEADING_RE.test(lines[i])) {
      nextSectionIndex = i;
      break;
    }
  }

  const beforeFood = lines.slice(0, foodIndex + 1);
  const foodSection = lines.slice(foodIndex + 1, nextSectionIndex);
  const afterFood = lines.slice(nextSectionIndex);
  const cleanedFoodSection = removeExistingGoalComparison(foodSection);
  const contentSection = cleanedFoodSection.slice();
  while (contentSection.length > 0 && BLANK_LINE_RE.test(contentSection[0])) {
    contentSection.shift();
  }

  const updatedFoodSection = contentSection.length > 0 ? [goalComparisonBlock, "", ...contentSection] : [goalComparisonBlock];

  return [...beforeFood, ...updatedFoodSection, ...afterFood].join("\n").replace(/\n+$/, "\n");
}

export function buildGoalComparisonUpdate(dailyText: string, goalsText: string): string {
  const { frontmatter } = parseFrontmatter(dailyText);
  const goals = parseNutritionGoals(goalsText);
  const goalComparisonBlock = buildGoalComparisonBlock(goals, frontmatter);
  return updateDailyNoteText(dailyText, goalComparisonBlock);
}
