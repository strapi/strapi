/**
 *
 * AttributeOptions
 *
 */

import {
  Box,
  Divider,
  Flex,
  ModalBody,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';
import { IconByType } from '../AttributeIcon';

import { AttributeList } from './AttributeList';
import { CustomFieldsList } from './CustomFieldsList';

type AttributeOptionsProps = {
  attributes: IconByType[][];
  forTarget: string;
  kind: string;
};

export const AttributeOptions = ({ attributes, forTarget, kind }: AttributeOptionsProps) => {
  const { formatMessage } = useIntl();

  const defaultTabId = getTrad('modalForm.tabs.default');
  const customTabId = getTrad('modalForm.tabs.custom');

  const titleIdSuffix = forTarget.includes('component') ? 'component' : kind;
  const titleId = getTrad(`modalForm.sub-header.chooseAttribute.${titleIdSuffix}`);

  return (
    <ModalBody padding={7}>
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
