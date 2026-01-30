import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as path from "path";

// https://microsoft.github.io/debug-adapter-protocol/

type DapRequest = {
  seq: number;
  type: "request";
  command: string;
  arguments?: any;
};

type DapEvent = {
  seq: number;
  type: "event";
  event: string;
  body?: any;
};

type DapResponse = {
  seq: number;
  type: "response";
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: any;
};

let seqCounter = 1;
function nextSeq() {
  return seqCounter++;
}

function writeDapMessage(msg: any) {
  const json = JSON.stringify(msg);
  const content = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
  process.stdout.write(content);
}

function sendEvent(event: string, body?: any) {
  const e: DapEvent = { seq: nextSeq(), type: "event", event, body };
  writeDapMessage(e);
}

function sendResponse(req: DapRequest, success = true, body?: any, message?: string) {
  const res: DapResponse = {
    seq: nextSeq(),
    type: "response",
    request_seq: req.seq,
    success,
    command: req.command
  };
  if (message) {
    res.message = message;
  }
  if (body !== undefined) {
    res.body = body;
  }
  writeDapMessage(res);
}

class DapReader {
  private buffer = Buffer.alloc(0);

  onMessage: (msg: any) => void = () => { };

  feed(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }

      const header = this.buffer.slice(0, headerEnd).toString("utf8");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        // error, clear everything
        this.buffer = Buffer.alloc(0);
        return;
      }

      const length = parseInt(match[1], 10);
      const total = headerEnd + 4 + length;
      if (this.buffer.length < total) {
        return;
      }

      const body = this.buffer.slice(headerEnd + 4, total).toString("utf8");
      this.buffer = this.buffer.slice(total);

      try {
        const msg = JSON.parse(body);
        this.onMessage(msg);
      } catch {
        // ignore
      }
    }
  }
}

let debugProc: ChildProcessWithoutNullStreams | null = null;
let launched = false;

function spawnDebugExe(debugExePath: string, debugConfigPath: string) {
  if (debugProc) {
    return;
  }

  debugProc = spawn(debugExePath, [debugConfigPath], {
    windowsHide: true
  });

  debugProc.stdout.on("data", (d) => {
    sendEvent("output", { category: "stdout", output: d.toString("utf8") });
  });

  debugProc.stderr.on("data", (d) => {
    sendEvent("output", { category: "stderr", output: d.toString("utf8") });
  });

  debugProc.on("exit", (code, signal) => {
    debugProc = null;
    launched = false;
    sendEvent("terminated");
    sendEvent("exited", { exitCode: typeof code === "number" ? code : 0 });
  });
}

function stopDebugExe() {
  if (!debugProc) {
    return;
  }

  try {
    debugProc.kill();
  } catch {
  }
}

const reader = new DapReader();
reader.onMessage = (msg) => {
  if (!msg || msg.type !== "request") {
    return;
  }
  const req = msg as DapRequest;

  switch (req.command) {
    case "initialize": {
      sendResponse(req, true, {
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
      sendEvent("initialized");
      break;
    }

    case "launch": {
      const args = req.arguments ?? {};
      const debugExePath: string | undefined = args.debugExePath;
      const debugConfigPath: string | undefined = args.debugConfigPath;

      if (!debugExePath || !debugConfigPath) {
        sendResponse(req, false, undefined, "Missing debugExePath/debugConfigPath in launch arguments.");
        break;
      }

      spawnDebugExe(debugExePath, debugConfigPath);
      launched = true;

      // simulate
      sendEvent("process", {
        name: path.basename(debugExePath),
        systemProcessId: debugProc?.pid ?? 0,
        isLocalProcess: true,
        startMethod: "launch"
      });

      sendResponse(req, true);
      break;
    }

    case "configurationDone": {
      sendResponse(req, true);
      break;
    }

    case "setBreakpoints": {
      const bps = (req.arguments?.breakpoints ?? []).map((bp: any) => ({
        verified: false,
        message: "Breakpoints are not supported by this debugger yet."
      }));
      sendResponse(req, true, { breakpoints: bps });
      break;
    }

    case "threads": {
      sendResponse(req, true, { threads: [{ id: 1, name: "Main" }] });
      break;
    }

    case "stackTrace": {
      sendResponse(req, true, { stackFrames: [], totalFrames: 0 });
      break;
    }

    case "scopes": {
      sendResponse(req, true, { scopes: [] });
      break;
    }

    case "variables": {
      sendResponse(req, true, { variables: [] });
      break;
    }

    case "continue":
    case "next":
    case "stepIn":
    case "stepOut":
    case "pause": {
      sendResponse(req, true);
      break;
    }

    case "terminate":
    case "disconnect": {
      stopDebugExe();
      sendResponse(req, true);
      break;
    }

    default: {
      sendResponse(req, true);
      break;
    }
  }
};

process.stdin.on("data", (chunk) => reader.feed(chunk));
process.stdin.resume();
