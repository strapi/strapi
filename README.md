# Strapi Setup and Exploration

This project is a setup and exploration of the [Strapi](https://github.com/strapi/strapi) repository, completed as part of Task 1. It includes setting up Strapi locally, creating a sample content type, and pushing the changes to a GitHub repository with proper documentation.

---

## 📋 Steps Followed

### 1. Fork the Strapi Repository
- Visited: [https://github.com/strapi/strapi](https://github.com/strapi/strapi)
- Clicked the **Fork** button to create a copy under my GitHub account.

### 2. Clone the Forked Repository
```bash
git clone https://github.com/<your-username>/strapi.git
cd strapi
```
> Replace `<your-username>` with your GitHub username.

### 3. Install Dependencies
Make sure **Node.js v18+** and **Yarn** are installed.
```bash
yarn install
```

### 4. Start Strapi Locally
```bash
yarn build
yarn develop
```
- The admin panel opens at: [http://localhost:1337](http://localhost:1337)

### 5. Create a Sample Content Type
- Opened the **Content-Type Builder** in the admin panel.
- Created a collection type named `Article`.
- Added fields:
  - `title` (Text)
  - `content` (Rich Text)
- Saved the content type and tested it by adding entries.

### 6. Create a New Branch
```bash
git checkout -b karthik
```

### 7. Push to GitHub
```bash
git add .
git commit -m "Strapi setup with sample content type"
git push -u origin karthik
```

### 8. Create a Pull Request
- Opened my forked repository on GitHub.
- Clicked **"Compare & pull request"**.
- Selected:
  - Base: `main`
  - Compare: `karthik-setup`
- Wrote a short description and submitted the pull request.

---

## 🚀 How to Run the Project

1. Clone the repo:
```bash
git clone
cd strapi
```

2. Install dependencies:
```bash
yarn install
```

3. Run the project:
```bash
yarn build
yarn develop
```

4. Open [http://localhost:1337](http://localhost:1337) in your browser.

---

## 📦 Sample Content Type Created

**Collection Type:** Article  
**Fields:**
- `title` (type: Text)
- `content` (type: Rich Text)

---

## 🎥 Loom Video & Pull Request

- 📹 Loom Video:
- 🔗 Pull Request:

---