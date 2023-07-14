import React, { useEffect, useRef, useState } from 'react';

import { Box, Flex, VisuallyHidden, Typography } from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { Plus } from '@strapi/icons';
import { PropTypes } from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { getTrad } from '../../../utils';

import DraggableCard from './DraggableCard';

const ScrollableContainer = styled(Box)`
  flex: ${({ size }) => size};
  overflow-x: scroll;
  overflow-y: hidden;
`;

const SortDisplayedFields = ({
  displayedFields,
  listRemainingFields,
  metadatas,
  onAddField,
  onClickEditField,
  onMoveField,
  onRemoveField,
}) => {
  const { formatMessage } = useIntl();
  const [isDraggingSibling, setIsDraggingSibling] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const scrollableContainerRef = useRef();

  function handleAddField(...args) {
    setLastAction('add');
    onAddField(...args);
  }

  function handleRemoveField(...args) {
    setLastAction('remove');
    onRemoveField(...args);
  }

  useEffect(() => {
    if (lastAction === 'add' && scrollableContainerRef?.current) {
      scrollableContainerRef.current.scrollLeft = scrollableContainerRef.current.scrollWidth;
    }
  }, [displayedFields, lastAction]);

  return (
    <>
      <Box paddingBottom={4}>
        <Typography variant="delta" as="h2">
          {formatMessage({
            id: getTrad('containers.SettingPage.view'),
            defaultMessage: 'View',
          })}
        </Typography>
      </Box>
      <Flex
        paddingTop={4}
        paddingLeft={4}
        paddingRight={4}
        borderColor="neutral300"
        borderStyle="dashed"
        borderWidth="1px"
        hasRadius
      >
        <ScrollableContainer size="1" paddingBottom={4} ref={scrollableContainerRef}>
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
        </ScrollableContainer>
        <Menu.Root>
          <Menu.Trigger
            paddingLeft={2}
            paddingRight={2}
            justifyContent="center"
            endIcon={null}
            disabled={listRemainingFields.length <= 0}
            marginBottom={4}
            variant="tertiary"
          >
            <VisuallyHidden as="span">
              {formatMessage({
                id: getTrad('components.FieldSelect.label'),
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
    </>
  );
};

SortDisplayedFields.propTypes = {
  displayedFields: PropTypes.array.isRequired,
  listRemainingFields: PropTypes.array.isRequired,
  metadatas: PropTypes.objectOf(
    PropTypes.shape({
      list: PropTypes.shape({
        label: PropTypes.string,
      }),
    })
  ).isRequired,
  onAddField: PropTypes.func.isRequired,
  onClickEditField: PropTypes.func.isRequired,
  onMoveField: PropTypes.func.isRequired,
  onRemoveField: PropTypes.func.isRequired,
};

export default SortDisplayedFields;
