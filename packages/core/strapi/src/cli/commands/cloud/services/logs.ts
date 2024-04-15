import chalk from 'chalk';

type VarArgs = (string | number)[];

function resolvePrintf(message: string, args: VarArgs) {
  return args.reduce((acc: string, arg) => acc.replace(/%s|%d/, arg.toString()), message);
}

function log(level?: string) {
  return function (message: string, ...args: VarArgs) {
    const resolvedMessage = resolvePrintf(message, args);

    switch (level) {
      case 'info':
        console.log(chalk.blue(resolvedMessage));
        break;
      case 'success':
        console.log(chalk.green(resolvedMessage));
        break;
      case 'error':
        console.error(resolvedMessage);
        break;
      case 'warning':
        console.warn(resolvedMessage);
        break;
      default:
        console.log(resolvedMessage);
    }
  };
}

export const logger = {
  info: log('info'),
  success: log('success'),
  error: log('error'),
  warning: log('warning'),
  log: log(),
};
