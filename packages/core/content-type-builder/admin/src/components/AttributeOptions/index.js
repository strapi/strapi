/**
 *
 * AttributeOptions
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Divider } from '@strapi/design-system/Divider';
import { ModalBody } from '@strapi/design-system/ModalLayout';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import { getTrad } from '../../utils';
import AttributeList from './AttributeList';
import CustomFieldsList from './CustomFieldsList';

const AttributeOptions = ({ attributes, forTarget, kind }) => {
  const { formatMessage } = useIntl();

  const defaultTabId = getTrad('modalForm.tabs.default');
  const customTabId = getTrad('modalForm.tabs.custom');

  const titleIdSuffix = forTarget.includes('component') ? 'component' : kind;
  const titleId = getTrad(`modalForm.sub-header.chooseAttribute.${titleIdSuffix}`);

  return (
    <ModalBody padding={6}>
      <TabGroup
        label={formatMessage({
          id: getTrad('modalForm.tabs.label'),
          defaultMessage: 'Default and Custom types tabs',
        })}
        id="attribute-type-tabs"
        variant="simple"
      >
        <Flex justifyContent="space-between">
          <Typography variant="beta" as="h2">
            {formatMessage({ id: titleId, defaultMessage: 'Select a field' })}
          </Typography>
          <Tabs>
            <Tab>{formatMessage({ id: defaultTabId, defaultMessage: 'Default' })}</Tab>
            <Tab>{formatMessage({ id: customTabId, defaultMessage: 'Custom' })}</Tab>
          </Tabs>
        </Flex>
        <Box paddingBottom={6}>
          <Divider />
        </Box>
        <TabPanels>
          <TabPanel>
            <AttributeList attributes={attributes} />
          </TabPanel>
          <TabPanel>
            <CustomFieldsList />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </ModalBody>
  );
};

AttributeOptions.propTypes = {
  attributes: PropTypes.array.isRequired,
  forTarget: PropTypes.string.isRequired,
  kind: PropTypes.string.isRequired,
};

export default AttributeOptions;
