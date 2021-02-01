import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Pencil } from '@buffetjs/icons';
import { Text, IconLinks } from '@buffetjs/core';
import { CustomRow } from '@buffetjs/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { getTrad } from '../../utils';

// Fake permissions
const canUpdate = true;
const canDelete = true;

const LocaleSettingsPage = ({ locale }) => {
  const { formatMessage } = useIntl();

  return (
    <CustomRow onClick={() => console.log('open modal')}>
      <td>
        <Text>{locale.code}</Text>
      </td>
      <td>
        <Text fontWeight="semiBold">{locale.displayName}</Text>
      </td>
      <td>
        <Text>
          {locale.isDefault
            ? formatMessage({ id: getTrad('Settings.locales.row.default-locale') })
            : null}
        </Text>
      </td>
      <td>
        <IconLinks
          links={[
            {
              icon: canUpdate ? <Pencil fill="#0e1622" /> : null,
              onClick: () => console.log('edit'),
            },
            {
              icon: canDelete && !locale.isDefault ? <FontAwesomeIcon icon="trash-alt" /> : null,
              onClick: () => console.log('open delete modal'),
            },
          ]}
        />
      </td>
    </CustomRow>
  );
};

LocaleSettingsPage.propTypes = {
  locale: PropTypes.shape({
    isDefault: PropTypes.bool,
    displayName: PropTypes.string,
    code: PropTypes.string.isRequired,
  }).isRequired,
};

export default LocaleSettingsPage;
