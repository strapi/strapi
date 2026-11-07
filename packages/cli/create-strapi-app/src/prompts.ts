import { validateEmail, validatePassword } from './utils/admin-user';

async function directory() {
  const { default: inquirer } = await import('inquirer');
  const { directory } = await inquirer.prompt<{
    directory: string;
  }>([
    {
      type: 'input',
      default: 'my-strapi-project',
      name: 'directory',
      message: 'What is the name of your project?',
    },
  ]);

  return directory;
}

async function typescript() {
  const { default: inquirer } = await import('inquirer');
  const { useTypescript } = await inquirer.prompt<{
    useTypescript: boolean;
  }>([
    {
      type: 'confirm',
      name: 'useTypescript',
      message: 'Start with Typescript?',
      default: true,
    },
  ]);

  return useTypescript;
}

async function example() {
  const { default: inquirer } = await import('inquirer');
  const { useExample } = await inquirer.prompt<{
    useExample: boolean;
  }>([
    {
      type: 'confirm',
      name: 'useExample',
      message: 'Start with an example structure & data?',
      default: false,
    },
  ]);

  return useExample;
}

async function gitInit() {
  const { default: inquirer } = await import('inquirer');
  const { gitInit } = await inquirer.prompt<{
    gitInit: boolean;
  }>([
    {
      type: 'confirm',
      name: 'gitInit',
      message: 'Initialize a git repository?',
      default: true,
    },
  ]);

  return gitInit;
}

async function installDependencies(packageManager: string) {
  const { default: inquirer } = await import('inquirer');
  const { installDependencies } = await inquirer.prompt<{
    installDependencies: boolean;
  }>([
    {
      type: 'confirm',
      name: 'installDependencies',
      message: `Install dependencies with ${packageManager}?`,
      default: true,
    },
  ]);

  return installDependencies;
}

async function adminEmail() {
  const { default: inquirer } = await import('inquirer');
  const { email } = await inquirer.prompt<{
    email: string;
  }>([
    {
      type: 'input',
      name: 'email',
      message: 'Admin user email?',
      validate: validateEmail,
    },
  ]);

  return email;
}

async function adminPassword() {
  const { default: inquirer } = await import('inquirer');
  const { password } = await inquirer.prompt<{
    password: string;
    confirmPassword: string;
  }>([
    {
      type: 'password',
      name: 'password',
      mask: '*',
      message: 'Admin user password?',
      validate: validatePassword,
    },
    {
      type: 'password',
      name: 'confirmPassword',
      mask: '*',
      message: 'Confirm the admin user password:',
      validate(value: string, answers?: { password?: string }) {
        return value === answers?.password ? true : 'The passwords do not match';
      },
    },
  ]);

  return password;
}

export { directory, typescript, example, gitInit, installDependencies, adminEmail, adminPassword };
