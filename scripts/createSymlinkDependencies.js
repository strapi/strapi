const fs = require('fs');
const path = require('path');

try {
  const packages = fs.readdirSync(path.resolve(process.cwd(),'packages'), 'utf8');

  packages.filter(pkg => pkg.includes('strapi')).forEach(pkg => {
    const packageJSON = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'packages', pkg, 'package.json'), 'utf8'));

    Object.keys(packageJSON.dependencies || []).filter(dependency => dependency.includes('strapi-')).forEach(dependency => {
      packageJSON.dependencies[dependency] = 'file:../' + dependency;
    });

    if (packageJSON.devDependencies) {
      Object.keys(packageJSON.devDependencies || []).filter(devDependency => devDependency.includes('strapi-')).forEach(devDependency => {
        packageJSON.devDependencies[devDependency] = 'file:../' + devDependency;
      });
    }

    fs.writeFileSync(path.resolve(process.cwd(), 'packages', pkg, 'package.json'), JSON.stringify(packageJSON, null, 2), 'utf8');
  });
} catch (error) {
  console.error(error);
}
