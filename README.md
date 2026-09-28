# Apleno Designer Extension

A Visual Studio Code extension for building data science apps with user-friendly graphical interfaces, powered by R and Python.

## Features

- **Project Editor**: manage your Apleno project settings and structure (`.ppro` files)
- **Sequence Editor**: define execution sequences and logic flows (`.pseq` files)
- **Interface Editor**: design interactive GUI layouts visually (`.pgui` files)
- **App Preview**: run and preview your app directly inside VSCode using R, Python, or Conda
- **Export**: package your project into a distributable app

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
| `Apleno: Create new Project file`        | Create a new `.ppro` file                        |
| `Apleno: Create new Sequence file`       | Create a new `.pseq` file                        |
| `Apleno: Create new Interface file`      | Create a new `.pgui` file                        |
| `Apleno: Export app`                     | Export the project as a standalone app           |
| `Apleno: Choose R path for preview`      | Set the R executable used for previewing         |
| `Apleno: Choose Python path for preview` | Set the Python executable used for previewing    |
| `Apleno: Choose Conda path for preview`  | Set the Conda executable used for previewing     |
| `Apleno: Show logs`                      | Open the Apleno output log panel                 |

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
