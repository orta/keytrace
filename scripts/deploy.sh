#!/bin/bash
set -e

VERSION_TYPE=$1

if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo "Usage: ./scripts/deploy.sh <major|minor|patch>"
  exit 1
fi

echo "==> Bumping $VERSION_TYPE version across packages..."

# Get current version from runner package (source of truth)
CURRENT_VERSION=$(node -p "require('./packages/runner/package.json').version")
echo "    Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

case $VERSION_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "    New version: $NEW_VERSION"

# Update package versions
PACKAGES=("packages/runner" "packages/claims" "packages/lexicon")

for pkg in "${PACKAGES[@]}"; do
  echo "==> Updating $pkg to $NEW_VERSION..."
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$pkg/package.json', 'utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('$pkg/package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
done

echo "==> Installing dependencies and building..."
yarn install
yarn build

echo "==> Validating and publishing lexicons to ATProto..."
# Load credentials from .env
if [ -f "apps/keytrace.dev/.env" ]; then
  export GOAT_USERNAME=$(grep '^KEYTRACE_EMAIL=' apps/keytrace.dev/.env | cut -d'=' -f2- | tr -d "'\"")
  export GOAT_PASSWORD=$(grep '^KEYTRACE_EMAIL_PASSWORD=' apps/keytrace.dev/.env | cut -d'=' -f2- | tr -d "'\"")
else
  echo "    Warning: apps/keytrace.dev/.env not found, skipping lexicon publish"
fi

if [ -n "$GOAT_USERNAME" ] && [ -n "$GOAT_PASSWORD" ]; then
  yarn workspace @keytrace/lexicon validate
  (cd packages/lexicon && goat lex publish)
  echo "    Lexicons published to ATProto"
else
  echo "    Skipping ATProto lexicon publish (no credentials)"
fi

echo "==> Creating git tag v$NEW_VERSION..."
git add .
git commit -m "Release v$NEW_VERSION"
git tag "v$NEW_VERSION"

echo "==> Pushing to git (tag push triggers npm publish via GitHub Actions)..."
git push
git push --tags

echo ""
echo "Done! v$NEW_VERSION tagged and pushed."
echo "npm publish will run via GitHub Actions: https://github.com/orta/keytrace/actions"
