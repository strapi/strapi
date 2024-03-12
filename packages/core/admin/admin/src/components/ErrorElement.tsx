import { useRouteError } from 'react-router-dom';

import { Page } from './PageHelpers';

/**
 * @description this stops the app from going white, and instead shows the error message.
 * But it could be improved for sure.
 */
const ErrorElement = () => {
  const error = useRouteError();

  if (error instanceof Error) {
    console.error(error);
    return <Page.Error content={error.message} />;
  }

  throw error;
};

export { ErrorElement };
