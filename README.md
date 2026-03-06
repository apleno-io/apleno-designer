# PGM — VSCode Extension

A Visual Studio Code extension for building data science apps with user-friendly graphical interfaces, powered by R and Python.

## Features

- **Project Editor** — manage your PGM project settings and structure (`.ppro` files)
- **Sequence Editor** — define execution sequences and logic flows (`.pseq` files)
- **Interface Editor** — design interactive GUI layouts visually (`.pgui` files)
- **App Preview** — run and preview your app directly inside VSCode using R, Python, or Conda
- **Export** — package your project into a distributable app

## Requirements

At least one of the following runtimes must be installed to run/preview apps:

- [R](https://www.r-project.org/)
- [Python](https://www.python.org/) (or [Conda](https://docs.conda.io/))

## Getting Started

1. Install the extension in VSCode.
2. Open the Command Palette (`Ctrl+Shift+P`) and run **PGM: Create new project**.
3. Configure your runtime via **PGM: Choose R path for preview** or **PGM: Choose Python path for preview**.
4. Open or create `.ppro`, `.pseq`, and `.pgui` files — they will open in their respective visual editors automatically.
5. Use the **RPGM preview** debug configuration to launch a live preview of your app.

## Commands

| Command | Description |
|---|---|
| `PGM: Create new project` | Initialize a new PGM project in the workspace |
| `PGM: Create new Project file` | Create a new `.ppro` file |
| `PGM: Create new Sequence file` | Create a new `.pseq` file |
| `PGM: Create new Interface file` | Create a new `.pgui` file |
| `PGM: Export app` | Export the project as a standalone app |
| `PGM: Choose R path for preview` | Set the R executable used for previewing |
| `PGM: Choose Python path for preview` | Set the Python executable used for previewing |
| `PGM: Choose Conda path for preview` | Set the Conda executable used for previewing |
| `PGM: Show logs` | Open the PGM output log panel |

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

To launch the extension in a development host, press `F5` in VSCode.

## License

See [LICENSE](LICENSE).
