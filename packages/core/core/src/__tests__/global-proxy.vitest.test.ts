import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import Strapi from '../Strapi';

// Minimal DER/X.509 helpers so the test needs no external openssl binary or committed key material
const encodeDerLength = (length: number): Buffer => {
  if (length < 0x80) {
    return Buffer.from([length]);
  }
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining % 256);
    remaining = Math.floor(remaining / 256);
  }
  return Buffer.from([0x80 + bytes.length, ...bytes]);
};

const derNode = (tag: number, content: Buffer): Buffer =>
  Buffer.concat([Buffer.from([tag]), encodeDerLength(content.length), content]);

const derSequence = (...items: Buffer[]) => derNode(0x30, Buffer.concat(items));
const derSet = (...items: Buffer[]) => derNode(0x31, Buffer.concat(items));
const derInteger = (bytes: Buffer) => {
  const normalized = bytes[0] >= 0x80 ? Buffer.concat([Buffer.from([0x00]), bytes]) : bytes;
  return derNode(0x02, normalized);
};
const derBitString = (bytes: Buffer) => derNode(0x03, Buffer.concat([Buffer.from([0x00]), bytes]));
const derOctetString = (bytes: Buffer) => derNode(0x04, bytes);
const derUtf8String = (value: string) => derNode(0x0c, Buffer.from(value, 'utf8'));
const derUtcTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = String(date.getUTCFullYear()).slice(-2);
  const formatted = `${year}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  return derNode(0x17, Buffer.from(formatted, 'ascii'));
};

// OIDs: sha256WithRSAEncryption (1.2.840.113549.1.1.11), commonName (2.5.4.3), subjectAltName (2.5.29.17)
const OID_SHA256_RSA = Buffer.from([
  0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b,
]);
const OID_CN = Buffer.from([0x06, 0x03, 0x55, 0x04, 0x03]);
const OID_SAN = Buffer.from([0x06, 0x03, 0x55, 0x1d, 0x11]);
const OID_BASIC_CONSTRAINTS = Buffer.from([0x06, 0x03, 0x55, 0x1d, 0x13]);
const DER_NULL = Buffer.from([0x05, 0x00]);

const createSelfSignedCert = (hostname: string) => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const spki = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const name = derSequence(derSet(derSequence(OID_CN, derUtf8String(hostname))));
  const sigAlg = derSequence(OID_SHA256_RSA, DER_NULL);

  const extensions = derNode(
    0xa3,
    derSequence(
      derSequence(
        OID_BASIC_CONSTRAINTS,
        Buffer.from([0x01, 0x01, 0xff]),
        derOctetString(derSequence(Buffer.from([0x01, 0x01, 0xff])))
      ),
      derSequence(
        OID_SAN,
        derOctetString(derSequence(derNode(0x82, Buffer.from(hostname, 'ascii'))))
      )
    )
  );

  const tbsCertificate = derSequence(
    derNode(0xa0, derInteger(Buffer.from([0x02]))), // v3
    derInteger(crypto.randomBytes(8)),
    sigAlg,
    name,
    derSequence(derUtcTime(now), derUtcTime(nextWeek)),
    name,
    spki,
    extensions
  );

  const signature = crypto.sign('sha256', tbsCertificate, privateKey);
  const certDer = derSequence(tbsCertificate, sigAlg, derBitString(signature));
  const base64Lines =
    certDer
      .toString('base64')
      .match(/.{1,64}/g)
      ?.join('\n') ?? '';

  return {
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
    cert: `-----BEGIN CERTIFICATE-----\n${base64Lines}\n-----END CERTIFICATE-----\n`,
  };
};

const listen = async (server: net.Server) => {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  return (server.address() as AddressInfo).port;
};

const close = async (server: net.Server) => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
};

describe('Strapi.configureGlobalProxy', () => {
  const { key, cert } = createSelfSignedCert('strapi.test');
  const sniServerNames: Array<string | undefined> = [];
  const receivedUrls: string[] = [];
  const tunnels: string[] = [];
  const sockets = new Set<net.Socket>();

  const origin = https.createServer(
    {
      key,
      cert,
      SNICallback(servername, cb) {
        sniServerNames.push(servername);
        cb(null, undefined);
      },
    },
    (req, res) => {
      receivedUrls.push(req.url ?? '');
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    }
  );

  let originPort = 0;

  const proxy = http.createServer((_req, res) => {
    res.writeHead(405).end();
  });

  proxy.on('connect', (req, socket: net.Socket, head) => {
    tunnels.push(req.url ?? '');
    const upstream = net.connect(originPort, '127.0.0.1', () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    sockets.add(socket).add(upstream);
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
  });

  let proxyUrl = '';

  beforeAll(async () => {
    originPort = await listen(origin);
    proxyUrl = `http://127.0.0.1:${await listen(proxy)}`;
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.destroy());
    await close(proxy);
    await close(origin);
    if ((global as any).GLOBAL_AGENT) {
      (global as any).GLOBAL_AGENT.HTTP_PROXY = '';
      (global as any).GLOBAL_AGENT.HTTPS_PROXY = '';
    }
  });

  it('completes TLS handshake with SNI and TLS options for Node https requests through server.proxy', async () => {
    const configValues: Record<string, unknown> = {
      'server.proxy.global': proxyUrl,
    };

    const services = {
      config: { get: vi.fn((k: string) => configValues[k]) },
      logger: { info: vi.fn() },
    };

    const instance = Object.create(Strapi.prototype) as Strapi;
    Object.assign(instance, {
      get: vi.fn((name: keyof typeof services) => services[name]),
    });

    instance.configureGlobalProxy();

    const response = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
      const req = https.request('https://strapi.test/oauth/token', { ca: cert }, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body });
        });
      });
      req.setTimeout(5000, () => req.destroy(new Error('timeout')));
      req.on('error', reject);
      req.end();
    });

    expect(response).toEqual({ statusCode: 200, body: 'ok' });
    expect(tunnels).toEqual(['strapi.test:443']);
    expect(sniServerNames).toEqual(['strapi.test']);
    expect(receivedUrls).toEqual(['/oauth/token']);
  });
});
