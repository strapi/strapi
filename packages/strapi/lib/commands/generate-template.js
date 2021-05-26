'use strict';

const { resolve, join, basename } = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');
const inquirer = require('inquirer');

// All directories that a template could need
const TEMPLATE_CONTENT = ['api', 'components', 'config/functions/bootstrap.js', 'data'];

async function createTemplate(templatePath) {
  // Get path to template directory: strapi-template-<name>/template
  const contentPath = join(templatePath, 'template');
  let successMessage = 'create';

  // Check if the correct template directory structure exists
  const exists = await fse.pathExists(contentPath);
  const templateBase = basename(templatePath);

  if (exists) {
    // Confirm the user wants to update the existing template
    const inquiry = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `${chalk.yellow(templateBase)} already exists.  Do you want to replace it?`,
    });

    if (!inquiry.confirm) {
      process.exit(0);
    }

    successMessage = 'update';
  }

  // Create/update the template
  await fse.ensureDir(contentPath);
  console.log(`${chalk.cyan(successMessage)}: ${templatePath}`);
}

async function copyContent(templatePath) {
  const contentPath = join(templatePath, 'template');

  TEMPLATE_CONTENT.forEach(async item => {
    try {
      await fse.copy(join(process.cwd(), item), join(contentPath, item));
      const templateBase = basename(templatePath);
      const currentProjectBase = basename(process.cwd());
      console.log(
        `${chalk.green(
          'success'
        )}: copy ${currentProjectBase}/${item} => ${templateBase}/template/${item}`
      );
    } catch (error) {
      console.error(`${chalk.red('error')}: ${error.message}`);
    }
  });
}

async function writeTemplateJson(rootPath) {
  try {
    await fse.writeJSON(join(rootPath, 'template.json'), {});
    console.log(`${chalk.green('success')}: create JSON config file`);
  } catch (error) {
    console.error(`${chalk.red('error')}: ${error.message}`);
  }
}

async function configExists(templatePath) {
  const jsonConfig = await fse.pathExists(join(templatePath, 'template.json'));
  const functionConfig = await fse.pathExists(join(templatePath, 'template.js'));

  return jsonConfig || functionConfig;
}

module.exports = async function generateTemplate(directory) {
  const dir = directory.startsWith('.') ? directory : `../${directory}`;
  const templatePath = resolve(dir);

  await createTemplate(templatePath);
  await copyContent(templatePath);

  const exists = await configExists(templatePath);
  if (!exists) {
    await writeTemplateJson(templatePath);
  }
};
