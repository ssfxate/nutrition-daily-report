import { Notice, Plugin, TFile, normalizePath } from "obsidian";

import { NutritionDailyReportSettingTab, DEFAULT_SETTINGS, type NutritionDailyReportSettings } from "./settings";
import { buildGoalComparisonUpdate } from "./transform";

export default class NutritionDailyReportPlugin extends Plugin {
  settings: NutritionDailyReportSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
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

  async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData())
    };

    this.settings.goalsPath = normalizePath(this.settings.goalsPath || DEFAULT_SETTINGS.goalsPath);
    this.settings.foodHeading = this.settings.foodHeading?.trim() || DEFAULT_SETTINGS.foodHeading;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async updateActiveNote(): Promise<void> {
    try {
      const file = this.app.workspace.getActiveFile();
      if (!(file instanceof TFile) || file.extension !== "md") {
        new Notice("Nutrition Daily Report: open a Markdown note first.");
        return;
      }

      const goalsFile = this.app.vault.getAbstractFileByPath(this.settings.goalsPath);
      if (!(goalsFile instanceof TFile)) {
        new Notice(`Nutrition Daily Report: ${this.settings.goalsPath} not found.`);
        return;
      }

      const [dailyText, goalsText] = await Promise.all([
        this.app.vault.read(file),
        this.app.vault.read(goalsFile)
      ]);

      const updatedText = buildGoalComparisonUpdate(dailyText, goalsText, this.settings.foodHeading);
      if (updatedText === dailyText) {
        new Notice("Nutrition Daily Report: comparison block is already up to date.");
        return;
      }

      await this.app.vault.modify(file, updatedText);
      new Notice("Nutrition Daily Report: updated current note.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Nutrition Daily Report: ${message}`);
      console.error("Nutrition Daily Report failed:", error);
    }
  }
}
