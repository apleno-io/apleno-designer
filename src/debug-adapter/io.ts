import EventEmitter from 'node:events';

export type DapRequest = {
  seq: number;
  type: "request";
  command: string;
  arguments?: any;
};

export type DapEvent = {
  seq: number;
  type: 'event';
  event: string;
  body?: any;
};

export type DapResponse = {
  seq: number;
  type: "response";
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: any;
};

/**
 * Manage the input/output streams with vscode.
 */
export class IOManager extends EventEmitter {
  private nextPacketCounter: number = 1;
  private inputBuffer: Buffer<ArrayBuffer> = Buffer.alloc(0);

  /**
   * Initialize the IO manager.
   */
  public initialize() {
    process.stdin.on("data", (chunk) => {
      this.onPacketData(chunk);
    });
    process.stdin.resume();
  }

  /**
   * Generate and send something to vscode.
   */
  private writeDapMessage(msg: any) {
    const json: string = JSON.stringify(msg);
    const content: string = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
    process.stdout.write(content);
  }

  /**
   * Send an event to vscode.
   */
  public sendEvent(event: string, body?: any) {
    const e: DapEvent = {
      seq: this.nextPacketCounter++,
      type: 'event',
      event,
      body
    };
    this.writeDapMessage(e);
  }

  /**
   * Send a response from a vscode request.
   */
  public sendResponse(req: DapRequest, success = true, body?: any, message?: string) {
    const res: DapResponse = {
      seq: this.nextPacketCounter++,
      type: 'response',
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
    this.writeDapMessage(res);
  }

  /**
   * Received some packet data from vscode.
   */
  private onPacketData(chunk: Buffer) {
    this.inputBuffer = Buffer.concat([this.inputBuffer, chunk]);

    // several packets can be received
    while (true) {
      const headerEnd = this.inputBuffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }

      const header = this.inputBuffer.slice(0, headerEnd).toString("utf8");
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        // could not get length, stop everything for this packet
        this.inputBuffer = Buffer.alloc(0);
        return;
      }

      const length = parseInt(match[1], 10);
      const total = headerEnd + 4 + length;
      if (this.inputBuffer.length < total) {
        // packet not long enough... wait
        return;
      }

      const body = this.inputBuffer.slice(headerEnd + 4, total).toString("utf8");
      this.inputBuffer = this.inputBuffer.slice(total);

      try {
        const msg = JSON.parse(body);
        this.emit('onDidReceiveMessage', msg);
      } catch {
        // ignore
      }
    }
  }
}