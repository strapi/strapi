# Strapi MCP Server Setup Guide

This guide explains how to configure the Strapi MCP (Model Context Protocol) server in Cursor and Claude to enable AI-powered Strapi development workflows.

## What is MCP?

MCP (Model Context Protocol) is a protocol that allows AI assistants like Claude to interact with external tools and services. The Strapi MCP server provides Claude with access to Strapi-specific tools for content management, user administration, API development, and more.

## Prerequisites

- Node.js 20+ installed
- Yarn package manager
- A Strapi project (or clone this repository)
- Cursor IDE or access to Claude

## Quick Start

### 1. Clone and Setup

```bash
# Clone the Strapi repository
git clone https://github.com/strapi/strapi.git
cd strapi

# Install dependencies
yarn install

# Build the project
yarn build

# Navigate to the getstarted example
cd examples/getstarted
```

### 2. Make the MCP Script Executable

```bash
chmod +x start-mcp.sh
```

## Cursor Configuration

### 1. Create MCP Configuration File

Create or edit the MCP configuration file at `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "strapi-mcp": {
      "command": "/path/to/your/strapi/examples/getstarted/start-mcp.sh",
      "description": "Strapi MCP Server with built-in tools"
    }
  }
}
```

**Important:** Replace `/path/to/your/strapi/` with the actual absolute path to your Strapi project.

### 2. Restart Cursor

After saving the configuration file, restart Cursor to load the MCP server.

### 3. Verify Connection

In Cursor, you should now see the Strapi MCP server available. You can test it by asking Claude to perform Strapi-related tasks.

## Claude Configuration

### 1. Access Claude

Open Claude in your browser or preferred interface.

### 2. Configure MCP Server

Claude will automatically detect and use the MCP server configured in Cursor. If you're using Claude outside of Cursor, you'll need to configure the MCP server manually.

### 3. Test the Connection

Ask Claude to perform Strapi-related tasks, such as:

- "List all content types in my Strapi project"
- "Create a new API token for external access"
- "Show me the available routes in my Strapi API"

## Available Tools

The Strapi MCP server provides access to the following tools:

### Content Management

- **Content Types**: List, create, and manage content types
- **Content**: CRUD operations on content entries
- **Media**: Upload and manage media files

### User Management

- **Admin Users**: Manage admin panel users and roles
- **Content API Users**: Manage end users and their permissions
- **API Tokens**: Create and manage API tokens for external access

### Development Tools

- **Routes**: View and manage API routes
- **Policies**: Manage request policies
- **Middlewares**: Configure request middlewares
- **Plugins**: Install and configure plugins

### Database & Configuration

- **Database**: Manage database connections and migrations
- **Configuration**: View and modify Strapi configuration
- **Logs**: Access Strapi application logs

## Configuration Options

### Custom Endpoint

You can customize the MCP server endpoint by modifying the `start-mcp.sh` script:

```bash
# Default endpoint
yarn strapi mcp --endpoint http://localhost:4001/mcp

# Custom endpoint
yarn strapi mcp --endpoint http://localhost:3000/mcp
```

### Environment Variables

Set environment variables in your shell or create a `.env` file:

```bash
export STRAPI_MCP_PORT=4001
export STRAPI_MCP_HOST=localhost
```

## Troubleshooting

### Common Issues

#### 1. Permission Denied

```bash
chmod +x start-mcp.sh
```

#### 2. Node.js Version Mismatch

Ensure you're using Node.js 20+:

```bash
node --version
nvm use 20  # if using nvm
```

#### 3. MCP Server Not Starting

Check if the port is already in use:

```bash
lsof -i :4001
```

#### 4. Path Issues

Ensure the absolute path in `~/.cursor/mcp.json` is correct and the script exists.

#### 5. Yarn Issues

Make sure dependencies are installed:

```bash
yarn install
yarn build
```

### Debug Mode

Enable debug logging by modifying the start script:

```bash
# Add debug flag
yarn strapi mcp --endpoint http://localhost:4001/mcp --debug
```

### Logs

Check Strapi logs for MCP-related errors:

```bash
yarn strapi logs
```

## Advanced Configuration

### Multiple MCP Servers

You can configure multiple MCP servers for different Strapi projects:

```json
{
  "mcpServers": {
    "strapi-dev": {
      "command": "/path/to/dev/project/start-mcp.sh",
      "description": "Development Strapi MCP Server"
    },
    "strapi-prod": {
      "command": "/path/to/prod/project/start-mcp.sh",
      "description": "Production Strapi MCP Server"
    }
  }
}
```

### Custom Scripts

Create custom startup scripts for different environments:

```bash
#!/bin/bash
# start-mcp-dev.sh
export NODE_ENV=development
export STRAPI_MCP_PORT=4001
yarn strapi mcp --endpoint http://localhost:4001/mcp
```

```bash
#!/bin/bash
# start-mcp-prod.sh
export NODE_ENV=production
export STRAPI_MCP_PORT=4002
yarn strapi mcp --endpoint http://localhost:4002/mcp
```

## Security Considerations

- **API Tokens**: Never commit API tokens to version control
- **Permissions**: Use minimal required permissions for MCP operations
- **Network**: Consider using localhost for development environments
- **Authentication**: Ensure proper authentication is configured in Strapi

## Examples

### Basic Usage

1. **List Content Types**

   ```
   "Show me all content types in my Strapi project"
   ```

2. **Create API Token**

   ```
   "Create a new API token with read-only permissions for articles"
   ```

3. **View Routes**

   ```
   "List all available API routes in my Strapi project"
   ```

4. **User Management**
   ```
   "Create a new admin user with editor role"
   ```

## Support

- **Documentation**: [Strapi Documentation](https://docs.strapi.io/)
- **GitHub**: [Strapi Repository](https://github.com/strapi/strapi)
- **Community**: [Strapi Community](https://forum.strapi.io/)

## Contributing

To contribute to the MCP server implementation:

1. Fork the Strapi repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
