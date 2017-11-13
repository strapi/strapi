const fs = require('fs');
const path = require('path');
let currentPackage;

try {
  const pkgJSON = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  const packages = fs.readdirSync(path.resolve(process.cwd(),'packages'), 'utf8');

  packages.filter(pkg => pkg.indexOf('strapi') !== -1).forEach(pkg => {
    currentPackage = pkg;
    const packageJSON = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'packages', pkg, 'package.json'), 'utf8'));

    packageJSON.version = pkgJSON.version;

    Object.keys(packageJSON.dependencies || []).filter(dependency => dependency.indexOf('strapi-') !== -1).forEach(dependency => {
      packageJSON.dependencies[dependency] = pkgJSON.version;
    });

    if (packageJSON.devDependencies) {
      Object.keys(packageJSON.devDependencies || []).filter(devDependency => devDependency.indexOf('strapi-') !== -1).forEach(devDependency => {
        packageJSON.devDependencies[devDependency] = pkgJSON.version;
      });
    }

    fs.writeFileSync(path.resolve(process.cwd(), 'packages', pkg, 'package.json'), JSON.stringify(packageJSON, null, 2), 'utf8');
  });
} catch (error) {
  console.error(currentPackage, error);
}
