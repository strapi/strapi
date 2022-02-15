import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';

import { Grid, GridItem } from '@strapi/design-system/Grid';
import { TextInput } from '@strapi/design-system/TextInput';
import getTrad from '../../utils/getTrad';

const SyncSettings = ({ contentSyncURL, formErrors, onChange }) => {
  const { formatMessage } = useIntl();
  const error = formErrors.contentSyncURL ? formatMessage(formErrors.contentSyncURL) : null;

  return (
    <Box paddingTop={7} paddingLeft={6} paddingRight={6} paddingBottom={11}>
      <Grid>
        <GridItem s={12} col={8}>
          <TextInput
            id="label-input"
            label={formatMessage({
              id: getTrad('Settings.sync-content.url-label'),
              defaultMessage: 'Gatsby Content Sync url ',
            })}
            error={error}
            name="contentSyncURL"
            onChange={onChange}
            value={contentSyncURL}
          />
        </GridItem>
      </Grid>
    </Box>
  );
};

SyncSettings.propTypes = {
  contentSyncURL: PropTypes.string,
  formErrors: PropTypes.shape({
    contentSyncURL: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

SyncSettings.defaultProps = {
  contentSyncURL: '',
};

export default SyncSettings;
