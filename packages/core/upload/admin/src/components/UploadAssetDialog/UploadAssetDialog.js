import React from 'react';
import PropTypes from 'prop-types';
import { ModalLayout, ModalHeader, ModalFooter, ModalBody } from '@strapi/parts/ModalLayout';
import { ButtonText } from '@strapi/parts/Text';
import { Button } from '@strapi/parts/Button';
import { Divider } from '@strapi/parts/Divider';
import { useIntl } from 'react-intl';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/parts/Tabs';
import { FromUrlForm } from './FromUrlForm';
import { FromComputerForm } from './FromComputerForm';
import { getTrad } from '../../utils';

export const UploadAssetDialog = ({ onSuccess, onClose }) => {
  const { formatMessage } = useIntl();

  const handleSaveAssets = () => {
    onSuccess();
  };

  return (
    <ModalLayout onClose={onClose} labelledBy="title">
      <ModalHeader>
        <ButtonText textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('header.actions.upload-assets'),
            defaultMessage: 'Upload assets',
          })}
        </ButtonText>
      </ModalHeader>
      <ModalBody>
        <TabGroup
          label={formatMessage({
            id: getTrad('tabs.title'),
            defaultMessage: 'How do you want to upload your assets?',
          })}
          variant="simple"
        >
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
          <TabPanels>
            <TabPanel>
              <FromUrlForm />
            </TabPanel>
            <TabPanel>
              <FromComputerForm />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </ModalBody>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'cancel' })}
          </Button>
        }
        endActions={
          <>
            <Button onClick={handleSaveAssets}>
              {formatMessage(
                {
                  id: getTrad('modal.upload-list.footer.button.singular'),
                  defaultMessage: 'Upload assets',
                },
                { number: 0 }
              )}
            </Button>
          </>
        }
      />
    </ModalLayout>
  );
};

UploadAssetDialog.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
