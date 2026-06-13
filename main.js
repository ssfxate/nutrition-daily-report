"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => NutritionDailyReportPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  goalsPath: "nutrition-goals.md"
};
var NutritionDailyReportSettingTab = class extends import_obsidian.PluginSettingTab {
  plugin;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Nutrition Daily Report" });
    new import_obsidian.Setting(containerEl).setName("Nutrition goals note").setDesc("Path to the nutrition goals note relative to the vault root.").addText(
      (text) => text.setPlaceholder(DEFAULT_SETTINGS.goalsPath).setValue(this.plugin.settings.goalsPath).onChange(async (value) => {
        this.plugin.settings.goalsPath = (0, import_obsidian.normalizePath)(value.trim() || DEFAULT_SETTINGS.goalsPath);
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/transform.ts
var METRICS = [
  "calories",
  "fats",
  "saturated_fats",
  "protein",
  "carbs",
  "fiber",
  "sugar",
  "sodium"
];
var FOOD_HEADING_RE = /^##\s+Food\s*$/;
var GOAL_HEADING_RE = /^###\s+Goal comparison\s*$/;
var NEXT_HEADING_RE = /^##\s+/;
var TABLE_ROW_RE = /^\s*\|/;
var BLANK_LINE_RE = /^\s*$/;
function normalizeText(text) {
  return String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}
function parseNumber(value) {
  if (value === void 0 || value === null) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}
function formatNumber(value) {
  if (value === null || value === void 0) {
    return "\u2014";
  }
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-9) {
    return String(rounded);
  }
  return value.toFixed(1).replace(/\.0$/, "");
}
function formatDelta(value) {
  if (value === null || value === void 0) {
    return "\u2014";
  }
  if (Math.abs(value) < 1e-9) {
    return "0";
  }
  return value > 0 ? `+${formatNumber(value)}` : `\u2212${formatNumber(Math.abs(value))}`;
}
function titleFromMetric(metric) {
  return metric.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
function parseFrontmatter(text) {
  const normalized = normalizeText(text);
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: {}, body: normalized };
  }
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: normalized };
  }
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const fieldMatch = line.match(/^([A-Za-z0-9_.-]+):\s*(.*?)\s*$/);
    if (!fieldMatch) {
      continue;
    }
    frontmatter[fieldMatch[1]] = fieldMatch[2];
  }
  return { frontmatter, body: match[2] };
}
function parseNutritionGoals(goalsText) {
  const text = normalizeText(goalsText);
  const blockMatch = text.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
  if (!blockMatch) {
    throw new Error("Could not find nutrition goals block in nutrition goals note");
  }
  const goals = {};
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
function buildComparisonRow(metric, actual, goal) {
  const label = titleFromMetric(metric);
  const delta = actual === null || goal === null ? null : actual - goal;
  return `| ${label.padEnd(14)} | ${formatNumber(goal).padStart(4)} | ${formatDelta(delta).padStart(7)} | ${formatNumber(actual).padStart(6)} |`;
}
function buildGoalComparisonBlock(goals, dailyFrontmatter) {
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
function removeExistingGoalComparison(sectionLines) {
  const cleaned = [];
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
function updateDailyNoteText(text, goalComparisonBlock) {
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
function buildGoalComparisonUpdate(dailyText, goalsText) {
  const { frontmatter } = parseFrontmatter(dailyText);
  const goals = parseNutritionGoals(goalsText);
  const goalComparisonBlock = buildGoalComparisonBlock(goals, frontmatter);
  return updateDailyNoteText(dailyText, goalComparisonBlock);
}

// src/main.ts
var NutritionDailyReportPlugin = class extends import_obsidian2.Plugin {
  settings = DEFAULT_SETTINGS;
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("clipboard-list", "Insert nutrition goal comparison", () => {
      void this.updateActiveNote();
    });
    this.addCommand({
      id: "insert-nutrition-goal-comparison",
      name: "Insert nutrition goal comparison",
      callback: () => {
        void this.updateActiveNote();
      }
    });
    this.addSettingTab(new NutritionDailyReportSettingTab(this.app, this));
  }
  async loadSettings() {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...await this.loadData()
    };
    this.settings.goalsPath = (0, import_obsidian2.normalizePath)(this.settings.goalsPath || DEFAULT_SETTINGS.goalsPath);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async updateActiveNote() {
    try {
      const file = this.app.workspace.getActiveFile();
      if (!(file instanceof import_obsidian2.TFile) || file.extension !== "md") {
        new import_obsidian2.Notice("Nutrition Daily Report: open a Markdown note first.");
        return;
      }
      const goalsFile = this.app.vault.getAbstractFileByPath(this.settings.goalsPath);
      if (!(goalsFile instanceof import_obsidian2.TFile)) {
        new import_obsidian2.Notice(`Nutrition Daily Report: ${this.settings.goalsPath} not found.`);
        return;
      }
      const [dailyText, goalsText] = await Promise.all([
        this.app.vault.read(file),
        this.app.vault.read(goalsFile)
      ]);
      const updatedText = buildGoalComparisonUpdate(dailyText, goalsText);
      if (updatedText === dailyText) {
        new import_obsidian2.Notice("Nutrition Daily Report: comparison block is already up to date.");
        return;
      }
      await this.app.vault.modify(file, updatedText);
      new import_obsidian2.Notice("Nutrition Daily Report: updated current note.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian2.Notice(`Nutrition Daily Report: ${message}`);
      console.error("Nutrition Daily Report failed:", error);
    }
  }
};
