'use strict';

const { resolve, join, basename } = require('path');
const fse = require('fs-extra');
const chalk = require('chalk');
const inquirer = require('inquirer');

// All directories that a template could need
const DIRECTORIES = ['api', 'components', 'config', 'data'];

async function createTemplate(templatePath) {
  // Get path to template directory: strapi-template-<name>/template
  const contentPath = join(templatePath, 'template');

  try {
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
  } catch (error) {
    console.error(`${chalk.red('error')}: ${error.message}`);
  }
}

async function copyContent(templatePath) {
  const contentPath = join(templatePath, 'template');

  DIRECTORIES.forEach(async directory => {
    try {
      await fse.copy(join(process.cwd(), directory), join(contentPath, directory));

      const templateBase = basename(templatePath);
      const currentProjectBase = basename(process.cwd());
      console.log(
        `${chalk.green(
          'success'
        )}: copy ${currentProjectBase}/${directory} => ${templateBase}/template/${directory}`
      );
    } catch (error) {
      console.error(`${chalk.red('error')}: ${error.message}`);
    }
  });
}

module.exports = async function exportTemplate(name) {
  // Create the template directory
  const templatePath = resolve(`../strapi-template-${name}`);
  await createTemplate(templatePath);
  // Copy content from current Strapi project to template directory
  await copyContent(templatePath);
};
