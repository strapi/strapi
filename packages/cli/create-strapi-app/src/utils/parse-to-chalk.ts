import { styleText } from 'node:util';

// TODO: move styles to API

const supportedStyles = [
  'magentaBright',
  'blueBright',
  'yellowBright',
  'green',
  'red',
  'bold',
  'italic',
] as const;

export default function parseToChalk(template: string) {
  let result = template;

  for (const style of supportedStyles) {
    const regex = new RegExp(`{${style}}(.*?){/${style}}`, 'g');
    result = result.replace(regex, (_, p1) => styleText(style, p1.trim()));
  }

  return result;
}
