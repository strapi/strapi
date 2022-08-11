import { green, redBright, yellow } from 'chalk';
import depcheck from 'depcheck';
import glob from 'glob';
import { isEmpty } from 'lodash/fp';
import { dirname } from 'path';

const formatOutput = (dependencies: string[], label: string) => {
  if (dependencies.length === 0) return;

  const output = dependencies.map((dependency) => `${yellow('*')} ${dependency}`).join('\n');
  console.log(label);
  console.log(output);
};

let current = 0;

glob(
  '**/package.json',
  { ignore: ['**/node_modules/**', '**/examples/**'], absolute: true },
  async (error, matches) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }

    const total = matches.length;
    matches.map(async (match) => {
      const packageJson = require(match);
      const identifier = packageJson.name;
      const results = await depcheck(dirname(match), {
        ignoreMatches: [],
        specials: [depcheck.special.babel, depcheck.special.bin, depcheck.special.webpack],
      });
      const { dependencies, devDependencies, missing } = results;
      current++;

      if ([dependencies, devDependencies, missing].every(isEmpty)) {
        console.log(green(identifier), '✔️');
        return;
      }

      console.log(redBright(identifier), '❌');
      formatOutput(dependencies, 'Unused dependencies');
      formatOutput(devDependencies, 'Unused devDependencies');
      formatOutput(Object.keys(missing), 'Missing dependencies');

      // Add an empty line for readability when encountering an issue, except if it's the last result
      if (current !== total) {
        console.log();
      }
    });
  }
);
