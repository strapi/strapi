import * as React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionToggle,
  Box,
  Checkbox,
  Flex,
  Grid,
  GridItem,
  Typography,
} from '@strapi/design-system';
import { Cog } from '@strapi/icons';
import capitalize from 'lodash/capitalize';
import { useIntl } from 'react-intl';
import styled, { css } from 'styled-components';

import { ContentApiPermission } from '../../../../../../../../shared/contracts/content-api/permissions';
import { useApiTokenPermissions } from '../apiTokenPermissions';

const activeCheckboxWrapperStyles = css`
  background: ${(props) => props.theme.colors.primary100};
  svg {
    opacity: 1;
  }
`;

const CheckboxWrapper = styled(Box)<{ isActive: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;

  svg {
    opacity: 0;
    path {
      fill: ${(props) => props.theme.colors.primary600};
    }
  }

  /* Show active style both on hover and when the action is selected */
  ${(props) => props.isActive && activeCheckboxWrapperStyles}
  &:hover {
    ${activeCheckboxWrapperStyles}
  }
`;

const Border = styled.div`
  flex: 1;
  align-self: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

interface CollapsableContentTypeProps {
  controllers?: ContentApiPermission['controllers'];
  label: ContentApiPermission['label'];
  orderNumber?: number;
  disabled?: boolean;
  onExpanded?: (orderNumber: number) => void;
  indexExpandendCollapsedContent: number | null;
}

export const CollapsableContentType = ({
  controllers = [],
  label,
  orderNumber = 0,
  disabled = false,
  onExpanded = () => null,
  indexExpandendCollapsedContent = null,
}: CollapsableContentTypeProps) => {
  const {
    value: { onChangeSelectAll, onChange, selectedActions, setSelectedAction, selectedAction },
  } = useApiTokenPermissions();
  const [expanded, setExpanded] = React.useState(false);
  const { formatMessage } = useIntl();

  const handleExpandedAccordion = () => {
    setExpanded((s) => !s);
    onExpanded(orderNumber);
  };

  React.useEffect(() => {
    if (
      indexExpandendCollapsedContent !== null &&
      indexExpandendCollapsedContent !== orderNumber &&
      expanded
    ) {
      setExpanded(false);
    }
  }, [indexExpandendCollapsedContent, orderNumber, expanded]);

  const isActionSelected = (actionId: string) => actionId === selectedAction;

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
                    {formatMessage({ id: 'app.utils.select-all', defaultMessage: 'Select all' })}
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
                            <Cog />
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
