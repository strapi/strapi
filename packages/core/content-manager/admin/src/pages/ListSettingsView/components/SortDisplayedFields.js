import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { PropTypes } from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import { IconButton } from '@strapi/design-system/IconButton';
import Plus from '@strapi/icons/Plus';
import DraggableCard from './DraggableCard';
import { getTrad } from '../../../utils';

const FlexWrapper = styled(Box)`
  flex: ${({ size }) => size};
`;

const ScrollableContainer = styled(FlexWrapper)`
  overflow-x: scroll;
  overflow-y: hidden;
`;

const SelectContainer = styled(FlexWrapper)`
  max-width: ${32 / 16}rem;
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
          <Stack horizontal spacing={3}>
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
          </Stack>
        </ScrollableContainer>
        <SelectContainer size="auto" paddingBottom={4}>
          <SimpleMenu
            label={formatMessage({
              id: getTrad('components.FieldSelect.label'),
              defaultMessage: 'Add a field',
            })}
            as={IconButton}
            icon={<Plus />}
            disabled={listRemainingFields.length <= 0}
            data-testid="add-field"
          >
            {listRemainingFields.map((field) => (
              <MenuItem key={field} onClick={() => handleAddField(field)}>
                {metadatas[field].list.label || field}
              </MenuItem>
            ))}
          </SimpleMenu>
        </SelectContainer>
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
