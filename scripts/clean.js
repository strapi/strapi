const exec = require('child_process').execSync;

try {
  exec('rm -rf package-lock.json && rm -rf packages/*/package-lock.json');
} catch (error) {
  console.error('Delete package-lock.json files');
}

try {
  exec('git reset ./packages/strapi-admin/.gitignore && git checkout -- ./packages/strapi-admin/.gitignore');
} catch (error) {
  console.error('Reset admin .gitignore');
}
