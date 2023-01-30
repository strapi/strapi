import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import {
  Accordion,
  AccordionToggle,
  AccordionContent,
  Box,
  Grid,
  GridItem,
  TextInput,
} from '@strapi/design-system';

import { StageType } from '../../../constants';

// TODO: Delete once https://github.com/strapi/design-system/pull/858
// is merged and released.
const StyledAccordion = styled(Box)`
  > div:first-child {
    box-shadow: ${({ theme }) => theme.shadows.tableShadow};
  }
`;

function Stage({ id, name }) {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <StyledAccordion>
      <Accordion size="S" variant="primary" onToggle={() => setIsOpen(!isOpen)} expanded={isOpen}>
        <AccordionToggle title={name} togglePosition="left" />
        <AccordionContent padding={6} background="neutral0">
          <Grid gap={4}>
            <GridItem col={6}>
              <TextInput
                name={`stage_name[${id}]`}
                disabled
                label={formatMessage({
                  id: 'Settings.review-workflows.stage.name.label',
                  defaultMessage: 'Stage name',
                })}
                value={name}
              />
            </GridItem>
          </Grid>
        </AccordionContent>
      </Accordion>
    </StyledAccordion>
  );
}

export { Stage };

Stage.propTypes = PropTypes.shape(StageType).isRequired;
