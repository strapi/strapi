import chalk from 'chalk';

export default function parseToChalk(template: string) {
  const supportedStyles = {
    magentaBright: chalk.magentaBright,
    blueBright: chalk.blueBright,
    yellowBright: chalk.yellowBright,
    green: chalk.green,
    red: chalk.red,
    bold: chalk.bold,
    italic: chalk.italic,
  };
  let result = template;

  for (const [color, chalkFunction] of Object.entries(supportedStyles)) {
    const regex = new RegExp(`{${color}}(.*?){/${color}}`, 'g');
    result = result.replace(regex, (_, p1) => chalkFunction(p1.trim()));
  }

  return result;
}
