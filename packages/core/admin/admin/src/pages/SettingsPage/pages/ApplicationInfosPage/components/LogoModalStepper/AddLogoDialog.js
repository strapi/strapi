import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import { Box } from '@strapi/design-system/Box';
import { Divider } from '@strapi/design-system/Divider';
import FromComputerForm from './FromComputerForm';

const AddLogoDialog = ({ setLocalImage, goTo, next }) => {
  const { formatMessage } = useIntl();

  return (
    <TabGroup
      label={formatMessage({
        id: 'Settings.application.customization.modal.tab.label',
        defaultMessage: 'How do you want to upload your assets?',
      })}
      variant="simple"
    >
      <Box paddingLeft={2} paddingRight={2}>
        <Tabs>
          <Tab>
            {formatMessage({
              id: 'Settings.application.customization.modal.upload.from-computer',
              defaultMessage: 'From computer',
            })}
          </Tab>
          <Tab>
            {formatMessage({
              id: 'Settings.application.customization.modal.upload.from-url',
              defaultMessage: 'From url',
            })}
          </Tab>
        </Tabs>

        <Divider />
      </Box>
      <TabPanels>
        <TabPanel>
          <FromComputerForm setLocalImage={setLocalImage} goTo={goTo} next={next} />
        </TabPanel>
        <TabPanel>TO DO</TabPanel>
      </TabPanels>
    </TabGroup>
  );
};

AddLogoDialog.defaultProps = {
  next: null,
};

AddLogoDialog.propTypes = {
  setLocalImage: PropTypes.func.isRequired,
  goTo: PropTypes.func.isRequired,
  next: PropTypes.string,
};

export default AddLogoDialog;
