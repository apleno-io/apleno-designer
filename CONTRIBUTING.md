# Contributing to the Apleno Designer Extension

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Run tests
npm test
npm run test:unit
```

To launch the extension in a development host, press `F5` in VSCode. Two launch
configurations are available:

- **Run Extension**: the development host with all your installed extensions
  (useful to test the AI integration with Claude Code or Copilot).
- **Run Extension (only Apleno)**: the development host with all other
  extensions disabled.

## Project structure

| Folder               | Content                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `src/extension/`     | Extension code: editors, preview, export, validation (Problems panel), AI files           |
| `src/webview/`       | Code of the visual editors (project, sequence, interface)                                 |
| `src/common/`        | Code shared by both: file formats, reading and writing `.ppro`, `.pseq` and `.pgui` files |
| `src/debug-adapter/` | Debug adapter launching the Apleno Runtime for the preview                                |
| `schemas/`           | JSON Schemas of the `.ppro`, `.pseq` and `.pgui` files                                    |
| `templates/`         | `AGENTS.md` written in new projects, and the sources of the AI skill                      |
| `examples/`          | Example apps, also included in the AI skill                                               |
| `tests/`             | Unit tests (vitest)                                                                       |

## File formats

The Apleno Runtime reads the v3 format of sequences and interfaces. The editors
work on their own internal model, converted from the file when reading and back
to v3 when saving (`SequenceFileUtils` in `src/common/sequence.ts`,
`GUIFileUtils` in `src/common/gui.ts`).

When changing a format, update the JSON Schemas in `schemas/` too: the unit
tests check that they match the code, and validate the example apps against
them.

## AI assistant skill

The build assembles the skill in `dist/skill/apleno/` from
`templates/skill/apleno/`, the JSON Schemas and the source files of
`examples/` (data files and third-party libraries are excluded, see
`buildSkill()` in `esbuild.js`). The extension installs it in
`~/.claude/skills/apleno/` on activation and removes it on uninstall.

To add an example app, add a folder in `examples/` with the project files and a
`README.md` explaining what it shows, then add it to the examples table of
`templates/skill/apleno/SKILL.md`.
