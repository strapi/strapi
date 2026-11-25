// Minimal Nx self-hosted remote cache (https://nx.dev/recipes/running-tasks/self-hosted-caching)
// backed by a plain directory that `actions/cache` restores and saves between runs.
//
// Why: since Nx 21 the local cache is a database keyed by machine id, so a `.nx/cache` folder
// restored from another runner is ignored ("Unrecognized Cache Artifacts"). Nx does trust
// artifacts it downloads from a remote cache, so we serve the restored folder as one.
//
// Only pushes save the folder (see action.yml), so a pull request can read the cache but can never
// write an artifact another run will consume.
//
// Usage: node nx-cache-server.mjs <dir> <port>
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';

const [dir = '.nx/remote-cache', port = '4555'] = process.argv.slice(2);
const token = process.env.NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN;

const root = resolve(dir);
mkdirSync(root, { recursive: true });

const server = createServer(async (req, res) => {
  const match = /^\/v1\/cache\/([A-Za-z0-9]+)$/.exec(req.url ?? '');

  if (match === null) {
    res.writeHead(404).end();
    return;
  }

  if (token !== undefined && req.headers.authorization !== `Bearer ${token}`) {
    res.writeHead(401).end();
    return;
  }

  const file = resolve(root, match[1]);
  if (file.startsWith(root + sep) === false) {
    res.writeHead(400).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      if (existsSync(file) === false) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': statSync(file).size,
      });
      await pipeline(createReadStream(file), res);
      return;
    }

    if (req.method === 'PUT') {
      if (existsSync(file)) {
        // The spec answers 409 when an entry already exists; hashes are content-addressed.
        req.resume();
        res.writeHead(409).end();
        return;
      }
      const tmp = `${file}.${process.pid}.tmp`;
      await pipeline(req, createWriteStream(tmp));
      renameSync(tmp, file);
      res.writeHead(200).end();
      return;
    }

    res.writeHead(405).end();
  } catch (error) {
    console.error(error);
    if (res.headersSent === false) {
      res.writeHead(500);
    }
    res.end();
  }
});

server.listen(Number(port), '127.0.0.1', () => {
  console.log(`Nx cache server listening on http://127.0.0.1:${port}, serving ${dir}`);
});
