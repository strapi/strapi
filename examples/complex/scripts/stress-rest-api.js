#!/usr/bin/env node
/**
 * Fire many Content API requests against a *running* Strapi (complex example) to generate
 * HTTP / document-service / DB telemetry quickly (e.g. OTLP → Jaeger + collector).
 *
 * Prerequisites
 * ---------------
 * - Strapi already up (e.g. `yarn develop` or `yarn develop:postgres` from this directory).
 * - Public role must allow `api::basic.basic` **find** and **findOne** (and **create** if you
 *   use `--writes`). Run `yarn seed:rest` once against this DB to grant those permissions.
 *
 * Usage (from examples/complex)
 * -----------------------------
 *   yarn stress:rest
 *   yarn stress:rest -- --base http://127.0.0.1:1337/api -n 800 -c 25
 *   STRESS_REST_WRITES=1 yarn stress:rest -- -n 400 -c 10
 *
 * Env (defaults in parentheses)
 * -----------------------------
 *   STRESS_REST_BASE_URL   API root including /api (http://127.0.0.1:1337/api)
 *   STRESS_REST_TOTAL      total requests (300)
 *   STRESS_REST_CONCURRENCY in-flight per batch (15)
 *   STRESS_REST_WRITES     if 1/true, ~10% POST /basics (needs create permission)
 */

function parseArgs(argv) {
  const out = {
    base: process.env.STRESS_REST_BASE_URL || 'http://127.0.0.1:1337/api',
    total: Math.max(1, parseInt(process.env.STRESS_REST_TOTAL || '300', 10) || 300),
    concurrency: Math.max(1, parseInt(process.env.STRESS_REST_CONCURRENCY || '15', 10) || 15),
    writes: process.env.STRESS_REST_WRITES === '1' || process.env.STRESS_REST_WRITES === 'true',
  };

  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '--base' && argv[k + 1]) {
      out.base = argv[++k].replace(/\/+$/, '');
    } else if (a === '-n' && argv[k + 1]) {
      out.total = Math.max(1, parseInt(argv[++k], 10) || out.total);
    } else if (a === '-c' && argv[k + 1]) {
      out.concurrency = Math.max(1, parseInt(argv[++k], 10) || out.concurrency);
    } else if (a === '--writes' || a === '-w') {
      out.writes = true;
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    }
  }

  return out;
}

function normalizeApiBase(raw) {
  let u = raw.trim().replace(/\/+$/, '');
  if (!u.includes('/api')) {
    u = `${u}/api`;
  }
  return u;
}

async function ensureSampleDocument(base, allowWrites) {
  const listUrl = new URL(`${base}/basics`);
  listUrl.searchParams.set('pagination[pageSize]', '1');
  listUrl.searchParams.set('fields[0]', 'documentId');

  const listRes = await fetch(listUrl);
  const listText = await listRes.text();
  if (!listRes.ok) {
    throw new Error(
      `GET ${listUrl.pathname}${listUrl.search} → ${listRes.status}: ${listText.slice(0, 400)}`
    );
  }

  let listJson;
  try {
    listJson = JSON.parse(listText);
  } catch {
    throw new Error(`GET basics: expected JSON, got: ${listText.slice(0, 200)}`);
  }

  const first = Array.isArray(listJson.data) ? listJson.data[0] : null;
  let documentId = first?.documentId ?? first?.id;

  if (!documentId && allowWrites) {
    const label = `stress-${Date.now()}`;
    const createRes = await fetch(`${base}/basics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          stringField: label,
          textField: 'stress-rest-api.js bootstrap',
        },
      }),
    });
    const createText = await createRes.text();
    if (!createRes.ok) {
      throw new Error(
        `POST /basics (bootstrap) → ${createRes.status}: ${createText.slice(0, 400)}\n` +
          'Grant Public **create** on api::basic.basic or run `yarn seed:rest` once.'
      );
    }
    const createJson = JSON.parse(createText);
    documentId = createJson.data?.documentId ?? createJson.data?.id;
  }

  if (!documentId) {
    throw new Error(
      'No Basic documents found. Create one in Admin, or run with `--writes` and Public **create**, ' +
        'or run `yarn seed:rest` once.'
    );
  }

  return documentId;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage: node scripts/stress-rest-api.js [options]

Options:
  --base <url>   API root (default: http://127.0.0.1:1337/api or STRESS_REST_BASE_URL)
  -n <number>    total requests (STRESS_REST_TOTAL, default 300)
  -c <number>    concurrency per batch (STRESS_REST_CONCURRENCY, default 15)
  -w, --writes   include ~10% POST /basics (needs Public create; STRESS_REST_WRITES=1)

Example:
  yarn stress:rest -- --base http://127.0.0.1:1337/api -n 1000 -c 30
`);
    return;
  }

  const base = normalizeApiBase(opts.base);
  console.log(`Target: ${base}`);
  console.log(
    `Plan: ${opts.total} requests, batch concurrency ${opts.concurrency}, writes=${opts.writes}`
  );

  const documentId = await ensureSampleDocument(base, true);
  console.log(`Sample documentId for findOne: ${documentId}`);

  let ok = 0;
  let fail = 0;
  const errors = [];

  async function oneRequest(i) {
    const useWrite = opts.writes && i % 10 === 0;
    try {
      if (useWrite) {
        const res = await fetch(`${base}/basics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              stringField: `stress-${Date.now()}-${i}`,
              textField: 'stress-rest-api.js',
            },
          }),
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`POST ${res.status}: ${text.slice(0, 200)}`);
        }
      } else if (i % 2 === 0) {
        const url = new URL(`${base}/basics`);
        url.searchParams.set('pagination[pageSize]', '10');
        url.searchParams.set('sort', 'createdAt:desc');
        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`GET list ${res.status}: ${text.slice(0, 200)}`);
        }
      } else {
        const url = new URL(`${base}/basics/${documentId}`);
        url.searchParams.set('fields[0]', 'stringField');
        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`GET one ${res.status}: ${text.slice(0, 200)}`);
        }
      }
      ok++;
    } catch (e) {
      fail++;
      if (errors.length < 8) {
        errors.push(String(e.message || e));
      }
    }
  }

  const t0 = Date.now();
  for (let offset = 0; offset < opts.total; offset += opts.concurrency) {
    const batch = [];
    for (let j = 0; j < opts.concurrency && offset + j < opts.total; j++) {
      batch.push(oneRequest(offset + j));
    }
    await Promise.all(batch);
  }
  const ms = Date.now() - t0;

  console.log(`\nDone in ${ms} ms (${(opts.total / (ms / 1000)).toFixed(1)} req/s)`);
  console.log(`OK: ${ok}  FAIL: ${fail}`);
  if (errors.length) {
    console.log('Sample errors:');
    for (const line of errors) {
      console.log(`  - ${line}`);
    }
  }
  if (fail > 0) {
    console.log(
      '\nHint: 403 → run `yarn seed:rest` once (grants Public find/findOne/create on basics).'
    );
    process.exitCode = 1;
  } else {
    console.log('\n✅ Stress run complete — check Jaeger / collector for new traces and metrics.');
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
