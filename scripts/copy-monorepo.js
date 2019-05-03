const path = require('path');
const fs = require('fs-extra');
const yargs = require('yargs');
const chokidar = require('chokidar');

const watch = (source, dest, { runOnce, quiet }) => {
  const ignored = [/node_modules/, /\.git/, /\.DS_Store/, /__tests__/];

  chokidar
    .watch(source, {
      ignored: [
        filePath => ignored.filter(reg => reg.test(filePath)).length > 0,
      ],
    })
    .on('all', (event, filePath) => {
      if (['change', 'add'].includes(event)) {
        const newPath = path.join(
          dest,
          'node_modules',
          path.relative(source, filePath)
        );
        fs.copy(filePath, newPath);

        if (!quiet) {
          console.log(
            `Copied ${filePath} to ${path.join(
              'node_modules',
              path.relative(source, filePath)
            )}`
          );
        }
      }
    })
    .on('ready', () => {
      if (runOnce) {
        process.exit(0);
      }
    });
};

yargs
  .command(
    '$0 <dest>',
    'default command',
    yargs => {
      yargs.boolean('run-once').boolean('quiet');
    },
    argv => {
      const source = path.resolve(__dirname, '..', 'packages');
      const dest = path.resolve(process.cwd(), argv.dest);
      watch(source, dest, argv);
    }
  )
  .help().argv;
