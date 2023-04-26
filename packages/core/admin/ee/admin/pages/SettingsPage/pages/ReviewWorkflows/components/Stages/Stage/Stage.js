import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useField } from 'formik';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import {
  Accordion,
  AccordionToggle,
  AccordionContent,
  Field,
  FieldLabel,
  FieldError,
  Flex,
  Grid,
  GridItem,
  IconButton,
  TextInput,
} from '@strapi/design-system';
import { ReactSelect, useTracking } from '@strapi/helper-plugin';
import { Trash } from '@strapi/icons';

import { deleteStage, updateStage } from '../../../actions';
import { getAvailableStageColors } from '../../../utils/colors';
import { OptionColor } from './components/OptionColor';
import { SingleValueColor } from './components/SingleValueColor';

const AVAILABLE_COLORS = getAvailableStageColors();

export function Stage({ id, index, canDelete, isOpen: isOpenDefault = false }) {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [nameField, nameMeta] = useField(`stages.${index}.name`);
  const [colorField, colorMeta] = useField(`stages.${index}.color`);
  const dispatch = useDispatch();
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

  return (
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
          canDelete ? (
            <IconButton
              background="transparent"
              noBorder
              onClick={() => dispatch(deleteStage(id))}
              label={formatMessage({
                id: 'Settings.review-workflows.stage.delete',
                defaultMessage: 'Delete stage',
              })}
              icon={<Trash />}
            />
          ) : null
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
            <Field
              error={colorMeta?.error ?? false}
              name={colorField.name}
              id={colorField.name}
              required
            >
              <Flex direction="column" gap={1} alignItems="stretch">
                <FieldLabel>
                  {formatMessage({
                    id: 'content-manager.reviewWorkflows.stage.color',
                    defaultMessage: 'Color',
                  })}
                </FieldLabel>

                <ReactSelect
                  components={{ Option: OptionColor, SingleValue: SingleValueColor }}
                  error={colorMeta?.error}
                  inputId={colorField.name}
                  name={colorField.name}
                  options={colorOptions}
                  onChange={({ value }) => {
                    colorField.onChange({ target: { value } });
                    dispatch(updateStage(id, { color: value }));
                  }}
                  value={colorOptions.find(({ value }) => value === colorField.value)}
                />

                <FieldError />
              </Flex>
            </Field>
          </GridItem>
        </Grid>
      </AccordionContent>
    </Accordion>
  );
}

Stage.propTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  canDelete: PropTypes.bool.isRequired,
}).isRequired;
