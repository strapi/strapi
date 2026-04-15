#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Runtime auto-detection for docker/podman + compose CLIs.
 *
 * Callers should not know whether the user has docker or podman installed;
 * they just call runCompose(args) / runContainer(args) and this module picks
 * the right binary. Preference order:
 *
 *   Compose:   podman compose > podman-compose > docker compose > docker-compose
 *   Container: podman > docker
 *
 * Override via env var STRAPI_BENCH_RUNTIME=podman|docker if auto-detection
 * picks the wrong one on a mixed-install system.
 */

const { execFileSync, spawnSync } = require('child_process');

function probe(exe, args = ['--version']) {
  const result = spawnSync(exe, args, { stdio: 'ignore' });
  return result.status === 0;
}

function probeSubcommand(exe, sub) {
  // Some binaries (podman/docker) have their compose functionality as a subcommand.
  // `<exe> compose version` exits 0 when the subcommand is available, nonzero otherwise.
  const result = spawnSync(exe, [sub, 'version'], { stdio: 'ignore' });
  return result.status === 0;
}

let detectedCompose = null;
let detectedContainer = null;

function detectCompose() {
  if (detectedCompose) return detectedCompose;

  const override = process.env.STRAPI_BENCH_RUNTIME;
  const tryOrder = [];

  if (override === 'podman') {
    tryOrder.push(['podman', ['compose'], 'podman compose']);
    tryOrder.push(['podman-compose', [], 'podman-compose']);
  } else if (override === 'docker') {
    tryOrder.push(['docker', ['compose'], 'docker compose']);
    tryOrder.push(['docker-compose', [], 'docker-compose']);
  } else {
    // Auto: prefer podman first (user preference)
    tryOrder.push(['podman', ['compose'], 'podman compose']);
    tryOrder.push(['podman-compose', [], 'podman-compose']);
    tryOrder.push(['docker', ['compose'], 'docker compose']);
    tryOrder.push(['docker-compose', [], 'docker-compose']);
  }

  for (const [exe, prefix, label] of tryOrder) {
    const available = prefix.length > 0 ? probeSubcommand(exe, prefix[0]) : probe(exe);
    if (available) {
      detectedCompose = { exe, prefixArgs: prefix, label };
      return detectedCompose;
    }
  }

  throw new Error(
    'No compose runtime found. Install one of: podman (with podman-compose or podman v4+ built-in compose), docker compose, or docker-compose.'
  );
}

function detectContainer() {
  if (detectedContainer) return detectedContainer;

  const override = process.env.STRAPI_BENCH_RUNTIME;
  const tryOrder = override === 'docker' ? ['docker', 'podman'] : ['podman', 'docker'];

  for (const exe of tryOrder) {
    if (probe(exe)) {
      detectedContainer = exe;
      return detectedContainer;
    }
  }

  throw new Error('No container runtime found. Install podman or docker.');
}

/**
 * Run a compose command. Args are appended after the detected prefix.
 *
 *   runCompose(['-f', 'docker-compose.dev.yml', 'up', '-d', 'postgres'], {cwd, env})
 *
 * Returns stdout (utf8). Pass opts.stdio='inherit' to stream to terminal.
 */
function runCompose(args, opts = {}) {
  const { exe, prefixArgs } = detectCompose();
  const finalArgs = [...prefixArgs, ...args];
  return execFileSync(exe, finalArgs, {
    encoding: 'utf8',
    stdio: 'pipe',
    ...opts,
  });
}

/**
 * Run a container command (exec, inspect, ps, etc.) against the detected runtime.
 *
 *   runContainer(['exec', containerId, 'pg_isready'])
 *   runContainer(['inspect', '--format={{.State.Running}}', containerId])
 */
function runContainer(args, opts = {}) {
  const exe = detectContainer();
  return execFileSync(exe, args, {
    encoding: 'utf8',
    stdio: 'pipe',
    ...opts,
  });
}

/**
 * Lower-level accessor — use when you need to build the command yourself
 * (e.g., passing to spawnSync for silent probes).
 */
function getComposeCommand() {
  return detectCompose();
}

function getContainerCommand() {
  return detectContainer();
}

function describeRuntime() {
  const compose = detectCompose();
  const container = detectContainer();
  return `compose: ${compose.label}, container: ${container}`;
}

module.exports = {
  runCompose,
  runContainer,
  getComposeCommand,
  getContainerCommand,
  describeRuntime,
};
