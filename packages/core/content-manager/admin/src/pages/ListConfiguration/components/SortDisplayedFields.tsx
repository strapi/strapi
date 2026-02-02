import * as React from 'react';

import { useForm } from '@strapi/admin/strapi-admin';
import { Box, Flex, VisuallyHidden, Typography, Menu } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useDoc } from '../../../hooks/useDocument';
import { useGetContentTypeConfigurationQuery } from '../../../services/contentTypes';
import { checkIfAttributeIsDisplayable } from '../../../utils/attributes';
import { getTranslation } from '../../../utils/translations';

import { DraggableCard, DraggableCardProps } from './DraggableCard';

import type { ListLayout } from '../../../hooks/useDocumentLayout';
import type { FormData } from '../ListConfigurationPage';

interface SortDisplayedFieldsProps extends Pick<ListLayout, 'layout'> {}

const SortDisplayedFields = () => {
  const { formatMessage } = useIntl();
  const { model, schema } = useDoc();
  const [isDraggingSibling, setIsDraggingSibling] = React.useState(false);
  const [lastAction, setLastAction] = React.useState<string | null>(null);
  const scrollableContainerRef = React.useRef<HTMLDivElement>(null);

  const values = useForm<FormData['layout']>(
    'SortDisplayedFields',
    (state) => state.values.layout ?? []
  );
  const addFieldRow = useForm('SortDisplayedFields', (state) => state.addFieldRow);
  const removeFieldRow = useForm('SortDisplayedFields', (state) => state.removeFieldRow);
  const moveFieldRow = useForm('SortDisplayedFields', (state) => state.moveFieldRow);

  const { metadata: allMetadata } = useGetContentTypeConfigurationQuery(model, {
    selectFromResult: ({ data }) => ({ metadata: data?.contentType.metadatas ?? {} }),
  });

  /**
   * This is our list of fields that are not displayed in the current layout
   * so we create their default state to be added to the layout.
   */
  const nonDisplayedFields = React.useMemo(() => {
    if (!schema) {
      return [];
    }

    const displayedFieldNames = values.map((field) => field.name);

    return Object.entries(schema.attributes).reduce<Array<FormData['layout'][number]>>(
      (acc, [name, attribute]) => {
        if (!displayedFieldNames.includes(name) && checkIfAttributeIsDisplayable(attribute)) {
          const { list: metadata } = allMetadata[name];

          acc.push({
            name,
            label: metadata.label || name,
            sortable: metadata.sortable,
          });
        }

        return acc;
      },
      []
    );
  }, [allMetadata, values, schema]);

  const handleAddField = (field: FormData['layout'][number]) => {
    setLastAction('add');
    addFieldRow('layout', field);
  };

  const handleRemoveField = (index: number) => {
    setLastAction('remove');
    removeFieldRow('layout', index);
  };

  const handleMoveField: DraggableCardProps['onMoveField'] = (dragIndex, hoverIndex) => {
    moveFieldRow('layout', dragIndex, hoverIndex);
  };

  React.useEffect(() => {
    if (lastAction === 'add' && scrollableContainerRef?.current) {
      scrollableContainerRef.current.scrollLeft = scrollableContainerRef.current.scrollWidth;
    }
  }, [lastAction]);

  return (
    <Flex alignItems="stretch" direction="column" gap={4}>
      <Typography variant="delta" tag="h2">
        {formatMessage({
          id: getTranslation('containers.SettingPage.view'),
          defaultMessage: 'View',
        })}
      </Typography>

      <Flex padding={4} borderColor="neutral300" borderStyle="dashed" borderWidth="1px" hasRadius>
        <Box flex="1" overflow="auto hidden" ref={scrollableContainerRef}>
          <Flex gap={3}>
            {values.map((field, index) => (
              <DraggableCard
                key={field.name}
                index={index}
                isDraggingSibling={isDraggingSibling}
                onMoveField={handleMoveField}
                onRemoveField={() => handleRemoveField(index)}
                setIsDraggingSibling={setIsDraggingSibling}
                {...field}
                attribute={schema!.attributes[field.name]}
                label={typeof field.label === 'object' ? formatMessage(field.label) : field.label}
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
            disabled={nonDisplayedFields.length === 0}
            variant="tertiary"
          >
            <VisuallyHidden tag="span">
              {formatMessage({
                id: getTranslation('components.FieldSelect.label'),
                defaultMessage: 'Add a field',
              })}
            </VisuallyHidden>
            <Plus aria-hidden focusable={false} style={{ position: 'relative', top: 2 }} />
          </Menu.Trigger>
          <Menu.Content>
            {nonDisplayedFields.map((field) => (
              <Menu.Item key={field.name} onSelect={() => handleAddField(field)}>
                {typeof field.label === 'object' ? formatMessage(field.label) : field.label}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Root>
      </Flex>
    </Flex>
  );
};

export { SortDisplayedFields };
export type { SortDisplayedFieldsProps };
