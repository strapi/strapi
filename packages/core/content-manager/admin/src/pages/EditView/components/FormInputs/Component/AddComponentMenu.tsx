import * as React from 'react';

import { Flex, Menu, Typography } from '@strapi/design-system';
import { Duplicate, Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslation } from '../../../../../utils/translations';

interface AddComponentMenuContentProps {
  /**
   * What the menu adds: an entry of a component field, or a component of a dynamic zone.
   */
  kind: 'entry' | 'component';
  onAddEmpty: () => void;
  onCopy: () => void;
}

/**
 * The choices offered when adding a component to a field that can also copy one from another
 * entry: start from blank fields, or pick existing content.
 */
const AddComponentMenuContent = ({ kind, onAddEmpty, onCopy }: AddComponentMenuContentProps) => {
  const { formatMessage } = useIntl();

  return (
    <MenuContent minWidth="30rem" maxHeight="none" popoverPlacement="bottom-center">
      <Menu.Item onSelect={onAddEmpty} startIcon={<Plus />}>
        <Flex tag="span" direction="column" alignItems="flex-start">
          <Typography tag="span" fontWeight="bold" textColor="neutral800">
            {kind === 'entry'
              ? formatMessage({
                  id: getTranslation('components.AddComponentMenu.empty.entry'),
                  defaultMessage: 'Empty entry',
                })
              : formatMessage({
                  id: getTranslation('components.AddComponentMenu.empty.component'),
                  defaultMessage: 'Empty component',
                })}
          </Typography>
          <Typography tag="span" variant="pi" textColor="neutral600">
            {formatMessage({
              id: getTranslation('components.AddComponentMenu.empty.hint'),
              defaultMessage: 'Start with blank fields',
            })}
          </Typography>
        </Flex>
      </Menu.Item>
      <Menu.Item onSelect={onCopy} startIcon={<Duplicate />}>
        <Flex tag="span" direction="column" alignItems="flex-start">
          <Typography tag="span" fontWeight="bold" textColor="neutral800">
            {formatMessage({
              id: getTranslation('components.AddComponentMenu.copy'),
              defaultMessage: 'Use existing content…',
            })}
          </Typography>
          <Typography tag="span" variant="pi" textColor="neutral600">
            {formatMessage({
              id: getTranslation('components.AddComponentMenu.copy.hint'),
              defaultMessage: 'From an entry that already uses this component',
            })}
          </Typography>
        </Flex>
      </Menu.Item>
    </MenuContent>
  );
};

const MenuContent = styled(Menu.Content)`
  /* two-line items: the icon lines up with the title */
  [role='menuitem'] {
    align-items: flex-start;
    padding-block: ${({ theme }) => theme.spaces[2]};

    > span:first-child {
      margin-top: 2px;
    }
  }
`;

export { AddComponentMenuContent };
export type { AddComponentMenuContentProps };
