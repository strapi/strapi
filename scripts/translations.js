const fs = require('fs');
const path = require('path');

const main = async () => {
  let packages;

  try {
    packages = fs.readdirSync(path.resolve(process.cwd(), 'packages'), 'utf8');

    packages = packages.filter((pkg) => {
      return pkg.indexOf('strapi') !== -1;
    });
  } catch (error) {
    console.error(`Can't get strapi packages`);
  }

  const packageCheckingPromises = packages.map((pkg) => {
    return new Promise(async (resolve) => {
      const translationsPath = path.resolve(process.cwd(), 'packages', pkg, 'admin', 'src', 'translations');

      try {
        files = fs.readdirSync(translationsPath, 'utf8');
      } catch (error) {
        return resolve();
      }

      files.forEach((file) => {
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

        fs.writeFileSync(path.resolve(translationsPath, file), JSON.stringify(clean, null, 2), 'utf8');
      });

      resolve();
    });
  });

  await Promise.all(packageCheckingPromises);
};

main();
