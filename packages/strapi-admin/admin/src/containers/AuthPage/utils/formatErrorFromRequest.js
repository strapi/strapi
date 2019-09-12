import { get } from 'lodash';

const formatErrorFromRequest = errorResponse => {
  const messages = get(errorResponse, ['response', 'payload', 'message'], []);

  return messages.reduce((acc, current) => {
    const err = current.messages.reduce(
      (acc, key) => {
        acc.id = key.id;

        return acc;
      },
      { id: '' }
    );

    acc.push(err);

    return acc;
  }, []);
};

export default formatErrorFromRequest;
