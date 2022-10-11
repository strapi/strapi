import React, { useState, useEffect } from 'react';
import { capitalize } from 'lodash';
import { Accordion, AccordionToggle, AccordionContent } from '@strapi/design-system/Accordion';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import CogIcon from '@strapi/icons/Cog';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useApiTokenPermissionsContext } from '../../../../../../../contexts/ApiTokenPermissions';
import CheckboxWrapper from './CheckBoxWrapper';

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const CollapsableContentType = ({
  controllers,
  label,
  orderNumber,
  disabled,
  onExpanded,
  indexExpandendCollapsedContent,
}) => {
  const {
    value: { onChangeSelectAll, onChange, selectedActions, setSelectedAction, selectedAction },
  } = useApiTokenPermissionsContext();
  const [expanded, setExpanded] = useState(false);

  const handleExpandedAccordion = () => {
    setExpanded((s) => !s);
    onExpanded(orderNumber);
  };

  useEffect(() => {
    if (
      indexExpandendCollapsedContent !== null &&
      indexExpandendCollapsedContent !== orderNumber &&
      expanded
    ) {
      setExpanded(false);
    }
  }, [indexExpandendCollapsedContent, orderNumber, expanded]);

  const isActionSelected = (actionId) => actionId === selectedAction;

  return (
    <Accordion
      expanded={expanded}
      onToggle={handleExpandedAccordion}
      variant={orderNumber % 2 ? 'primary' : 'secondary'}
    >
      <AccordionToggle title={capitalize(label)} />
      <AccordionContent>
        {controllers?.map((controller) => {
          const allActionsSelected = controller.actions.every((action) =>
            selectedActions.includes(action.actionId)
          );

          const someActionsSelected = controller.actions.some((action) =>
            selectedActions.includes(action.actionId)
          );

          return (
            <Box key={`${label}.${controller?.controller}`}>
              <Flex justifyContent="space-between" alignItems="center" padding={4}>
                <Box paddingRight={4}>
                  <Typography variant="sigma" textColor="neutral600">
                    {controller?.controller}
                  </Typography>
                </Box>
                <Border />
                <Box paddingLeft={4}>
                  <Checkbox
                    value={allActionsSelected}
                    indeterminate={!allActionsSelected && someActionsSelected}
                    onValueChange={() => {
                      onChangeSelectAll({ target: { value: [...controller.actions] } });
                    }}
                    disabled={disabled}
                  >
                    Select all
                  </Checkbox>
                </Box>
              </Flex>
              <Grid gap={4} padding={4}>
                {controller?.actions &&
                  controller?.actions.map((action) => {
                    return (
                      <GridItem col={6} key={action.actionId}>
                        <CheckboxWrapper
                          isActive={isActionSelected(action.actionId)}
                          padding={2}
                          hasRadius
                        >
                          <Checkbox
                            value={selectedActions.includes(action.actionId)}
                            name={action.actionId}
                            onValueChange={() => {
                              onChange({ target: { value: action.actionId } });
                            }}
                            disabled={disabled}
                          >
                            {action.action}
                          </Checkbox>
                          <button
                            type="button"
                            data-testid="action-cog"
                            onClick={() =>
                              setSelectedAction({ target: { value: action.actionId } })
                            }
                            style={{ display: 'inline-flex', alignItems: 'center' }}
                          >
                            <CogIcon />
                          </button>
                        </CheckboxWrapper>
                      </GridItem>
                    );
                  })}
              </Grid>
            </Box>
          );
        })}
      </AccordionContent>
    </Accordion>
  );
};

CollapsableContentType.defaultProps = {
  controllers: [],
  orderNumber: 0,
  disabled: false,
  onExpanded: () => null,
  indexExpandendCollapsedContent: null,
};

CollapsableContentType.propTypes = {
  controllers: PropTypes.array,
  orderNumber: PropTypes.number,
  label: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  onExpanded: PropTypes.func,
  indexExpandendCollapsedContent: PropTypes.number,
};

export default CollapsableContentType;
