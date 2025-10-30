import { createCommand } from 'commander';
import { request } from 'http';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import type { StrapiCommand } from '../types';

const debugLogPath = path.join(process.cwd(), 'strapi-mcp-debug.log');
fs.appendFileSync(debugLogPath, `[strapi-mcp-proxy] Debug: process.cwd() = ${process.cwd()}\n`);
fs.appendFileSync(
  debugLogPath,
  `[strapi-mcp-proxy] Debug: process.env = ${JSON.stringify(process.env, null, 2)}\n`
);
const DEFAULT_ENDPOINT = process.env.MCP_ENDPOINT || 'http://localhost:4001/mcp';

const makeRequest = (endpoint: string, body: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const req = request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            fs.appendFileSync(
              debugLogPath,
              `[strapi-mcp-proxy] Debug: HTTP response for ${endpoint}: ${data}\n`
            );
          } catch {}
          resolve(data);
        });
      }
    );

    req.on('error', (err) => {
      try {
        fs.appendFileSync(
          debugLogPath,
          `[strapi-mcp-proxy] Debug: HTTP error for ${endpoint}: ${err?.message || err}\n`
        );
      } catch {}
      reject(err);
    });

    try {
      fs.appendFileSync(
        debugLogPath,
        `[strapi-mcp-proxy] Debug: HTTP request to ${endpoint}: ${body}\n`
      );
    } catch {}
    req.write(body);
    req.end();
  });
};

const action = async (opts: { endpoint?: string }) => {
  const endpoint = opts.endpoint || process.env.MCP_ENDPOINT || DEFAULT_ENDPOINT;
  process.stdin.setEncoding('utf8');
  let buffer = '';

  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) {
        try {
          try {
            fs.appendFileSync(
              debugLogPath,
              `[strapi-mcp-proxy] Debug: STDIN -> HTTP: ${line.trim()}\n`
            );
          } catch {}
          const response = await makeRequest(endpoint, line.trim());
          try {
            fs.appendFileSync(
              debugLogPath,
              `[strapi-mcp-proxy] Debug: HTTP -> STDOUT: ${response}\n`
            );
          } catch {}
          // Only write if there is a non-empty JSON body (notifications yield 204/empty)
          if (response && response.trim().length > 0) {
            process.stdout.write(`${response}\n`);
          }
        } catch (err: any) {
          process.stderr.write(`[strapi-mcp-proxy] Error: ${err?.message || err}\n`);
        }
      }
    }
  });
  process.stdin.on('end', () => process.exit(0));
};

/**
 * `$ strapi mcp`
 */
const command: StrapiCommand = () => {
  return createCommand('mcp')
    .description('Proxy stdin/stdout to a running Strapi MCP HTTP server for AI desktop clients')
    .option(
      '--endpoint <url>',
      'MCP HTTP endpoint (default: http://localhost:4001/mcp or MCP_ENDPOINT env)'
    )
    .action(action);
};

export { command };
