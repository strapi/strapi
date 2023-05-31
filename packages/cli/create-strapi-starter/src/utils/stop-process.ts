import logger from './logger';

export default function stopProcess(message: string) {
  if (message) {
    logger.error(message);
  }

  return process.exit(1);
}
