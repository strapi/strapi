# Strapi CLI UI

A quick hackathon-friendly interface to run common Strapi CLI commands from the browser.

## Usage

1. Install deps: `npm install` (from this folder).
2. Start the server: `npm start` (defaults to port 4000).
3. Open `http://localhost:4000` and click a button to trigger a CLI command.

The server executes commands in the repository root using:

- `node packages/cli/create-strapi/bin/index.js` for project scaffolding and help
- `node packages/cli/cloud/bin/index.js` for Strapi Cloud actions

## Features

- Quick shortcuts for CLI help commands.
- A form that mirrors the Strapi CLI wizard (project name, quickstart/manual, language, package manager, template) and shows the resulting logs once creation finishes.
- A Strapi Cloud deploy form to push a chosen directory with optional env/force/debug/silent flags and view the command output in the same console panel.
