import React from 'react';
import PropTypes from 'prop-types';
import { ModalLayout, ModalHeader, ModalFooter } from '@strapi/parts/ModalLayout';
import { ButtonText } from '@strapi/parts/Text';
import { Flex } from '@strapi/parts/Flex';
import { Button } from '@strapi/parts/Button';
import { Divider } from '@strapi/parts/Divider';
import { useIntl } from 'react-intl';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/parts/Tabs';
import { Badge } from '@strapi/parts/Badge';
import getTrad from '../../../utils/getTrad';
import { SelectedStep } from './SelectedStep';
import { BrowseStep } from './BrowseStep';

// TODO: this will move when "multiple" will be used for real
// eslint-disable-next-line no-unused-vars
export const AssetDialog = ({ onClose, multiple }) => {
  const { formatMessage } = useIntl();

  return (
    <ModalLayout onClose={onClose} labelledBy="asset-dialog-title">
      <ModalHeader>
        <ButtonText textColor="neutral800" as="h2" id="asset-dialog-title">
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
        <Flex paddingLeft={8} paddingRight={8} paddingTop={6} justifyContent="space-between">
          <Tabs>
            <Tab>
              {formatMessage({
                id: getTrad('modal.nav.browse'),
                defaultMessage: 'Browse',
              })}
            </Tab>
            <Tab>
              {formatMessage({
                id: getTrad('modal.header.select-files'),
                defaultMessage: 'Selected files',
              })}
              <Badge marginLeft={2}>6</Badge>
            </Tab>
          </Tabs>

          <Button onClick={() => {}}>
            {formatMessage({
              id: getTrad('modal.upload-list.sub-header.button'),
              defaultMessage: 'Add more assets',
            })}
          </Button>
        </Flex>
        <Divider />
        <TabPanels>
          <TabPanel>
            <BrowseStep />
          </TabPanel>
          <TabPanel>
            <SelectedStep />
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endActions={
          <>
            <Button onClick={() => {}}>
              {formatMessage({ id: 'form.button.finish', defaultMessage: 'Finish' })}
            </Button>
          </>
        }
      />
    </ModalLayout>
  );
};

AssetDialog.defaultProps = {
  multiple: false,
};

AssetDialog.propTypes = {
  multiple: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};
