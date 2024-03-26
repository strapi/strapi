import _ from 'lodash';
import inquirer from 'inquirer';
import strapi from '../../../../Strapi';

interface CmdOptions {
  email?: string;
  password?: string;
}

interface Answers {
  email: string;
  password: string;
  confirm: boolean;
}

const promptQuestions: ReadonlyArray<inquirer.DistinctQuestion<Answers>> = [
  { type: 'input', name: 'email', message: 'User email?' },
  { type: 'password', name: 'password', message: 'New password?' },
  {
    type: 'confirm',
    name: 'confirm',
    message: "Do you really want to reset this user's password?",
  },
];

/**
 * Reset user's password
 */
export default async (cmdOptions: CmdOptions = {}) => {
  const { email, password } = cmdOptions;

  if (_.isEmpty(email) && _.isEmpty(password) && process.stdin.isTTY) {
    const inquiry = await inquirer.prompt(promptQuestions);

    if (!inquiry.confirm) {
      process.exit(0);
    }

    return changePassword(inquiry);
  }

  if (_.isEmpty(email) || _.isEmpty(password)) {
    console.error('Missing required options `email` or `password`');
    process.exit(1);
  }

  return changePassword({ email, password });
};

async function changePassword({ email, password }: CmdOptions) {
  const appContext = await strapi.compile();
  const app = await strapi(appContext).load();

  await app.admin.services.user.resetPasswordByEmail(email, password);

  console.log(`Successfully reset user's password`);
  process.exit(0);
}
