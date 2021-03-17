import React from 'react';
import PropTypes from 'prop-types';
import { Duplicate } from '@buffetjs/icons';
import { Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';
import { getTrad } from '../../utils';

const CMEditViewCopyLocale = ({ localizations }) => {
  const { formatMessage } = useIntl();

  if (!localizations.length) {
    return null;
  }

  return (
    <>
      <BaselineAlignment top size="12px" />
      <Text color="mediumBlue" fontWeight="semiBold" style={{ cursor: 'pointer' }}>
        <span style={{ marginRight: 10 }}>
          <Duplicate fill="#007EFF" />
        </span>
        {formatMessage({
          id: getTrad('CMEditViewCopyLocale.copy-text'),
          defaultMessage: 'Fill in from another locale',
        })}
      </Text>
    </>
  );
};

CMEditViewCopyLocale.propTypes = {
  localizations: PropTypes.array.isRequired,
};

export default CMEditViewCopyLocale;
