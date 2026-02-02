import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as path from "path";
import { DapRequest, IOManager } from "./io";
import { readFileSync } from "fs";

// https://microsoft.github.io/debug-adapter-protocol/

class PGMDebugAdapter {
  private io: IOManager;
  private child: ChildProcessWithoutNullStreams | null = null;
  private port: number | null = null;

  constructor() {
    this.io = new IOManager();
    this.io.addListener('onDidReceiveMessage', this.onPacket.bind(this));
  }

  /**
   * Start the debugger.
   */
  public start() {
    this.io.initialize();
  }

  /**
   * Start the PGM runtime.
   */
  private startChild(debugExePath: string, debugConfigPath: string) {
    if (this.child) {
      return;
    }

    // Attempt to read the port from the config file. It will be used later when
    // notifying vscode the server is started with the port.
    try {
      const config = JSON.parse(readFileSync(debugConfigPath, 'utf8'));
      this.port = config.port;
    }
    catch {
      // silently ignore: the debugger will still start
    }

    this.child = spawn(debugExePath, [debugConfigPath], {
      windowsHide: true
    });

    this.child.stdout.on("data", (d) => {
      // ugly way to detect if the runtime as started
      if (`${d}`.includes('first sequence')) {
        this.io.sendEvent('pgm/started', { port: this.port });
      }
      this.io.sendEvent("output", { category: "stdout", output: d.toString("utf8") });
    });

    this.child.stderr.on("data", (d) => {
      this.io.sendEvent("output", { category: "stderr", output: d.toString("utf8") });
    });

    this.child.on("exit", (code, signal) => {
      this.child = null;
      this.io.sendEvent("terminated");
      this.io.sendEvent("exited", { exitCode: typeof code === "number" ? code : 0 });
    });
  }

  /**
   * Kill the PGM runtime.
   */
  private killChild() {
    if (this.child === null) {
      return;
    }

    try {
      this.child.kill();
    } catch {
    }
  }

  /**
   * Manage a packet received from vscode.
   */
  private onPacket(msg: any) {
    if (!msg || msg.type !== "request") {
      return;
    }
    const req = msg as DapRequest;

    switch (req.command) {
      case "initialize": {
        this.io.sendResponse(req, true, {
          supportsConfigurationDoneRequest: true,
          supportsTerminateRequest: true,
          supportsRestartRequest: false,
          supportsSetVariable: false,
          supportsStepBack: false,
          supportsEvaluateForHovers: false,
          supportsFunctionBreakpoints: false,
          supportsConditionalBreakpoints: false,
          supportsHitConditionalBreakpoints: false
        });
        this.io.sendEvent("initialized");
        break;
      }

      case "launch": {
        const args = req.arguments ?? {};
        const debugExePath: string | undefined = args.debugExePath;
        const debugConfigPath: string | undefined = args.debugConfigPath;

        if (!debugExePath || !debugConfigPath) {
          this.io.sendResponse(req, false, undefined, "Missing debugExePath/debugConfigPath in launch arguments.");
          break;
        }

        this.startChild(debugExePath, debugConfigPath);

        // simulate
        this.io.sendEvent("process", {
          name: path.basename(debugExePath),
          systemProcessId: this.child?.pid ?? 0,
          isLocalProcess: true,
          startMethod: "launch"
        });

        this.io.sendResponse(req, true);
        break;
      }

      case "configurationDone": {
        this.io.sendResponse(req, true);
        break;
      }

      case "setBreakpoints": {
        const bps = (req.arguments?.breakpoints ?? []).map((bp: any) => ({
          verified: false,
          message: "Breakpoints are not supported by this debugger yet."
        }));
        this.io.sendResponse(req, true, { breakpoints: bps });
        break;
      }

      case "threads": {
        this.io.sendResponse(req, true, { threads: [{ id: 1, name: "Main" }] });
        break;
      }

      case "stackTrace": {
        this.io.sendResponse(req, true, { stackFrames: [], totalFrames: 0 });
        break;
      }

      case "scopes": {
        this.io.sendResponse(req, true, { scopes: [] });
        break;
      }

      case "variables": {
        this.io.sendResponse(req, true, { variables: [] });
        break;
      }

      case "continue":
      case "next":
      case "stepIn":
      case "stepOut":
      case "pause": {
        this.io.sendResponse(req, true);
        break;
      }

      case "terminate":
      case "disconnect": {
        this.killChild();
        this.io.sendResponse(req, true);
        break;
      }

      default: {
        this.io.sendResponse(req, true);
        break;
      }
    }
  }
}

(() => {
  const instance = new PGMDebugAdapter();
  instance.start();
})();