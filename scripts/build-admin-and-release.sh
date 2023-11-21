set -e

CURRENT_DIR=$(dirname "$0")
VERSION=$1

echo "Building admin..."

cd $CURRENT_DIR/..
yarn build

cd packages/core/admin

echo "Creating @strapi/admin package version $VERSION..."

yarn pack -o "%s-$VERSION.tgz"

echo "Creating @strapi/admin:$VERSION release..."
gh release create --target main --title "@strapi/admin@$VERSION" --notes '' @strapi/admin@$VERSION @strapi-admin-$VERSION.tgz
