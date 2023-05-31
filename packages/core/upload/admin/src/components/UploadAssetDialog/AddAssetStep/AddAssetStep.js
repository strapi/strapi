import React from 'react';
import PropTypes from 'prop-types';
import {
  ModalHeader,
  Typography,
  Divider,
  Box,
  Tabs,
  Tab,
  TabGroup,
  TabPanels,
  TabPanel,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { FromUrlForm } from './FromUrlForm';
import { FromComputerForm } from './FromComputerForm';
import getTrad from '../../../utils/getTrad';

export const AddAssetStep = ({ onClose, onAddAsset, trackedLocation }) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('header.actions.add-assets'),
            defaultMessage: 'Add new assets',
          })}
        </Typography>
      </ModalHeader>

      <TabGroup
        label={formatMessage({
          id: getTrad('tabs.title'),
          defaultMessage: 'How do you want to upload your assets?',
        })}
        variant="simple"
      >
        <Box paddingLeft={8} paddingRight={8} paddingTop={6}>
          <Tabs>
            <Tab>
              {formatMessage({
                id: getTrad('modal.nav.computer'),
                defaultMessage: 'From computer',
              })}
            </Tab>
            <Tab>
              {formatMessage({
                id: getTrad('modal.nav.url'),
                defaultMessage: 'From URL',
              })}
            </Tab>
          </Tabs>

          <Divider />
        </Box>
        <TabPanels>
          <TabPanel>
            <FromComputerForm
              onClose={onClose}
              onAddAssets={onAddAsset}
              trackedLocation={trackedLocation}
            />
          </TabPanel>
          <TabPanel>
            <FromUrlForm
              onClose={onClose}
              onAddAsset={onAddAsset}
              trackedLocation={trackedLocation}
            />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </>
  );
};

AddAssetStep.defaultProps = {
  trackedLocation: undefined,
};

AddAssetStep.propTypes = {
  onClose: PropTypes.func.isRequired,
  onAddAsset: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};
