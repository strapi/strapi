#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const COMPLEX_DIR = path.resolve(SCRIPT_DIR, '..');
const MONOREPO_ROOT = path.resolve(COMPLEX_DIR, '../..');
const V4_PROJECT_DIR = path.resolve(MONOREPO_ROOT, '..', 'complex-v4');

// From v4 project, find docker-compose file (could be in parent strapi-v5 or current dir)
function findDockerComposeFile(v4ProjectDir) {
  // Try parent directory (strapi-v5)
  const parentDockerCompose = path.resolve(
    v4ProjectDir,
    '..',
    'strapi-v5',
    'docker-compose.dev.yml'
  );
  if (fs.existsSync(parentDockerCompose)) {
    return parentDockerCompose;
  }
  // Try current directory
  const currentDockerCompose = path.resolve(v4ProjectDir, 'docker-compose.dev.yml');
  if (fs.existsSync(currentDockerCompose)) {
    return currentDockerCompose;
  }
  // Return default location
  return parentDockerCompose;
}

const CONTENT_TYPES = [
  'basic',
  'basic-dp',
  'basic-dp-i18n',
  'relation',
  'relation-dp',
  'relation-dp-i18n',
];

const I18N_CONTENT_TYPES = ['basic-dp-i18n', 'relation-dp-i18n'];

console.log('Setting up Strapi v4 project at:', V4_PROJECT_DIR);
console.log('⚠️  Note: This will overwrite existing files in the v4 project.\n');

// Ensure the v4 project directory exists
if (!fs.existsSync(V4_PROJECT_DIR)) {
  fs.mkdirSync(V4_PROJECT_DIR, { recursive: true });
  console.log('Created v4 project directory');
}

// Write package.json (always overwrite completely)
const packageJson = {
  name: 'complex-v4',
  version: '0.0.0',
  private: true,
  description: 'A Strapi v4 application with complex schemas',
  scripts: {
    build: 'strapi build',
    console: 'strapi console',
    deploy: 'strapi deploy',
    dev: 'strapi develop',
    develop: 'strapi develop',
    start: 'strapi start',
    strapi: 'strapi',
    upgrade: 'npx @strapi/upgrade latest',
    'upgrade:dry': 'npx @strapi/upgrade latest --dry',
    'develop:postgres': 'node scripts/develop-with-db.js postgres',
    'develop:mariadb': 'node scripts/develop-with-db.js mariadb',
    'develop:sqlite': 'node scripts/develop-with-db.js sqlite',
    'seed:sqlite': 'node scripts/seed-with-db.js sqlite',
    'seed:postgres': 'node scripts/seed-with-db.js postgres',
    'seed:mariadb': 'node scripts/seed-with-db.js mariadb',
  },
  dependencies: {
    '@strapi/plugin-i18n': '4.26.0',
    '@strapi/plugin-users-permissions': '4.26.0',
    '@strapi/strapi': '4.26.0',
    'better-sqlite3': '8.6.0',
    entities: '2.2.0',
    mysql2: '^3.6.0',
    pg: '^8.11.0',
    react: '^18.0.0',
    'react-dom': '^18.0.0',
    'react-is': '^18.0.0',
    'react-router-dom': '5.3.4',
    'styled-components': '5.3.3',
  },
  devDependencies: {
    '@types/react': '^18.0.0',
    '@types/react-dom': '^18.0.0',
  },
  engines: {
    node: '>=18.0.0 <=20.x.x',
    npm: '>=6.0.0',
  },
  strapi: {
    uuid: 'complex-v4',
  },
  isStrapiMonorepo: false,
};

fs.writeFileSync(
  path.join(V4_PROJECT_DIR, 'package.json'),
  JSON.stringify(packageJson, null, 2) + '\n'
);
console.log('✅ Created/updated package.json');

// Create config directory
const configDir = path.join(V4_PROJECT_DIR, 'config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Write database.js
const databaseConfig = `'use strict';
const path = require('path');

module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  if (client === 'sqlite') {
    return {
      connection: {
        client: 'sqlite',
        connection: {
          filename: env(
            'DATABASE_FILENAME',
            path.join(__dirname, '..', '.tmp', 'data.db')
          ),
        },
        useNullAsDefault: true,
      },
    };
  }

  if (client === 'postgres') {
    return {
      connection: {
        client: 'postgres',
        connection: {
          host: env('DATABASE_HOST', 'localhost'),
          port: env.int('DATABASE_PORT', 15432),
          database: env('DATABASE_NAME', 'strapi'),
          user: env('DATABASE_USERNAME', 'strapi'),
          password: env('DATABASE_PASSWORD', 'strapi'),
          ssl: env.bool('DATABASE_SSL', false)
            ? { rejectUnauthorized: false }
            : false,
        },
      },
    };
  }

  return {
    connection: {
      client: 'mysql2',
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 13306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) || undefined,
      },
    },
  };
};
`;

fs.writeFileSync(path.join(configDir, 'database.js'), databaseConfig);

// Write plugins.js with i18n support
const pluginsConfig = `'use strict';

module.exports = {
  i18n: {
    enabled: true,
    config: {
      defaultLocale: 'en',
      locales: ['en'],
    },
  },
};
`;

fs.writeFileSync(path.join(configDir, 'plugins.js'), pluginsConfig);

// Write server.js
const serverConfig = `'use strict';

module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
`;

fs.writeFileSync(path.join(configDir, 'server.js'), serverConfig);

// Write admin.js
const adminConfig = `'use strict';

module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
});
`;

fs.writeFileSync(path.join(configDir, 'admin.js'), adminConfig);

// Write api.js
const apiConfig = `'use strict';

module.exports = {
  rest: {
    defaultLimit: 25,
    maxLimit: 100,
    withCount: true,
  },
};
`;

fs.writeFileSync(path.join(configDir, 'api.js'), apiConfig);

// Write middlewares.js
const middlewaresConfig = `'use strict';

module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'dl.airtable.com',
            'market-assets.strapi.io',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'dl.airtable.com',
            'market-assets.strapi.io',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
`;

fs.writeFileSync(path.join(configDir, 'middlewares.js'), middlewaresConfig);

// Create src directory structure
const srcDir = path.join(V4_PROJECT_DIR, 'src');
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

// Write src/index.js
const indexJs = `'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
`;

fs.writeFileSync(path.join(srcDir, 'index.js'), indexJs);

// Write src/admin/app.js
const adminAppJs = `const config = {
  locales: [],
};

const bootstrap = (app) => {
  console.log(app);
};

module.exports = {
  config,
  bootstrap,
};
`;

const adminDir = path.join(srcDir, 'admin');
if (!fs.existsSync(adminDir)) {
  fs.mkdirSync(adminDir, { recursive: true });
}
fs.writeFileSync(path.join(adminDir, 'app.js'), adminAppJs);

// Copy content types
const apiDir = path.join(srcDir, 'api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

CONTENT_TYPES.forEach((contentType) => {
  const contentTypeDir = path.join(apiDir, contentType);
  if (!fs.existsSync(contentTypeDir)) {
    fs.mkdirSync(contentTypeDir, { recursive: true });
  }

  // Copy schema (remove polymorphic relations for v4 compatibility)
  const schemaSource = path.join(
    COMPLEX_DIR,
    'src',
    'api',
    contentType,
    'content-types',
    contentType,
    'schema.json'
  );
  const schemaDest = path.join(contentTypeDir, 'content-types', contentType, 'schema.json');

  if (fs.existsSync(schemaSource)) {
    const schemaDir = path.dirname(schemaDest);
    if (!fs.existsSync(schemaDir)) {
      fs.mkdirSync(schemaDir, { recursive: true });
    }

    // Read and modify schema to remove problematic polymorphic relations
    const schema = JSON.parse(fs.readFileSync(schemaSource, 'utf8'));
    if (schema.attributes) {
      // Remove polymorphic relations that cause issues in v4
      delete schema.attributes.morphToOne;
      delete schema.attributes.morphOne;
      delete schema.attributes.morphMany;
    }

    fs.writeFileSync(schemaDest, JSON.stringify(schema, null, 2) + '\n');
    console.log(`Copied schema for ${contentType} (removed polymorphic relations)`);
  }

  // Create controller
  const controllerJs = `'use strict';

/**
 * ${contentType} controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::${contentType}.${contentType}');
`;

  const controllersDir = path.join(contentTypeDir, 'controllers');
  if (!fs.existsSync(controllersDir)) {
    fs.mkdirSync(controllersDir, { recursive: true });
  }
  fs.writeFileSync(path.join(controllersDir, `${contentType}.js`), controllerJs);

  // Create routes
  const routesJs = `'use strict';

/**
 * ${contentType} router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::${contentType}.${contentType}');
`;

  const routesDir = path.join(contentTypeDir, 'routes');
  if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir, { recursive: true });
  }
  fs.writeFileSync(path.join(routesDir, `${contentType}.js`), routesJs);

  // Create service
  const serviceJs = `'use strict';

/**
 * ${contentType} service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::${contentType}.${contentType}');
`;

  const servicesDir = path.join(contentTypeDir, 'services');
  if (!fs.existsSync(servicesDir)) {
    fs.mkdirSync(servicesDir, { recursive: true });
  }
  fs.writeFileSync(path.join(servicesDir, `${contentType}.js`), serviceJs);
});

// Copy components
const componentsSourceDir = path.join(COMPLEX_DIR, 'src', 'components');
const componentsDestDir = path.join(srcDir, 'components');

if (fs.existsSync(componentsSourceDir)) {
  function copyRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  copyRecursive(componentsSourceDir, componentsDestDir);
  console.log('Copied components');
}

// Create public directory structure
const publicDir = path.join(V4_PROJECT_DIR, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const publicUploadsDir = path.join(publicDir, 'uploads');
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}

// Create .gitkeep in uploads to ensure directory exists
fs.writeFileSync(path.join(publicUploadsDir, '.gitkeep'), '');

// Create robots.txt
const robotsTxt = `User-agent: *
Disallow: /
`;
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);

// Create .gitignore
const gitignore = `node_modules
.tmp
.cache
build
dist
.env
.env.local
.env.*.local
*.log
.DS_Store
`;

fs.writeFileSync(path.join(V4_PROJECT_DIR, '.gitignore'), gitignore);

// Create .env.example
const envExample = `HOST=0.0.0.0
PORT=1337
APP_KEYS=toBeModified1,toBeModified2,toBeModified3,toBeModified4
API_TOKEN_SALT=toBeModified
ADMIN_JWT_SECRET=toBeModified
TRANSFER_TOKEN_SALT=toBeModified
JWT_SECRET=toBeModified

# Database
DATABASE_CLIENT=sqlite
# DATABASE_CLIENT=postgres
# DATABASE_HOST=localhost
# DATABASE_PORT=15432
# DATABASE_NAME=strapi
# DATABASE_USERNAME=strapi
# DATABASE_PASSWORD=strapi
# DATABASE_SSL=false
# DATABASE_CLIENT=mysql
# DATABASE_PORT=13306
`;

fs.writeFileSync(path.join(V4_PROJECT_DIR, '.env.example'), envExample);

// Copy .env.example to .env (always overwrite)
const envPath = path.join(V4_PROJECT_DIR, '.env');
fs.copyFileSync(path.join(V4_PROJECT_DIR, '.env.example'), envPath);
console.log('✅ Created/updated .env file from .env.example');

// Create scripts directory
const v4ScriptsDir = path.join(V4_PROJECT_DIR, 'scripts');
if (!fs.existsSync(v4ScriptsDir)) {
  fs.mkdirSync(v4ScriptsDir, { recursive: true });
}

// Create develop-with-db.js script for v4 project
const dockerComposePath = findDockerComposeFile(V4_PROJECT_DIR);
const developWithDbScript = `#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_DIR = path.resolve(__dirname, '..');
const DOCKER_COMPOSE_FILE = '${dockerComposePath.replace(/\\/g, '/')}';

const dbType = process.argv[2];

if (!dbType || !['postgres', 'mariadb', 'sqlite'].includes(dbType)) {
  console.error('Error: Database type is required');
  console.error('Usage: node scripts/develop-with-db.js <postgres|mariadb|sqlite>');
  process.exit(1);
}

// Check if container is running
function isContainerRunning(serviceName) {
  try {
    const output = execSync(
      \`docker-compose -f \${DOCKER_COMPOSE_FILE} ps -q \${serviceName}\`,
      { encoding: 'utf8', stdio: 'pipe', cwd: PROJECT_DIR }
    ).trim();
    if (!output) return false;
    
    const status = execSync(
      \`docker inspect --format='{{.State.Running}}' \${output.split('\\n')[0]}\`,
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    return status === 'true';
  } catch (error) {
    return false;
  }
}

// Start container if not running
function ensureContainerRunning(serviceName) {
  if (isContainerRunning(serviceName)) {
    console.log(\`✅ \${serviceName} container is already running\`);
    return;
  }
  
  console.log(\`Starting \${serviceName} container...\`);
  try {
    execSync(\`docker-compose -f \${DOCKER_COMPOSE_FILE} up -d \${serviceName}\`, {
      cwd: PROJECT_DIR,
      stdio: 'inherit',
    });
    console.log(\`✅ \${serviceName} container started\`);
    
    // Wait a bit for the database to be ready
    if (dbType === 'postgres' || dbType === 'mariadb') {
      console.log('Waiting for database to be ready...');
      const start = Date.now();
      while (Date.now() - start < 3000) {
        // Blocking wait
      }
    }
  } catch (error) {
    console.error(\`Error starting \${serviceName} container: \${error.message}\`);
    process.exit(1);
  }
}

// Set up environment variables based on database type
function getEnvVars() {
  const env = { ...process.env };
  
  switch (dbType) {
    case 'postgres':
      env.DATABASE_CLIENT = 'postgres';
      env.DATABASE_HOST = 'localhost';
      env.DATABASE_PORT = '15432';
      env.DATABASE_NAME = 'strapi';
      env.DATABASE_USERNAME = 'strapi';
      env.DATABASE_PASSWORD = 'strapi';
      env.DATABASE_SSL = 'false';
      break;
      
    case 'mariadb':
      env.DATABASE_CLIENT = 'mysql';
      env.DATABASE_HOST = 'localhost';
      env.DATABASE_PORT = '13306';
      env.DATABASE_NAME = 'strapi';
      env.DATABASE_USERNAME = 'strapi';
      env.DATABASE_PASSWORD = 'strapi';
      env.DATABASE_SSL = 'false';
      break;
      
    case 'sqlite':
      env.DATABASE_CLIENT = 'sqlite';
      break;
  }
  
  return env;
}

// Start Strapi develop
function startStrapi() {
  if (dbType === 'postgres') {
    ensureContainerRunning('postgres');
  } else if (dbType === 'mariadb') {
    ensureContainerRunning('mysql');
  }
  
  const env = getEnvVars();
  
  console.log(\`\\n🚀 Starting Strapi with \${dbType} database...\\n\`);
  
  // Spawn strapi develop process
  const isWindows = process.platform === 'win32';
  const strapiProcess = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'develop'], {
    cwd: PROJECT_DIR,
    env,
    stdio: 'inherit',
    shell: !isWindows,
  });
  
  // Handle process termination
  let isShuttingDown = false;
  
  const cleanup = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log('\\n\\n⏹️  Stopping Strapi server (database container will keep running)...');
    strapiProcess.kill('SIGINT');
    
    strapiProcess.on('exit', () => {
      process.exit(0);
    });
    
    setTimeout(() => {
      if (!strapiProcess.killed) {
        strapiProcess.kill('SIGKILL');
        process.exit(0);
      }
    }, 5000);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  strapiProcess.on('exit', (code) => {
    if (!isShuttingDown) {
      process.exit(code || 0);
    }
  });
  
  strapiProcess.on('error', (error) => {
    console.error('Error starting Strapi:', error);
    process.exit(1);
  });
}

startStrapi();
`;

fs.writeFileSync(path.join(v4ScriptsDir, 'develop-with-db.js'), developWithDbScript);
// Make it executable
try {
  fs.chmodSync(path.join(v4ScriptsDir, 'develop-with-db.js'), 0o755);
} catch (error) {
  // chmod might fail on Windows, that's okay
}

console.log('✅ Created database development scripts');

// Copy seed script (always overwrite)
const seedScriptSource = path.join(SCRIPT_DIR, 'seed-v4-template.js');
const seedScriptDest = path.join(v4ScriptsDir, 'seed.js');
fs.copyFileSync(seedScriptSource, seedScriptDest);
try {
  fs.chmodSync(seedScriptDest, 0o755);
} catch (error) {
  // chmod might fail on Windows, that's okay
}
console.log('✅ Created/updated seed script');

// Create seed-with-db.js wrapper script
const seedWithDbScript = `#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const DOCKER_COMPOSE_FILE = '${dockerComposePath.replace(/\\/g, '\\\\')}';

const dbType = process.argv[2];
const multiplier = process.argv[3] || '1';

if (!dbType || !['postgres', 'mariadb', 'sqlite'].includes(dbType)) {
  console.error('Error: Database type is required');
  console.error('Usage: node scripts/seed-with-db.js <postgres|mariadb|sqlite> [multiplier]');
  process.exit(1);
}

// Check if container is running
function isContainerRunning(serviceName) {
  try {
    const output = execSync(
      \`docker-compose -f \${DOCKER_COMPOSE_FILE} ps -q \${serviceName}\`,
      { encoding: 'utf8', stdio: 'pipe', cwd: PROJECT_DIR }
    ).trim();
    if (!output) return false;
    
    const status = execSync(
      \`docker inspect --format='{{.State.Running}}' \${output.split('\\n')[0]}\`,
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    return status === 'true';
  } catch (error) {
    return false;
  }
}

// Start container if not running
function ensureContainerRunning(serviceName) {
  if (isContainerRunning(serviceName)) {
    console.log(\`✅ \${serviceName} container is already running\`);
    return;
  }
  
  console.log(\`Starting \${serviceName} container...\`);
  try {
    execSync(\`docker-compose -f \${DOCKER_COMPOSE_FILE} up -d \${serviceName}\`, {
      cwd: PROJECT_DIR,
      stdio: 'inherit',
    });
    console.log(\`✅ \${serviceName} container started\`);
    
    // Wait a bit for the database to be ready
    if (dbType === 'postgres' || dbType === 'mariadb') {
      console.log('Waiting for database to be ready...');
      const start = Date.now();
      while (Date.now() - start < 3000) {
        // Blocking wait
      }
    }
  } catch (error) {
    console.error(\`Error starting \${serviceName} container: \${error.message}\`);
    process.exit(1);
  }
}

// Set up environment variables based on database type
function getEnvVars() {
  const env = { ...process.env };
  
  switch (dbType) {
    case 'postgres':
      env.DATABASE_CLIENT = 'postgres';
      env.DATABASE_HOST = 'localhost';
      env.DATABASE_PORT = '15432';
      env.DATABASE_NAME = 'strapi';
      env.DATABASE_USERNAME = 'strapi';
      env.DATABASE_PASSWORD = 'strapi';
      env.DATABASE_SSL = 'false';
      break;
      
    case 'mariadb':
      env.DATABASE_CLIENT = 'mysql';
      env.DATABASE_HOST = 'localhost';
      env.DATABASE_PORT = '13306';
      env.DATABASE_NAME = 'strapi';
      env.DATABASE_USERNAME = 'strapi';
      env.DATABASE_PASSWORD = 'strapi';
      env.DATABASE_SSL = 'false';
      break;
      
    case 'sqlite':
      env.DATABASE_CLIENT = 'sqlite';
      break;
  }
  
  return env;
}

// Run seed script
function runSeed() {
  if (dbType === 'postgres') {
    ensureContainerRunning('postgres');
  } else if (dbType === 'mariadb') {
    ensureContainerRunning('mysql');
  }
  
  const env = getEnvVars();
  
  console.log(\`\\n🌱 Seeding database (\${dbType}) with multiplier: \${multiplier}...\\n\`);
  
  // Spawn seed script process
  const isWindows = process.platform === 'win32';
  const seedProcess = spawn(isWindows ? 'node.exe' : 'node', ['scripts/seed.js', multiplier], {
    cwd: PROJECT_DIR,
    env,
    stdio: 'inherit',
    shell: !isWindows,
  });
  
  seedProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
  
  seedProcess.on('error', (error) => {
    console.error('Error running seed script:', error);
    process.exit(1);
  });
}

runSeed();
`;

fs.writeFileSync(path.join(v4ScriptsDir, 'seed-with-db.js'), seedWithDbScript);
try {
  fs.chmodSync(path.join(v4ScriptsDir, 'seed-with-db.js'), 0o755);
} catch (error) {
  // chmod might fail on Windows, that's okay
}
console.log('✅ Created/updated seed-with-db.js wrapper script');

console.log('\n✅ V4 project structure created successfully!');
console.log(`\nProject location: ${V4_PROJECT_DIR}`);
console.log('\nNext steps:');
console.log('1. cd ../../../complex-v4');
console.log('2. yarn install (install dependencies)');
console.log('3. Edit .env file if needed (app keys will be auto-generated)');
console.log('4. npm run develop:postgres (or develop:mariadb, develop:sqlite)');
