import * as React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionToggle,
  Box,
  Flex,
  Grid,
  GridItem,
  IconButton,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  VisuallyHidden,
} from '@strapi/design-system';
import { useTracking } from '@strapi/helper-plugin';
import { Drag, Trash } from '@strapi/icons';
import { useField } from 'formik';
import PropTypes from 'prop-types';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

import { useDragAndDrop } from '../../../../../../../../../admin/src/content-manager/hooks';
import { composeRefs } from '../../../../../../../../../admin/src/content-manager/utils';
import { deleteStage, updateStage, updateStagePosition } from '../../../actions';
import { DRAG_DROP_TYPES } from '../../../constants';
import { getAvailableStageColors, getStageColorByHex } from '../../../utils/colors';

const AVAILABLE_COLORS = getAvailableStageColors();

function StageDropPreview() {
  return (
    <Box
      background="primary100"
      borderStyle="dashed"
      borderColor="primary600"
      borderWidth="1px"
      display="block"
      hasRadius
      padding={6}
      shadow="tableShadow"
    />
  );
}

export function Stage({
  id,
  index,
  canDelete,
  canReorder,
  isOpen: isOpenDefault = false,
  stagesCount,
}) {
  /**
   *
   * @param {number} index
   * @returns {string}
   */
  const getItemPos = (index) => `${index + 1} of ${stagesCount}`;

  /**
   *
   * @param {number} index
   * @returns {void}
   */
  const handleGrabStage = (index) => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.grab-item',
          defaultMessage: `{item}, grabbed. Current position in list: {position}. Press up and down arrow to change position, Spacebar to drop, Escape to cancel.`,
        },
        {
          item: nameField.value,
          position: getItemPos(index),
        }
      )
    );
  };

  /**
   *
   * @param {number} index
   * @returns {void}
   */
  const handleDropStage = (index) => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.drop-item',
          defaultMessage: `{item}, dropped. Final position in list: {position}.`,
        },
        {
          item: nameField.value,
          position: getItemPos(index),
        }
      )
    );
  };

  /**
   *
   * @param {number} index
   * @returns {void}
   */
  const handleCancelDragStage = () => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.cancel-item',
          defaultMessage: '{item}, dropped. Re-order cancelled.',
        },
        {
          item: nameField.value,
        }
      )
    );
  };

  const handleMoveStage = (newIndex, oldIndex) => {
    setLiveText(
      formatMessage(
        {
          id: 'dnd.reorder',
          defaultMessage: '{item}, moved. New position in list: {position}.',
        },
        {
          item: nameField.value,
          position: getItemPos(newIndex),
        }
      )
    );

    dispatch(updateStagePosition(oldIndex, newIndex));
  };

  const [liveText, setLiveText] = React.useState(null);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = React.useState(isOpenDefault);
  const [nameField, nameMeta] = useField(`stages.${index}.name`);
  const [colorField, colorMeta] = useField(`stages.${index}.color`);
  const [{ handlerId, isDragging, handleKeyDown }, stageRef, dropRef, dragRef, dragPreviewRef] =
    useDragAndDrop(canReorder, {
      index,
      item: {
        name: nameField.value,
      },
      onGrabItem: handleGrabStage,
      onDropItem: handleDropStage,
      onMoveItem: handleMoveStage,
      onCancel: handleCancelDragStage,
      type: DRAG_DROP_TYPES.STAGE,
    });

  const composedRef = composeRefs(stageRef, dropRef);

  const colorOptions = AVAILABLE_COLORS.map(({ hex, name }) => ({
    value: hex,
    label: formatMessage(
      {
        id: 'Settings.review-workflows.stage.color.name',
        defaultMessage: '{name}',
      },
      { name }
    ),
    color: hex,
  }));

  React.useEffect(() => {
    dragPreviewRef(getEmptyImage(), { captureDraggingState: false });
  }, [dragPreviewRef, index]);

  const { themeColorName } = colorField.value ? getStageColorByHex(colorField.value) : {};

  return (
    <Box ref={composedRef}>
      {liveText && <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>}

      {isDragging ? (
        <StageDropPreview />
      ) : (
        <Accordion
          size="S"
          variant="primary"
          onToggle={() => {
            setIsOpen(!isOpen);

            if (!isOpen) {
              trackUsage('willEditStage');
            }
          }}
          expanded={isOpen}
          shadow="tableShadow"
        >
          <AccordionToggle
            title={nameField.value}
            togglePosition="left"
            action={
              <Flex>
                {canDelete && (
                  <IconButton
                    background="transparent"
                    icon={<Trash />}
                    label={formatMessage({
                      id: 'Settings.review-workflows.stage.delete',
                      defaultMessage: 'Delete stage',
                    })}
                    noBorder
                    onClick={() => dispatch(deleteStage(id))}
                  />
                )}

                <IconButton
                  background="transparent"
                  forwardedAs="div"
                  role="button"
                  noBorder
                  tabIndex={0}
                  data-handler-id={handlerId}
                  ref={dragRef}
                  label={formatMessage({
                    id: 'Settings.review-workflows.stage.drag',
                    defaultMessage: 'Drag',
                  })}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={handleKeyDown}
                >
                  <Drag />
                </IconButton>
              </Flex>
            }
          />
          <AccordionContent padding={6} background="neutral0" hasRadius>
            <Grid gap={4}>
              <GridItem col={6}>
                <TextInput
                  {...nameField}
                  id={nameField.name}
                  label={formatMessage({
                    id: 'Settings.review-workflows.stage.name.label',
                    defaultMessage: 'Stage name',
                  })}
                  error={nameMeta.error ?? false}
                  onChange={(event) => {
                    nameField.onChange(event);
                    dispatch(updateStage(id, { name: event.target.value }));
                  }}
                  required
                />
              </GridItem>

              <GridItem col={6}>
                <SingleSelect
                  error={colorMeta?.error ?? false}
                  id={colorField.name}
                  required
                  label={formatMessage({
                    id: 'content-manager.reviewWorkflows.stage.color',
                    defaultMessage: 'Color',
                  })}
                  onChange={(value) => {
                    colorField.onChange({ target: { value } });
                    dispatch(updateStage(id, { color: value }));
                  }}
                  value={colorField.value.toUpperCase()}
                  startIcon={
                    <Flex
                      as="span"
                      height={2}
                      background={colorField.value}
                      borderColor={themeColorName === 'neutral0' ? 'neutral150' : 'transparent'}
                      hasRadius
                      shrink={0}
                      width={2}
                    />
                  }
                >
                  {colorOptions.map(({ value, label, color }) => {
                    const { themeColorName } = getStageColorByHex(color);

                    return (
                      <SingleSelectOption
                        value={value}
                        key={value}
                        startIcon={
                          <Flex
                            as="span"
                            height={2}
                            background={color}
                            borderColor={
                              themeColorName === 'neutral0' ? 'neutral150' : 'transparent'
                            }
                            hasRadius
                            shrink={0}
                            width={2}
                          />
                        }
                      >
                        {label}
                      </SingleSelectOption>
                    );
                  })}
                </SingleSelect>
              </GridItem>
            </Grid>
          </AccordionContent>
        </Accordion>
      )}
    </Box>
  );
}

Stage.propTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canReorder: PropTypes.bool.isRequired,
  stagesCount: PropTypes.number.isRequired,
}).isRequired;
