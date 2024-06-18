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
      message: 'Do you want to use Typescript ?',
      default: true,
    },
  ]);

  return useTypescript;
}

async function example() {
  const { useExampleApp } = await inquirer.prompt<{
    useExampleApp: boolean;
  }>([
    {
      type: 'confirm',
      name: 'useExampleApp',
      message: 'Do you want to start with an example structure & data ?',
      default: true,
    },
  ]);

  return useExampleApp;
}

export { directory, typescript, example };
