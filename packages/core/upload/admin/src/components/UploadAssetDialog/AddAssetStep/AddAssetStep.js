import React from 'react';
import PropTypes from 'prop-types';
import { ModalHeader } from '@strapi/parts/ModalLayout';
import { ButtonText } from '@strapi/parts/Text';
import { Divider } from '@strapi/parts/Divider';
import { Box } from '@strapi/parts/Box';
import { useIntl } from 'react-intl';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/parts/Tabs';
import { FromUrlForm } from './FromUrlForm';
import { FromComputerForm } from './FromComputerForm';
import { getTrad } from '../../../utils';

export const AddAssetStep = ({ onClose, onAddAsset }) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <ModalHeader>
        <ButtonText textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('header.actions.upload-assets'),
            defaultMessage: 'Upload assets',
          })}
        </ButtonText>
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
            <FromComputerForm onClose={onClose} onAddAssets={onAddAsset} />
          </TabPanel>
          <TabPanel>
            <FromUrlForm onClose={onClose} onAddAsset={onAddAsset} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </>
  );
};

AddAssetStep.propTypes = {
  onClose: PropTypes.func.isRequired,
  onAddAsset: PropTypes.func.isRequired,
};
