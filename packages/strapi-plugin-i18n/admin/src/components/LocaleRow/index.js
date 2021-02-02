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

const LocaleSettingsPage = ({ locale, onDelete, onEdit }) => {
  const { formatMessage } = useIntl();

  return (
    <CustomRow>
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
              icon: canUpdate ? (
                <span aria-label="Edit locale">
                  <Pencil fill="#0e1622" />
                </span>
              ) : null,
              onClick: onEdit,
            },
            {
              icon:
                canDelete && !locale.isDefault ? (
                  <span aria-label="Delete locale">
                    <FontAwesomeIcon icon="trash-alt" />
                  </span>
                ) : null,
              onClick: onDelete,
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
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
};

export default LocaleSettingsPage;
