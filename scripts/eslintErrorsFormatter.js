const chalk = require('chalk');
const  { blue, green, magenta, red, yellow } = chalk;

const eslintErrorsFormatter = data => {
  const errors = data.split('\n\n');

  const formattedErrors = errors.reduce((acc, curr, i) => {
    if (curr.includes('warnings)') || curr.includes('warning)')) {
      const summaryErrorArray = curr.split(' ');
      const summaryError = `${red(summaryErrorArray[0])} ${green(
        `${summaryErrorArray[1]} ${summaryErrorArray[2]}`,
      )} ${summaryErrorArray.slice(3).join(' ')}`;

      acc.push(summaryError);
    } else {
      const err = curr.split('\n').reduce((acc, c) => {
        const error = c
          .split(' ')
          .reduce((acc, current, index) => {
            let formattedError;

            switch (index) {
              case 0:
                formattedError = blue(current);
                break;
              case 4:
                formattedError = current === 'warning' ? green(current) : red(current);
                break;
              case c.split(' ').length - 1:
                formattedError = yellow(current);
                break;
              default:
                formattedError = current;
            }

            acc.push(formattedError);
            return acc;
          }, [])
          .join(' ');
        acc.push(error);
        return acc;
      }, []);

      acc.push(err.join('\n'));
    }

    return acc;
  }, []);

  return formattedErrors.join('\n\n');
};

module.exports = eslintErrorsFormatter;
