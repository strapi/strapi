import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import { getTrad } from '../../utils';
import useHasI18n from '../../hooks/useHasI18n';

const DeleteModalAdditionalInfos = () => {
  const hasI18nEnabled = useHasI18n();

  if (!hasI18nEnabled) {
    return null;
  }

  return (
    <span>
      <FormattedMessage
        id={getTrad('Settings.list.actions.deleteAdditionalInfos')}
        values={{
          em: chunks => <em>{chunks}</em>,
        }}
      />
    </span>
  );
};

export default DeleteModalAdditionalInfos;
