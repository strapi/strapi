const fs = require('fs');
const path = require('path');

const shell = require('shelljs');

const main = async () => {
  const {stdout} = shell.exec('git diff --name-only --cached', {silent: true});
  const changes = stdout.trim().split('\n');

  let packages;

  try {
    packages = fs.readdirSync(path.resolve(process.cwd(), 'packages'), 'utf8');

    packages.filter(pkg => pkg.startsWith('strapi'));
  } catch (error) {
    return console.error(`Can't get strapi packages`);
  }

  const packageCheckingPromises = packages.map((pkg) => {
    return new Promise(async (resolve) => {
      const translationsPath = path.resolve(process.cwd(), 'packages', pkg, 'admin', 'src', 'translations');

      let files;

      try {
        files = fs.readdirSync(translationsPath, 'utf8');
      } catch (error) {
        return resolve();
      }

      const updateFilesPromises = files.map((file) => {
        if (!changes.includes(path.join('packages', pkg, 'admin', 'src', 'translations', file))) {
          return true;
        }

        let obj;

        try {
          obj = require(path.resolve(translationsPath, file));
        } catch (error) {
          return false;
        }

        const clean = {};

        Object.keys(obj).sort().forEach(function(key) {
          clean[key] = obj[key];
        });

        return new Promise((resolve) => {
          fs.writeFile(path.resolve(translationsPath, file), JSON.stringify(clean, null, 2), 'utf8', () => {
            resolve()
          });
        });
      });

      await Promise.all(updateFilesPromises);

      resolve();
    });
  });

  await Promise.all(packageCheckingPromises);
};

main();
