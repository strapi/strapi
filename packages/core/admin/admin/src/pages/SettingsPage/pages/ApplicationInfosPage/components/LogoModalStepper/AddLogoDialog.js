import React from 'react';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import { Box } from '@strapi/design-system/Box';
import { Divider } from '@strapi/design-system/Divider';
import FromComputerForm from './FromComputerForm';

const AddLogoDialog = () => {
  return (
    <TabGroup label="How do you want to upload your assets?" variant="simple">
      <Box paddingLeft={2} paddingRight={2}>
        <Tabs>
          <Tab>From computer</Tab>
          <Tab>From URL</Tab>
        </Tabs>

        <Divider />
      </Box>
      <TabPanels>
        <TabPanel>
          <FromComputerForm />
        </TabPanel>
        <TabPanel>TO DO</TabPanel>
      </TabPanels>
    </TabGroup>
  );
};

export default AddLogoDialog;
