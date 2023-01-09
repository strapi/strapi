'use strict';

/**
 * This file contains all methods relating to authorization and authentication for the Strapi CLI
 */

const axios = require('axios');
const inquirer = require('inquirer');
const { exitWith } = require('./helpers');

/**
 * prompt for auth information for Strapi
 */
const promptAuth = async (name, options) => {
  const prompts = [];
  if (!options?.email?.disabled) {
    prompts.push({
      type: 'email', // must match the email field from the admin API /login route
      message: `Enter the admin user email for ${name}`,
      name: `email`,
      validate(email) {
        if (email.length > 0) return true;

        return 'Email must not be blank';
      },
    });
  }
  if (!options?.password?.disabled) {
    prompts.push({
      type: 'password', // must match the password field from the admin API /login route
      message: `Please enter the admin user password for ${name}`,
      name: `password`,
      validate(pass) {
        if (pass.length > 0) return true;

        return 'Password must not be blank';
      },
    });
  }

  if (!prompts.length) return undefined;

  const answers = await inquirer.prompt(prompts);
  return answers;
};

/**
 * given a field containing a url, prompt for email/password and use it to attempt to get a bearer token from the remote content api, and add it to command opts as {field}Token
 */
const getAuthResolverFor = (field) => {
  return async (command) => {
    const opts = command.opts();
    if (!opts[field]) {
      return;
    }

    const urlString = opts[field].toString();

    let login;
    if (opts[`${field}Email`] && opts[`${field}Password`]) {
      login = { email: opts[`${field}Email`], password: opts[`${field}Password`] };
    } else {
      login = await promptAuth(urlString, {
        email: { disabled: !!opts[`${field}Email`] },
        password: { disabled: !!opts[`${field}Password`] },
      });
    }

    try {
      const token = await resolveAuth(login, urlString);
      opts[`${field}Token`] = token;
    } catch (e) {
      exitWith(1, `Error authenticating with ${urlString}`);
    }
  };
};

/**
 * call the admin api login with login info
 */
const resolveAuth = async (login, url) => {
  try {
    const res = await axios.post(`${url}/login`, login, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.data?.data?.token) {
      return res.data.data.token;
    }

    // This should only be possible if the site returns a 200 status without a token; probably not a Strapi instance?
    throw new Error(`Could not authenticate with ${url}`);
  } catch (e) {
    // an error response from server
    const data = e?.response?.data;
    if (data?.error?.message) {
      exitWith(1, `"${data.error.message}" received from ${url}`);
    }

    // failure to get response from server
    const errorCode = e?.code;
    if (errorCode) {
      exitWith(1, `"${errorCode}" received from ${url}`);
    }

    // Unknown error
    exitWith(1, [`Unknown error from ${url}:`, JSON.stringify(e, undefined, 2)]);
  }
};

module.exports = {
  resolveAuth,
  getAuthResolverFor,
};
