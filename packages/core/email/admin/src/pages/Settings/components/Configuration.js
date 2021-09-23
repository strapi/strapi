/* eslint-disable no-useless-escape */

import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Stack } from '@strapi/parts/Stack';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { H3, Text } from '@strapi/parts/Text';
import { TextInput } from '@strapi/parts/TextInput';
import { Select, Option } from '@strapi/parts/Select';
import getTrad from '../../../utils/getTrad';

const Configuration = ({ config }) => {
  const { formatMessage } = useIntl();

  return (
    <Stack size={4}>
      <Stack size={1}>
        <H3 as="h2">
          {formatMessage({
            id: getTrad('Settings.email.plugin.title.config'),
            defaultMessage: 'Configuration',
          })}
        </H3>
        <Text>
          {formatMessage(
            {
              id: getTrad('Settings.email.plugin.text.configuration'),
              defaultMessage: 'Configuration',
            },
            {
              file: './config/plugins.js',
              link: (
                <a
                  href="https://strapi.io/documentation/developer-docs/latest/development/plugins/email.html#configure-the-plugin"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  link
                </a>
              ),
            }
          )}
        </Text>
      </Stack>
      <Grid gap={5}>
        <GridItem col={6} s={12}>
          <TextInput
            name="shipper-email"
            label={formatMessage({
              id: getTrad('Settings.email.plugin.label.defaultFrom'),
              defaultMessage: 'Default shipper email',
            })}
            placeholder={formatMessage({
              id: getTrad('Settings.email.plugin.placeholder.defaultFrom'),
              defaultMessage: `ex: Strapi No-Reply \<no-reply@strapi.io\>`,
            })}
            disabled
            onChange={() => {}}
            value={config.settings.defaultFrom}
          />
        </GridItem>
        <GridItem col={6} s={12}>
          <TextInput
            name="response-email"
            label={formatMessage({
              id: getTrad('Settings.email.plugin.label.defaultReplyTo'),
              defaultMessage: 'Default response email',
            })}
            placeholder={formatMessage({
              id: getTrad('Settings.email.plugin.placeholder.defaultReplyTo'),
              defaultMessage: `ex: Strapi \<example@strapi.io\>`,
            })}
            disabled
            onChange={() => {}}
            value={config.settings.defaultReplyTo}
          />
        </GridItem>
        <GridItem col={6} s={12}>
          <Select
            name="email-provider"
            label={formatMessage({
              id: getTrad('Settings.email.plugin.label.provider'),
              defaultMessage: 'Email provider',
            })}
            disabled
            onChange={() => {}}
            value={config.provider}
          >
            <Option value={config.provider}>{config.provider}</Option>
          </Select>
        </GridItem>
      </Grid>
    </Stack>
  );
};

Configuration.propTypes = {
  config: PropTypes.shape({
    provider: PropTypes.string,
    settings: PropTypes.shape({
      defaultFrom: PropTypes.string,
      defaultReplyTo: PropTypes.string,
    }),
  }).isRequired,
};

export default Configuration;
