import inquirer from 'inquirer';

async function directory() {
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

export { directory, typescript, example, gitInit, installDependencies };
