import * as React from 'react';

import { Box, Flex, VisuallyHidden, Typography } from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/translations';

import { DraggableCard } from './DraggableCard';

import type { SettingsViewContentTypeLayout } from '../../../utils/layouts';

interface SortDisplayedFieldsProps {
  displayedFields: string[];
  listRemainingFields: string[];
  metadatas: SettingsViewContentTypeLayout['metadatas'];
  onAddField: (field: string) => void;
  onClickEditField: (field: string) => void;
  onMoveField: (dragIndex: number, hoverIndex: number) => void;
  onRemoveField: (e: React.MouseEvent<HTMLButtonElement>, index: number) => void;
}

export const SortDisplayedFields = ({
  displayedFields,
  listRemainingFields,
  metadatas,
  onAddField,
  onClickEditField,
  onMoveField,
  onRemoveField,
}: SortDisplayedFieldsProps) => {
  const { formatMessage } = useIntl();
  const [isDraggingSibling, setIsDraggingSibling] = React.useState(false);
  const [lastAction, setLastAction] = React.useState<string | null>(null);
  const scrollableContainerRef = React.useRef<HTMLDivElement>(null);

  function handleAddField(field: string) {
    setLastAction('add');
    onAddField(field);
  }

  function handleRemoveField(e: React.MouseEvent<HTMLButtonElement>, index: number) {
    setLastAction('remove');
    onRemoveField(e, index);
  }

  React.useEffect(() => {
    if (lastAction === 'add' && scrollableContainerRef?.current) {
      scrollableContainerRef.current.scrollLeft = scrollableContainerRef.current.scrollWidth;
    }
  }, [displayedFields, lastAction]);

  return (
    <Flex alignItems="stretch" direction="column" gap={4}>
      <Typography variant="delta" as="h2">
        {formatMessage({
          id: getTranslation('containers.SettingPage.view'),
          defaultMessage: 'View',
        })}
      </Typography>

      <Flex padding={4} borderColor="neutral300" borderStyle="dashed" borderWidth="1px" hasRadius>
        <Box flex="1" overflow="auto hidden" ref={scrollableContainerRef}>
          <Flex gap={3}>
            {displayedFields.map((field, index) => (
              <DraggableCard
                key={field}
                index={index}
                isDraggingSibling={isDraggingSibling}
                onMoveField={onMoveField}
                onClickEditField={onClickEditField}
                onRemoveField={(e) => handleRemoveField(e, index)}
                name={field}
                labelField={metadatas[field].list.label || field}
                setIsDraggingSibling={setIsDraggingSibling}
              />
            ))}
          </Flex>
        </Box>

        <Menu.Root>
          <Menu.Trigger
            paddingLeft={2}
            paddingRight={2}
            justifyContent="center"
            endIcon={null}
            disabled={listRemainingFields.length <= 0}
            variant="tertiary"
          >
            <VisuallyHidden as="span">
              {formatMessage({
                id: getTranslation('components.FieldSelect.label'),
                defaultMessage: 'Add a field',
              })}
            </VisuallyHidden>
            <Plus aria-hidden focusable={false} style={{ position: 'relative', top: 2 }} />
          </Menu.Trigger>
          <Menu.Content>
            {listRemainingFields.map((field) => (
              <Menu.Item key={field} onSelect={() => handleAddField(field)}>
                {metadatas[field].list.label || field}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Root>
      </Flex>
    </Flex>
  );
};
