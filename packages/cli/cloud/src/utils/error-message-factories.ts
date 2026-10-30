import { styleText } from 'node:util';
import boxen from 'boxen';
import { apiConfig } from '../config/api';

type EnvironmentErrorMessage = {
  projectName: string;
  firstLine: string;
  secondLine: string;
};

export const environmentErrorMessageFactory = ({
  projectName,
  firstLine,
  secondLine,
}: EnvironmentErrorMessage) => {
  return [
    styleText('yellow', firstLine),
    '',
    styleText('cyan', secondLine),
    styleText('blue', ' →  ') +
      styleText(['blue', 'underline'], `${apiConfig.dashboardBaseUrl}/projects/${projectName}`),
  ].join('\n');
};

export const environmentCreationErrorFactory = (environmentErrorMessage: string) =>
  boxen(environmentErrorMessage, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'white',
    titleAlignment: 'left',
  });
