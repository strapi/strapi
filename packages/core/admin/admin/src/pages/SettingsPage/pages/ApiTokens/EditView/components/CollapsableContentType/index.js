import React, { useState, useMemo } from 'react';
import { get, capitalize } from 'lodash';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/design-system/Accordion';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useApiTokenPermissionsContext } from '../../../../../../../contexts/ApiTokenPermissions';
// import { useIntl } from 'react-intl';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const CollapsableContentType = ({ actions, label, orderNumber, name, disabled }) => {
  //   const { formatMessage } = useIntl();
  const {
    value: { onChange, onChangeSelectAll, modifiedData },
  } = useApiTokenPermissionsContext();
  const [expanded, setExpanded] = useState(false);

  const currentScopedModifiedData = useMemo(() => {
    return get(modifiedData, name, {});
  }, [modifiedData, name]);

  const hasAllActionsSelected = useMemo(() => {
    return Object.values(currentScopedModifiedData).every((action) => action === true);
  }, [currentScopedModifiedData]);

  const hasSomeActionsSelected = useMemo(() => {
    return (
      Object.values(currentScopedModifiedData).some((action) => action === true) &&
      !hasAllActionsSelected
    );
  }, [currentScopedModifiedData, hasAllActionsSelected]);

  return (
    <Accordion
      expanded={expanded}
      onToggle={() => setExpanded((s) => !s)}
      variant={orderNumber % 2 ? 'primary' : 'secondary'}
    >
      <AccordionToggle title={capitalize(label)} />
      <AccordionContent>
        <Flex justifyContent="space-between" alignItems="center" padding={4}>
          <Box paddingRight={4}>
            <Typography variant="sigma" textColor="neutral600">
              permissions
            </Typography>
          </Box>
          <Border />
          <Box paddingLeft={4}>
            <Checkbox
              value={hasAllActionsSelected}
              indeterminate={hasSomeActionsSelected}
              onValueChange={(value) => {
                onChangeSelectAll({ target: { name, value } });
              }}
              disabled={disabled}
            >
              Select all
            </Checkbox>
          </Box>
        </Flex>
        <Grid gap={4} padding={4}>
          {Object.keys(actions).map((action) => {
            const currentName = `${name}.${action}`;

            return (
              <GridItem col={4} key={action}>
                <Checkbox
                  value={actions[action]}
                  name={currentName}
                  onValueChange={(value) => {
                    onChange({ target: { name: currentName, value } });
                  }}
                  disabled={disabled}
                >
                  {action}
                </Checkbox>
              </GridItem>
            );
          })}
        </Grid>
      </AccordionContent>
    </Accordion>
  );
};

CollapsableContentType.defaultProps = {
  actions: null,
  orderNumber: 0,
  disabled: false,
};

CollapsableContentType.propTypes = {
  actions: PropTypes.objectOf(PropTypes.bool),
  orderNumber: PropTypes.number,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};

export default CollapsableContentType;
