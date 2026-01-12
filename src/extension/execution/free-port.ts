import net from 'net';

export function GetFreePort(): Promise<number | Error> {
  return new Promise(resolve => {
    let server = net.createServer();
    let calledFn = false;

    server.on('error', (err) => {
      server.close();
      if (!calledFn) {
        calledFn = true;
        resolve(err);
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
          resolve(new Error('Unable to get the server\'s given port'));
        }
        else {
          resolve(port);
        }
      }
    });
  });
}