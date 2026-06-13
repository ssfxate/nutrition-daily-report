import { App, Notice, PluginSettingTab, Setting, normalizePath, type Plugin } from "obsidian";

import { normalizeHeadingValue } from "./settings-utils";

export interface NutritionDailyReportSettings {
  goalsPath: string;
  foodHeading: string;
}

export const DEFAULT_SETTINGS: NutritionDailyReportSettings = {
  goalsPath: "nutrition-goals.md",
  foodHeading: "Food"
};

type NutritionDailyReportPluginLike = Plugin & {
  settings: NutritionDailyReportSettings;
  saveSettings(): Promise<void>;
};

export class NutritionDailyReportSettingTab extends PluginSettingTab {
  plugin: NutritionDailyReportPluginLike;

  constructor(app: App, plugin: NutritionDailyReportPluginLike) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Nutrition Daily Report" });

    new Setting(containerEl)
      .setName("Nutrition goals note")
      .setDesc("Path to the nutrition goals note relative to the vault root.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.goalsPath)
          .setValue(this.plugin.settings.goalsPath)
          .onChange(async (value) => {
            this.plugin.settings.goalsPath = normalizePath(value.trim() || DEFAULT_SETTINGS.goalsPath);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Food section heading")
      .setDesc("Heading under which the comparison table is inserted.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.foodHeading)
          .setValue(this.plugin.settings.foodHeading)
          .onChange(async (value) => {
            const heading = normalizeHeadingValue(value);
            if (!heading) {
              new Notice("Nutrition Daily Report: Food section heading cannot be empty.");
              return;
            }

            this.plugin.settings.foodHeading = heading;
            await this.plugin.saveSettings();
          })
      );
  }
}
