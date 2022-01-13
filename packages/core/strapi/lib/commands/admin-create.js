'use strict';

const _ = require('lodash');
const inquirer = require('inquirer');
const strapi = require('../index');

const promptQuestions = [
  { type: 'input', name: 'email', message: 'Admin email?' },
  { type: 'password', name: 'password', message: 'Admin password?' },
  { type: 'input', name: 'firstname', message: 'First name?' },
  { type: 'input', name: 'lastname', message: 'Last name?' },
  {
    type: 'confirm',
    name: 'confirm',
    message: 'Do you really want to create a new admin?',
  },
];

/**
 * Create new admin user
 * @param {Object} cmdOptions - command options
 * @param {string} cmdOptions.email - new admin's email
 * @param {string} [cmdOptions.password] - new admin's password
 * @param {string} cmdOptions.firstname - new admin's first name
 * @param {string} [cmdOptions.lastname] - new admin's last name
 */
module.exports = async function(cmdOptions = {}) {
  let { email, password, firstname, lastname } = cmdOptions;

  if (
    _.isEmpty(email) &&
    _.isEmpty(password) &&
    _.isEmpty(firstname) &&
    _.isEmpty(lastname) &&
    process.stdin.isTTY
  ) {
    const inquiry = await inquirer.prompt(promptQuestions);

    if (!inquiry.confirm) {
      process.exit(0);
    }

    ({ email, password, firstname, lastname } = inquiry);
  }

  if (_.isEmpty(email) || _.isEmpty(firstname)) {
    console.error('Missing one of required options `email` or `firstname`');
    process.exit(1);
  }

  return createAdmin({ email, password, firstname, lastname });
};

async function createAdmin({ email, password, firstname, lastname }) {
  const app = await strapi().load();

  const user = await app.admin.services.user.exists({ email });

  if (user) {
    console.error(`User with email "${email}" already exists`);
    process.exit(1);
  }

  const superAdminRole = await app.admin.services.role.getSuperAdmin();

  await app.admin.services.user.create({
    email,
    firstname,
    lastname,
    isActive: true,
    roles: [superAdminRole.id],
    ...(password && { password, registrationToken: null }),
  });

  console.log(`Successfully created new admin`);
  process.exit(0);
}
