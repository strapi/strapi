/**
 *
 * AttributeOptions
 *
 */

import { Divider, Flex, Modal, Tabs, Typography } from '@strapi/design-system';
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
    <Modal.Body>
      <Tabs.Root variant="simple" defaultValue="default">
        <Flex justifyContent="space-between">
          <Typography variant="beta" tag="h2">
            {formatMessage({ id: titleId, defaultMessage: 'Select a field' })}
          </Typography>
          <Tabs.List>
            <Tabs.Trigger value="default">
              {formatMessage({ id: defaultTabId, defaultMessage: 'Default' })}
            </Tabs.Trigger>
            <Tabs.Trigger value="custom">
              {formatMessage({ id: customTabId, defaultMessage: 'Custom' })}
            </Tabs.Trigger>
          </Tabs.List>
        </Flex>
        <Divider marginBottom={6} />
        <Tabs.Content value="default">
          <AttributeList attributes={attributes} />
        </Tabs.Content>
        <Tabs.Content value="custom">
          <CustomFieldsList />
        </Tabs.Content>
      </Tabs.Root>
    </Modal.Body>
  );
};
