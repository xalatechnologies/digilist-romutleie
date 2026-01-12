#!/bin/bash

# Xala Platform Setup Script
# This script helps set up authentication for GitHub Packages

echo "🚀 Xala Platform Setup"
echo "======================"
echo ""

# Check if .npmrc already has auth token
if grep -q "_authToken" .npmrc 2>/dev/null; then
    echo "✅ Authentication token already configured in .npmrc"
else
    echo "📝 Setting up GitHub Packages authentication..."
    echo ""
    echo "You need a GitHub Personal Access Token with 'read:packages' scope."
    echo ""
    read -p "Enter your GitHub Personal Access Token: " GITHUB_TOKEN
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo "❌ Token cannot be empty. Exiting."
        exit 1
    fi
    
    # Add auth token to .npmrc
    echo "//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN" >> .npmrc
    echo "✅ Authentication token added to .npmrc"
fi

echo ""
echo "📦 Installing @xalatechnologies/platform..."
npm install @xalatechnologies/platform@2.0.0

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Package installed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Uncomment platform imports in index.tsx"
    echo "2. Uncomment platform tokens import in index.css"
    echo "3. Update components to use platform components"
    echo ""
    echo "See PLATFORM_SETUP.md for detailed instructions."
else
    echo ""
    echo "❌ Installation failed. Please check:"
    echo "   - Your GitHub token has 'read:packages' scope"
    echo "   - You have access to @xalatechnologies organization"
    echo "   - Your .npmrc file is configured correctly"
fi

