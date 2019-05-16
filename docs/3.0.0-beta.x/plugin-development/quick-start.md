# Quick start

To facilitate the development of a plugin, we drastically reduce the amount of commands necessary to install the entire development environment. Before getting started, you need to have Node.js (v8) and npm (v5) installed.

## Development Environment Setup

Create a development project

1. Create a new project `cd .. && strapi new myDevelopmentProject`.
2. `cd myDevelopmentProject && strapi develop` To start the strapi project

## Plugin development Setup

In a new terminal window:

1. Generate a new plugin: `cd /path/to/myDevelopmentProject && strapi generate:plugin my-plugin`

::: note
The admin panel integration is currently not available. You can still add backend features.
:::
