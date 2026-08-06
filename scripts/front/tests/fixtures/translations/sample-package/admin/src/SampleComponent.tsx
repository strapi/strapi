import { useIntl } from 'react-intl';

import { getTranslation } from './utils/translations';

export const SampleComponent = () => {
  const { formatMessage } = useIntl();

  return (
    <>
      {formatMessage({
        id: getTranslation('sample.greeting'),
        defaultMessage: 'Hello',
      })}
      {formatMessage({
        id: getTranslation('sample.missing'),
        defaultMessage: 'Missing key',
      })}
      {formatMessage({
        id: getTranslation('sample.mismatch'),
        defaultMessage: 'From code',
      })}
      {formatMessage({
        id: getTranslation('plugin.name'),
      })}
      {formatMessage({
        id: getTranslation(`sample.dynamic.${'value'}`),
        defaultMessage: 'Dynamic',
      })}
    </>
  );
};
