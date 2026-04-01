import net from 'net';

/**
 * Minimal SMTP listener for tests (plain socket, no TLS / STARTTLS).
 * Captures MAIL FROM, RCPT TO, and DATA for assertions.
 */
export class MinimalSmtpServer {
  private server: net.Server;

  private _port = 0;

  private readonly bindHost = '127.0.0.1';

  lastMailFrom: string | null = null;

  lastRcptTo: string[] = [];

  lastData: string | null = null;

  sessions = 0;

  constructor() {
    this.server = net.createServer((socket) => this.handleConnection(socket));
  }

  async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(0, this.bindHost, () => {
        const addr = this.server.address();
        if (addr && typeof addr === 'object') {
          this._port = addr.port;
        }
        resolve();
      });
      this.server.once('error', reject);
    });
  }

  get port(): number {
    return this._port;
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private handleConnection(socket: net.Socket): void {
    this.sessions += 1;

    let lineBuffer = '';
    let phase: 'cmd' | 'data' = 'cmd';
    let dataBuffer = '';
    const rcpt: string[] = [];
    let mailFrom = '';

    const write = (line: string) => {
      socket.write(`${line}\r\n`);
    };

    const tryFinishData = () => {
      const term = '\r\n.\r\n';
      const idx = dataBuffer.indexOf(term);
      if (idx === -1) {
        return;
      }
      const payload = dataBuffer.slice(0, idx);
      this.lastMailFrom = mailFrom;
      this.lastRcptTo = [...rcpt];
      this.lastData = payload;
      write('250 OK: queued as test');
      phase = 'cmd';
      rcpt.length = 0;
      mailFrom = '';
      dataBuffer = '';
      lineBuffer = '';
    };

    write('220 test-smtp ESMTP ready');

    const processLine = (line: string) => {
      const upper = line.toUpperCase();

      if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
        write('250-test-smtp Hello');
        write('250 OK');
        return;
      }

      if (upper.startsWith('MAIL FROM')) {
        const m = /MAIL FROM:\s*<([^>]+)>/i.exec(line);
        mailFrom = m
          ? m[1]
          : line
              .replace(/^MAIL FROM:\s*/i, '')
              .replace(/[<>]/g, '')
              .trim();
        write('250 OK');
        return;
      }

      if (upper.startsWith('RCPT TO')) {
        const m = /RCPT TO:\s*<([^>]+)>/i.exec(line);
        const addr = m
          ? m[1]
          : line
              .replace(/^RCPT TO:\s*/i, '')
              .replace(/[<>]/g, '')
              .trim();
        rcpt.push(addr);
        write('250 OK');
        return;
      }

      if (upper.startsWith('DATA')) {
        if (rcpt.length === 0) {
          write('503 Bad sequence of commands');
          return;
        }
        write('354 Start mail input; end with <CRLF>.<CRLF>');
        phase = 'data';
        dataBuffer = '';
        return;
      }

      if (upper.startsWith('QUIT')) {
        write('221 Bye');
        socket.end();
      }
    };

    socket.on('data', (chunk) => {
      if (phase === 'data') {
        dataBuffer += chunk.toString('binary');
        tryFinishData();
        return;
      }

      lineBuffer += chunk.toString('utf8');
      let lineEnd = lineBuffer.indexOf('\r\n');
      while (lineEnd >= 0) {
        const line = lineBuffer.slice(0, lineEnd);
        lineBuffer = lineBuffer.slice(lineEnd + 2);
        lineEnd = lineBuffer.indexOf('\r\n');

        const isData = line.toUpperCase() === 'DATA';
        processLine(line);

        if (isData && phase === 'data') {
          dataBuffer += lineBuffer;
          lineBuffer = '';
          tryFinishData();
          break;
        }
      }
    });
  }
}
