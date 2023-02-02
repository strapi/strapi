import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useField } from 'formik';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import {
  Accordion,
  AccordionToggle,
  AccordionContent,
  Box,
  Grid,
  GridItem,
  IconButton,
  TextInput,
} from '@strapi/design-system';

import { Trash } from '@strapi/icons';

import { deleteStage, updateStage } from '../../../actions';

// TODO: Delete once https://github.com/strapi/design-system/pull/858
// is merged and released.
const StyledAccordion = styled(Box)`
  > div:first-child {
    box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  }
`;

// TODO: Keep an eye on https://github.com/strapi/design-system/pull/878
const DeleteButton = styled(IconButton)`
  background-color: transparent;
`;

function Stage({ id, name, index, canDelete, isOpen: isOpenDefault = false }) {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const fieldIdentifier = `stages.${index}.name`;
  const [field, meta] = useField(fieldIdentifier);
  const dispatch = useDispatch();

  return (
    <StyledAccordion>
      <Accordion size="S" variant="primary" onToggle={() => setIsOpen(!isOpen)} expanded={isOpen}>
        <AccordionToggle
          title={name}
          togglePosition="left"
          action={
            canDelete ? (
              <DeleteButton
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
                onBlur={(event) => dispatch(updateStage(id, { name: event.target.value }))}
              />
            </GridItem>
          </Grid>
        </AccordionContent>
      </Accordion>
    </StyledAccordion>
  );
}

export { Stage };

Stage.propTypes = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  canDelete: PropTypes.bool.isRequired,
}).isRequired;
