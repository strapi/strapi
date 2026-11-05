import lodash from 'lodash';

const { get } = lodash;

/** Forward errors returned by REST controllers to GraphQL clients. */
export function checkBadRequest(contextBody: unknown) {
  const statusCode = get(contextBody, 'statusCode', 200);

  if (statusCode !== 200) {
    const errorMessage = get(contextBody, 'error', 'Bad Request');

    const exception = Object.assign(new Error(errorMessage), {
      code: statusCode || 400,
      data: contextBody,
    });

    throw exception;
  }
}
