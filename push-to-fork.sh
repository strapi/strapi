#!/bin/bash

echo "🚀 Strapi Audit Logging - Push to Fork Script"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "DESIGN_NOTE.md" ]; then
    echo "❌ Error: Please run this script from the strapi-audit-assignment directory"
    exit 1
fi

# Check current branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "feat/audit-logging" ]; then
    echo "❌ Error: Not on feat/audit-logging branch"
    echo "Current branch: $BRANCH"
    exit 1
fi

echo "📋 Pre-push Checklist:"
echo "✅ You have created a private fork of strapi/strapi on GitHub"
echo "✅ Your fork is at: https://github.com/YOUR_USERNAME/strapi"
echo ""

read -p "Have you completed the above? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please create your fork first and come back!"
    echo "Visit: https://github.com/strapi/strapi and click Fork"
    exit 1
fi

echo ""
read -p "Enter your GitHub username: " USERNAME

if [ -z "$USERNAME" ]; then
    echo "❌ Error: Username cannot be empty"
    exit 1
fi

FORK_URL="https://github.com/$USERNAME/strapi.git"

echo ""
echo "📍 Repository details:"
echo "   Fork URL: $FORK_URL"
echo "   Branch: $BRANCH"
echo ""

# Check if remote already exists
if git remote | grep -q "^myfork$"; then
    echo "⚠️  Remote 'myfork' already exists. Removing..."
    git remote remove myfork
fi

echo "🔗 Adding fork as remote..."
git remote add myfork "$FORK_URL"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to add remote"
    exit 1
fi

echo "✅ Remote added successfully"
echo ""

echo "📤 Pushing branch to your fork..."
git push myfork $BRANCH

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Error: Push failed"
    echo ""
    echo "Possible reasons:"
    echo "1. Invalid GitHub username"
    echo "2. Repository doesn't exist or is not accessible"
    echo "3. Authentication failed"
    echo ""
    echo "Please check and try again manually:"
    echo "  git remote add myfork https://github.com/$USERNAME/strapi.git"
    echo "  git push myfork $BRANCH"
    exit 1
fi

echo ""
echo "🎉 SUCCESS! Your code has been pushed!"
echo ""
echo "=============================================="
echo "📝 Next Steps:"
echo "=============================================="
echo ""
echo "1. Visit your fork:"
echo "   https://github.com/$USERNAME/strapi"
echo ""
echo "2. Go to Settings → Collaborators"
echo ""
echo "3. Add these reviewers with READ access:"
echo "   • Naman-Bhalla"
echo "   • raun"
echo ""
echo "4. Submit the assignment:"
echo "   • Repository: https://github.com/$USERNAME/strapi"
echo "   • Branch: feat/audit-logging"
echo "   • Documentation: DESIGN_NOTE.md, IMPLEMENTATION_SUMMARY.md"
echo ""
echo "=============================================="
echo "✨ Your implementation is ready for review!"
echo "=============================================="

