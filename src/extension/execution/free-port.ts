import net from 'net';
import { Services } from '../services';

export function GetFreePort(): Promise<number | null> {
  return new Promise(resolve => {
    let server = net.createServer();
    let calledFn = false;

    server.on('error', (err: Error) => {
      server.close();
      if (!calledFn) {
        calledFn = true;
        Services.Logger.error(`Could not find a port for PGM runtime: ${err}`);
        resolve(null);
      }
    });

    server.listen(0, () => {
      const address = server?.address();
      let port = null;
      if (typeof address !== 'string' && address !== null) {
        port = address.port;
      }
      server.close();

      if (!calledFn) {
        calledFn = true;
        if (!port) {
          resolve(null);
        }
        else {
          resolve(port);
        }
      }
    });
  });
}