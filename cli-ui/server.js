const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

const STRAPI_CLI = ['node', 'packages/cli/create-strapi/bin/index.js'];
const CLOUD_CLI = ['node', 'packages/cli/cloud/bin/index.js'];

const COMMANDS = {
  help: {
    label: 'Show Strapi creator help',
    command: [...STRAPI_CLI, '--help'],
  },
  quickstartHelp: {
    label: 'Show quickstart help',
    command: [...STRAPI_CLI, 'my-project', '--help'],
  },
  cloudHelp: {
    label: 'Strapi Cloud help',
    command: [...CLOUD_CLI, '--help'],
  },
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const runSpawn = ({ command, cwd = path.resolve(__dirname, '..') }) =>
  new Promise((resolve) => {
    const [cmd, ...args] = command;
    const child = spawn(cmd, args, { cwd, shell: false });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
        command: command.join(' '),
      });
    });
  });

app.get('/api/commands', (req, res) => {
  const items = Object.entries(COMMANDS).map(([id, { label, command }]) => ({
    id,
    label,
    command: command.join(' '),
  }));
  res.json({ commands: items });
});

app.post('/api/run', async (req, res) => {
  const { id } = req.body || {};
  const entry = COMMANDS[id];

  if (!entry) {
    return res.status(400).json({ error: 'Unknown command' });
  }

  const result = await runSpawn({ command: entry.command });
  res.json(result);
});

app.post('/api/create', async (req, res) => {
  const {
    projectName,
    quickstart = true,
    language = 'javascript',
    packageManager = 'npm',
    template,
  } = req.body || {};

  if (!projectName) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const args = [projectName];
  if (quickstart) {
    args.push('--quickstart');
  }

  if (language === 'typescript' || language === 'ts') {
    args.push('--typescript');
  }

  if (packageManager === 'yarn') {
    args.push('--use-yarn');
  } else if (packageManager === 'pnpm') {
    args.push('--use-pnpm');
  } else {
    args.push('--use-npm');
  }

  if (template) {
    args.push('--template', template);
  }

  const command = [...STRAPI_CLI, ...args];
  const result = await runSpawn({ command });
  res.json(result);
});

app.post('/api/deploy', async (req, res) => {
  const {
    cwd = path.resolve(__dirname, '..'),
    environment,
    force = false,
    silent = false,
    debug = false,
  } = req.body || {};

  const args = ['cloud:deploy'];

  if (environment) {
    args.push('--env', environment);
  }

  if (force) {
    args.push('--force');
  }

  if (silent) {
    args.push('--silent');
  }

  if (debug) {
    args.push('--debug');
  }

  const command = [...CLOUD_CLI, ...args];
  const result = await runSpawn({ command, cwd });
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`CLI UI listening on http://localhost:${PORT}`);
});
