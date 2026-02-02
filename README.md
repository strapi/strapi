# Strapi Task-1 – Local Setup & Exploration

## 📌 Project Overview

This project is part of **Task-1 for PearlThoughts**.  
The goal of this task is to **clone the Strapi codebase**, **run Strapi locally**, **explore the project structure**, **start the Admin Panel**, **create a sample content type**, and **document the complete process**.

Strapi is an open-source headless CMS built with **Node.js and TypeScript**, allowing developers to manage and deliver content via APIs.

## 🛠️ Tech Stack

- **Strapi v5**
- **Node.js (LTS)**
- **SQLite** (default database)
- **Yarn / npm**
- **Git & GitHub**

## 📥 Repository Setup

### Step 1: Clone the Strapi Repository

The official Strapi repository was forked and cloned using my GitHub account:

```bash
git clone https://github.com/strapi/strapi.git
```

Note: Strapi uses develop as its default branch. A main branch was created manually, and all task-related work was done in a personal branch.

## Step 2: Branch Strategy

The following branches are used:

- **develop** → Strapi default branch (untouched)
- **main** → Stable baseline branch
- **avinash-karri** → Personal working branch

All task-related changes are committed to the personal branch and submitted via a Pull Request.

## 🚀 Creating and Running the Strapi Project Locally

A new Strapi project was created using the Strapi CLI:

```bash
npx create-strapi@latest my-strapi-app
cd my-strapi-app
```

Install dependencies and start the development server:

```bash
yarn develop
```

Strapi runs locally at:

```bash
http://localhost:1337
```

## 🔐 Admin Panel Access

The Strapi Admin Panel can be accessed at:  
👉 [http://localhost:1337/admin](http://localhost:1337/admin)

### Steps Performed

- Created an admin user
- Logged into the admin dashboard
- Verified **Content Manager** and **Content-Type Builder** access

## 🧱 Project Folder Structure

Below is the main structure of the created Strapi project:

```
my-strapi-app/
├── .strapi/              # Strapi internal configuration
├── .tmp/                 # Temporary build files
├── config/               # Environment and server configuration
├── database/             # SQLite database files
├── dist/                 # Build output
├── node_modules/         # Project dependencies
├── public/               # Static assets
├── src/
│   ├── admin/            # Admin panel source (customization)
│   ├── api/              # Core logic: Content Types, Controllers, Services, & Routes
│   ├── extensions/       # Overrides for installed plugins
│   └── index.ts          # Entry point for register/bootstrap functions
├── .env                  # Environment variables (secrets/keys)
├── package.json          # Project metadata, dependencies, & scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project documentation
```

## 📝 Sample Content Type Creation

### Content Type: Article

A sample collection type named **Article** was created using the Content-Type Builder.

### Fields:

| Field Name     | Type      |
| :------------- | :-------- |
| title          | Text      |
| description    | Rich Text |
| published_date | Date      |

### API Structure:

This created the following directory structure in your project:

```text
src/api/article/
├── content-types/
│   └── article/
│       └── schema.json    # The schema definition for your fields
├── controllers/
│   └── article.ts        # Custom logic for Article endpoints
├── routes/
│   └── article.ts        # Route configurations
└── services/
    └── article.ts        # Reusable business logic

```

## 📄 Adding Sample Content

**Steps followed:**

- Opened **Content Manager**
- Selected **Article**
- Created a new entry with sample data
- Saved and published the entry

## 🔗 API Verification

The Article API can be accessed at:

> [http://localhost:1337/api/articles](http://localhost:1337/api/articles)

**Permissions enabled from:**
`Settings` → `Users & Permissions` → `Public` → `Article` → `find` / `findOne`

## 📌 Git Workflow

All changes were committed and pushed using the following commands:

```bash
git add .
git commit -m "Task-1: Created Strapi project and Article content type"
git push origin avinash-karri
```

A Pull Request was raised from:

```
avinash-karri → main
```

### 🎥 Loom Video

A Loom video was recorded demonstrating the following:

| Category              | Details                                |
| :-------------------- | :------------------------------------- |
| **Git**               | Repository & branch structure          |
| **Project**           | Project folder structure               |
| **Local Environment** | Running Strapi locally                 |
| **Dashboard**         | Admin Panel access                     |
| **Development**       | Content type creation & Sample content |
| **Process**           | Pull Request overview                  |

**📎 Loom link:** _https://www.loom.com/share/8a4bc8ebe9af458486a76cb4a09dcb25_

---

### ✅ Task Completion Summary

- Cloned Strapi repository
- Ran Strapi locally
- Explored project structure
- Started Admin Panel
- Created sample content type
- Added sample data
- Documented steps in README
- Created branch and raised PR
- Recorded Loom video

---

<p align="center">
  <b>👤 Author: Avinash Karri</b>
</p>
