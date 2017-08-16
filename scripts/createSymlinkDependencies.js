const fs = require('fs');
const path = require('path');

try {
  const packages = fs.readdirSync(path.resolve(process.cwd(),'packages'), 'utf8');

  packages.filter(pkg => pkg.indexOf('strapi') !== -1).forEach(pkg => {
    const packageJSON = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'packages', pkg, 'package.json'), 'utf8'));

    Object.keys(packageJSON.dependencies).filter(dependency => dependency.indexOf('strapi-') !== -1).forEach(dependency => {
      packageJSON.dependencies[dependency] = 'file:../' + dependency;
    });

    fs.writeFileSync(path.resolve(process.cwd(), 'packages', pkg, 'package.json'), JSON.stringify(packageJSON, null, 2), 'utf8');
  });
} catch (error) {
  console.error(error);
}
