import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useField } from 'formik';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import {
  Accordion,
  AccordionToggle,
  AccordionContent,
  Grid,
  GridItem,
  IconButton,
  TextInput,
} from '@strapi/design-system';
import { useTracking } from '@strapi/helper-plugin';
import { Trash } from '@strapi/icons';

import { deleteStage, updateStage } from '../../../actions';

function Stage({ id, name, index, canDelete, isOpen: isOpenDefault = false }) {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const fieldIdentifier = `stages.${index}.name`;
  const [field, meta] = useField(fieldIdentifier);
  const dispatch = useDispatch();

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
        title={name}
        togglePosition="left"
        action={
          canDelete ? (
            <IconButton
              backgroundColor="transparent"
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
      <AccordionContent padding={6} background="neutral0">
        <Grid gap={4}>
          <GridItem col={6}>
            <TextInput
              {...field}
              id={fieldIdentifier}
              value={name}
              label={formatMessage({
                id: 'Settings.review-workflows.stage.name.label',
                defaultMessage: 'Stage name',
              })}
              error={meta.error ?? false}
              onChange={(event) => {
                field.onChange(event);
                dispatch(updateStage(id, { name: event.target.value }));
              }}
            />
          </GridItem>
        </Grid>
      </AccordionContent>
    </Accordion>
  );
}

export { Stage };

Stage.propTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  canDelete: PropTypes.bool.isRequired,
}).isRequired;
