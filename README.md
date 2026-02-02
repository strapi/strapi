# ============================================================
# STRAPI LOCAL SETUP – COMPLETE STEP-BY-STEP (GENERALIZED)
# ============================================================

# ------------------------------------------------------------
# STEP 0: Navigate to a working directory
# (Any directory where you want to keep the project)
# ------------------------------------------------------------
cd <your-working-directory>

# ------------------------------------------------------------
# STEP 1: Clone the Strapi framework repository (for reference)
# ------------------------------------------------------------
git clone https://github.com/strapi/strapi

# This clones the Strapi framework repository locally.
# Note: This repository contains framework source code
# and is NOT directly runnable as a CMS application.

# ------------------------------------------------------------
# STEP 2: Create a new Strapi application using the official CLI
# ------------------------------------------------------------
npx create-strapi@latest

# During the interactive setup, the following options were selected:
# - Skip login / signup
# - Use default database (SQLite)
# - Start with example structure & data
# - Use TypeScript
# - Install dependencies using npm
# - Initialize a Git repository
# - Participate in anonymous A/B testing

# This command generates a new Strapi application
# with default features and configuration.

# ------------------------------------------------------------
# STEP 3: Navigate into the newly created Strapi application
# ------------------------------------------------------------
cd <strapi-app-directory>

# ------------------------------------------------------------
# STEP 4: Run Strapi in development mode
# ------------------------------------------------------------
npm run develop

# This starts the Strapi development server.
# Once started successfully, Strapi runs on:
# http://localhost:1337

# ------------------------------------------------------------
# STEP 5: Access the Admin Panel (Browser)
# ------------------------------------------------------------
# Open the following URL in the browser:
# http://localhost:1337/admin

# Actions performed in the Admin Panel:
# - Created an administrator account
# - Logged into the Strapi dashboard

# ------------------------------------------------------------
# STEP 6: Create a Collection Type (Admin Panel UI)
# ------------------------------------------------------------
# Admin Panel → Content-Type Builder → Create Collection Type
# Name: Article
# Fields added:
# - title (Text)
# - description (Rich Text)
# - publishedDate (Date)
# Saved the content type and allowed Strapi to restart.

# ------------------------------------------------------------
# STEP 7: Add and Publish Sample Content (Admin Panel UI)
# ------------------------------------------------------------
# Admin Panel → Content Manager → Article → Create new entry
# Example values:
# - Title: Getting Started with Strapi
# - Description: Sample content created for demonstration
# - Published Date: Current date
# Saved and Published the entry.

# ------------------------------------------------------------
# STEP 8: Stop the Strapi development server
# ------------------------------------------------------------
# Press CTRL + C in the terminal to stop the server safely.

# ------------------------------------------------------------
# STEP 9: Create README documentation
# ------------------------------------------------------------
notepad README.md

# The README file documents:
# - Repository cloning
# - Strapi app creation
# - Local execution steps
# - Admin panel usage
# - Content type creation
# - Sample content publishing

# ------------------------------------------------------------
# STEP 10: Check Git status
# ------------------------------------------------------------
git status

# ------------------------------------------------------------
# STEP 11: Stage all changes
# ------------------------------------------------------------
git add .

# ------------------------------------------------------------
# STEP 12: Commit changes
# ------------------------------------------------------------
git commit -m "Set up Strapi locally and create Article content type"

# ------------------------------------------------------------
# STEP 13: Add remote repository (if not already added)
# ------------------------------------------------------------
git remote add origin <your-github-repository-url>

# ------------------------------------------------------------
# STEP 14: Push changes to GitHub
# ------------------------------------------------------------
git push -u origin main

# ------------------------------------------------------------
# END OF STRAPI LOCAL SETUP PROCESS
# ============================================================
