import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import { getTrad } from '../../utils';

const DeleteModalAdditionalInfos = () => {
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
