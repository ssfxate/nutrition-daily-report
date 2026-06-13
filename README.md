# Nutrition Daily Report

Obsidian plugin that inserts a nutrition goal comparison table into the active daily note.

## Development

```bash
npm install
npm run build
npm test
```

## Behavior

- Reads the active Markdown note.
- Reads `nutrition-goals.md` from the vault root by default.
- Extracts `ft-*` frontmatter values from the note.
- Replaces or inserts the `### Goal comparison` block directly after `## Food`.

## Settings

The plugin exposes a settings tab where the path to `nutrition-goals.md` can be changed without rebuilding the plugin.
