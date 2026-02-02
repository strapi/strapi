# Strapi Local Development Setup

## Steps Done

1. Cloned Strapi repository
2. Installed dependencies using Yarn
3. Ran Strapi locally using `yarn develop`
4. Opened Admin Panel at http://localhost:1337/admin
5. Created sample content type: Article
6. Added sample entry
7. Explored project structure
8. Pushed setup to GitHub

## 🎉 Congratulations!

You've successfully set up Strapi locally and accessed the admin panel.

## 📋 What You Have Now

- ✅ Strapi monorepo cloned and built
- ✅ Admin panel accessible at `http://localhost:1337/admin`
- ✅ Admin user registered
- ✅ SQLite database running (`.tmp/data.db`)
- ✅ Development server running
- ✅ Sample Article content type created
- ✅ Sample content entry added

## How to Run Locally

```bash
yarn install
yarn develop
```

## 🚀 Quick Start Commands

### Start Development Server

```bash
cd examples/getstarted
yarn develop
```

### Access Your Strapi

- **Admin Panel**: http://localhost:1337/admin
- **API Documentation**: http://localhost:1337/documentation (if enabled)
- **REST API**: http://localhost:1337/api/
- **GraphQL**: http://localhost:1337/graphql (if enabled)

## 📁 Project Structure

```
strapi/
├── packages/              # Core Strapi packages
├── examples/getstarted/     # Your running Strapi app
│   ├── config/             # Database, server configs
│   ├── src/
│   │   ├── api/           # Your API endpoints
│   │   ├── components/    # Reusable components
│   │   └── extensions/    # Plugin extensions
│   ├── public/            # Static files
│   └── .tmp/              # SQLite database location
├── scripts/               # Utility scripts
├── tests/                 # Test files
└── templates/             # Project templates
```

## 🛠️ Next Steps

### 1. Create Your First Content Type

1. Go to **Content-Types Builder** in admin panel
2. Click **"Create new collection type"**
3. Name it (e.g., "Article", "Product", "Blog Post")
4. Add fields (Text, Rich Text, Media, etc.)
5. Save and restart server when prompted

### 2. Add Content

1. Go to **Content Manager**
2. Select your content type
3. Click **"Create new entry"**
4. Fill in your content
5. Publish it

### 3. Test Your API

```bash
# Get all entries from your content type
curl http://localhost:1337/api/articles

# Get specific entry
curl http://localhost:1337/api/articles/1
```

## 🗄️ Database Options

### Current: SQLite (Default)

- File: `examples/getstarted/.tmp/data.db`
- No setup required
- Perfect for development

### Switch to PostgreSQL/MySQL

1. Start database:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. Run with specific DB:

```bash
# PostgreSQL
DB=postgres yarn develop

# MySQL
DB=mysql yarn develop

# MariaDB
DB=mariadb yarn develop
```

## 🔧 Development Commands

```bash
# Start development (auto-reload)
yarn develop

# Build for production
yarn build

# Start production server
yarn start

# Generate API/Controller/Service
yarn strapi generate

# Install plugin
yarn strapi install <plugin-name>

# See all commands
yarn strapi --help
```

## 📦 Useful Plugins

Install these popular plugins:

```bash
# GraphQL API
yarn strapi install graphql

# Documentation
yarn strapi install documentation

# Email provider
yarn strapi install email

# Upload providers
yarn strapi install upload
```

## 🔐 API Access & Permissions

### Make API Public

1. Go to **Settings** → **Users & Permissions Plugin** → **Roles**
2. Click **Public**
3. Expand your content type
4. Check **find** and **findOne**
5. Save

### Create API Token

1. Go to **Settings** → **API Tokens**
2. Click **Create new API Token**
3. Set permissions
4. Use in requests:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:1337/api/articles
```

## 🌐 Frontend Integration

### React Example

```javascript
// Fetch data from Strapi
const fetchArticles = async () => {
  const response = await fetch('http://localhost:1337/api/articles');
  const data = await response.json();
  return data.data;
};
```

### Next.js Example

```javascript
// pages/articles.js
export async function getStaticProps() {
  const res = await fetch('http://localhost:1337/api/articles');
  const articles = await res.json();

  return {
    props: { articles: articles.data },
  };
}
```

## 🐛 Troubleshooting

### Server Won't Start

```bash
# Clear cache and rebuild
yarn clean
yarn build
```

### Database Issues

```bash
# Reset SQLite database
rm examples/getstarted/.tmp/data.db
yarn develop
```

### Port Already in Use

```bash
# Kill process on port 1337
lsof -ti:1337 | xargs kill -9
```

### Permission Errors

```bash
# Fix file permissions
chmod -R 755 examples/getstarted
```

## 📚 Learning Resources

- [Strapi Documentation](https://docs.strapi.io)
- [API Reference](https://docs.strapi.io/developer-docs/latest/developer-resources/database-apis-reference/)
- [Plugin Development](https://docs.strapi.io/developer-docs/latest/development/plugins-development/)
- [Deployment Guide](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/deployment/)

## 🎯 Common Use Cases

### Blog/CMS

- Create Article content type
- Add Rich Text, Media, SEO fields
- Build frontend with Next.js/React

### E-commerce

- Create Product, Category content types
- Add pricing, inventory fields
- Integrate with payment providers

### Portfolio

- Create Project, Skill content types
- Add media galleries
- Build personal website

## 💡 Pro Tips

1. **Use Components** for reusable content blocks
2. **Set up Relations** between content types
3. **Configure Media Library** for file uploads
4. **Use Webhooks** for real-time updates
5. **Enable CORS** for frontend integration
6. **Set up Environment Variables** for different stages

---

**Happy coding with Strapi! 🚀**

Need help? Check the [Strapi Discord](https://discord.strapi.io) or [GitHub Issues](https://github.com/strapi/strapi/issues).
