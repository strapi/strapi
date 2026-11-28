import fs from 'node:fs';
import path from 'node:path';
import { createIntl } from 'react-intl';

const directory = path.join(__dirname, '..');
const placeholders = [
  ['Settings.email.plugin.placeholder.defaultFrom', 'no-reply@strapi.io'],
  ['Settings.email.plugin.placeholder.defaultReplyTo', 'support@strapi.io'],
];

const cases = fs
  .readdirSync(directory)
  .filter((file) => file.endsWith('.json'))
  .flatMap((file) => {
    const messages = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
    return placeholders
      .filter(([id]) => id in messages)
      .map(([id, address]) => ({ file, messages, id, address }));
  });

it.each(cases)('$file uses an address-only example for $id', ({ messages, id, address }) => {
  const intl = createIntl({ locale: 'en', messages });
  const example = intl.formatMessage({ id });

  expect(example.endsWith(address)).toBe(true);
  expect(example).not.toMatch(/[<>]/);
});
