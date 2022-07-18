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
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';
import { ModalBody } from '@strapi/design-system/ModalLayout';
import { Stack } from '@strapi/design-system/Stack';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import { getTrad } from '../../utils';
import AttributeOption from './AttributeOption';

const AttributeOptions = ({ attributes }) => {
  const { formatMessage } = useIntl();

  const defaultTabId = getTrad(`modalForm.tabs.default`);
  const customTabId = getTrad(`modalForm.tabs.custom`);

  return (
    <ModalBody paddingTop={3} paddingLeft={6} paddingRight={6} paddingBottom={4}>
      <TabGroup label="Attribute type tabs" id="attribute-type-tabs" variant="simple">
        <Tabs>
          <Tab>{formatMessage({ id: defaultTabId, defaultMessage: 'Default' })}</Tab>
          <Tab>{formatMessage({ id: customTabId, defaultMessage: 'Custom' })}</Tab>
        </Tabs>
        <Box paddingBottom={6}>
          <Divider />
        </Box>
        <TabPanels>
          <TabPanel>
            <KeyboardNavigable tagName="button">
              <Stack spacing={8}>
                {attributes.map((attributeRow, index) => {
                  const key = index;

                  return (
                    <Grid key={key} gap={0}>
                      {attributeRow.map((attribute, index) => {
                        const isOdd = index % 2 === 1;
                        const paddingLeft = isOdd ? 2 : 0;
                        const paddingRight = isOdd ? 0 : 2;

                        return (
                          <GridItem key={attribute} col={6} style={{ height: '100%' }}>
                            <Box
                              paddingLeft={paddingLeft}
                              paddingRight={paddingRight}
                              paddingBottom={2}
                              style={{ height: '100%' }}
                            >
                              <AttributeOption type={attribute} />
                            </Box>
                          </GridItem>
                        );
                      })}
                    </Grid>
                  );
                })}
              </Stack>
            </KeyboardNavigable>
          </TabPanel>
          <TabPanel>
            <Box>Coming soon</Box>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </ModalBody>
  );
};

AttributeOptions.propTypes = {
  attributes: PropTypes.array.isRequired,
};

export default AttributeOptions;
