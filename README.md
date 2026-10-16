# Apleno Designer Extension

A Visual Studio Code extension for building data science apps with user-friendly graphical interfaces, powered by R and Python.

## Features

- **Project Editor**: manage your Apleno project settings and structure (`.ppro` files)
- **Sequence Editor**: define execution sequences and logic flows (`.pseq` files)
- **Interface Editor**: design interactive GUI layouts visually (`.pgui` files)
- **App Preview**: run and preview your app directly inside VSCode using R, Python, or Conda
- **Export**: package your project into a distributable app
- **Validation**: errors in `.ppro`, `.pseq` and `.pgui` files are shown in the Problems panel
- **AI assistants**: Claude Code and GitHub Copilot know how to build Apleno apps (see below)

## Requirements

At least one of the following runtimes must be installed to run/preview apps:

- [R](https://www.r-project.org/)
- [Python](https://www.python.org/) (or [Conda](https://docs.conda.io/))

## Getting Started

1. Install the extension in VSCode.
2. Open the Command Palette (`Ctrl+Shift+P`) and run **Apleno: Create new project**.
3. Configure your runtime via **Apleno: Choose R path for preview** or **Apleno: Choose Python path for preview**.
4. Open or create `.ppro`, `.pseq`, and `.pgui` files.
5. Use the **Apleno preview** debug configuration to launch a live preview of your app.

## Commands

| Command                                  | Description                                      |
| ---------------------------------------- | ------------------------------------------------ |
| `Apleno: Create new project`             | Initialize a new Apleno project in the workspace |
| `Apleno: Set up AI assistant files`      | Add `AGENTS.md` and `CLAUDE.md` to an existing project |
| `Apleno: Create new Project file`        | Create a new `.ppro` file                        |
| `Apleno: Create new Sequence file`       | Create a new `.pseq` file                        |
| `Apleno: Create new Interface file`      | Create a new `.pgui` file                        |
| `Apleno: Export app`                     | Export the project as a standalone app           |
| `Apleno: Choose R path for preview`      | Set the R executable used for previewing         |
| `Apleno: Choose Python path for preview` | Set the Python executable used for previewing    |
| `Apleno: Choose Conda path for preview`  | Set the Conda executable used for previewing     |
| `Apleno: Show logs`                      | Open the Apleno output log panel                 |

## Deploy your apps

Apps built with Apleno Designer run on **Apleno Server**, the on-premise server for Apleno, Shiny, Dash, Streamlit and Gradio apps: single sign-on with OAuth 2.0 / OpenID Connect, per-app permissions and an action log. It installs on Linux, Windows Server or Docker.

[Start a free 30-day trial](https://apleno.io/trial?utm_source=marketplace&utm_medium=readme&utm_campaign=designer)

## AI Assistants

AI coding assistants like Claude Code and GitHub Copilot can create and modify Apleno apps: interfaces, sequences, project files and the R/Python code using the Apleno API.

- New projects include an `AGENTS.md` file (and a `CLAUDE.md` importing it) explaining Apleno to AI assistants. For an existing project, run **Apleno: Set up AI assistant files**. You can edit these files: the extension never modifies them once created.
- The extension installs an **Apleno skill** in `~/.claude/skills/apleno/`, used by both Claude Code and Copilot, with the JSON Schemas of the Apleno files, detailed references and example apps. It is updated with the extension and removed when the extension is uninstalled.
- AI assistants read the Problems panel to fix invalid files, and `.apleno/last-run.log` (the output of the last preview) to fix runtime errors.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) to build and develop the extension.

## License

See [LICENSE](LICENSE).
