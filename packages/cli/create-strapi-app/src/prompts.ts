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

export { directory, typescript };
