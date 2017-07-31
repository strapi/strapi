const fs = require('fs');
const path = require('path');

try {
  const pkgJSON = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  const packages = fs.readdirSync(path.resolve(process.cwd(),'packages'), 'utf8');

  packages.filter(pkg => pkg.indexOf('strapi') !== -1).forEach(pkg => {
    const packageJSON = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'packages', pkg, 'package.json'), 'utf8'));

    packageJSON.version = pkgJSON.version;

    Object.keys(packageJSON.dependencies).filter(dependency => dependency.indexOf('strapi-') !== -1).forEach(dependency => {
      if (packageJSON.dependencies[dependency].indexOf('file:') !== -1) {
        packageJSON.dependencies[dependency] = '^' + pkgJSON.version;
      }
    });

    fs.writeFileSync(path.resolve(process.cwd(), 'packages', pkg, 'package.json'), JSON.stringify(packageJSON, null, 2), 'utf8');
  });
} catch (error) {
  console.error(error);
}
