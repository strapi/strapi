import * as React from 'react';

import {
  Accordion,
  Box,
  BoxComponent,
  Checkbox,
  Flex,
  Grid,
  Typography,
} from '@strapi/design-system';
import { Cog } from '@strapi/icons';
import capitalize from 'lodash/capitalize';
import { useIntl } from 'react-intl';
import { styled, css } from 'styled-components';

import { ContentApiPermission } from '../../../../../../../../shared/contracts/content-api/permissions';
import { useApiTokenPermissions } from '../apiTokenPermissions';

const activeCheckboxWrapperStyles = css`
  background: ${(props) => props.theme.colors.primary100};

  #cog {
    opacity: 1;
  }
`;

const CheckboxWrapper = styled<BoxComponent>(Box)<{ $isActive: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;

  #cog {
    opacity: 0;
    path {
      fill: ${(props) => props.theme.colors.primary600};
    }
  }

  /* Show active style both on hover and when the action is selected */
  ${(props) => props.$isActive && activeCheckboxWrapperStyles}
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
}

export const CollapsableContentType = ({
  controllers = [],
  label,
  orderNumber = 0,
  disabled = false,
}: CollapsableContentTypeProps) => {
  const {
    value: { onChangeSelectAll, onChange, selectedActions, setSelectedAction, selectedAction },
  } = useApiTokenPermissions();
  const { formatMessage } = useIntl();

  const isActionSelected = (actionId: string) => actionId === selectedAction;

  return (
    <Accordion.Item value={`${label}-${orderNumber}`}>
      <Accordion.Header variant={orderNumber % 2 ? 'primary' : 'secondary'}>
        <Accordion.Trigger>{capitalize(label)}</Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content>
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
                    checked={
                      !allActionsSelected && someActionsSelected
                        ? 'indeterminate'
                        : allActionsSelected
                    }
                    onCheckedChange={() => {
                      onChangeSelectAll({ target: { value: [...controller.actions] } });
                    }}
                    disabled={disabled}
                  >
                    {formatMessage({ id: 'app.utils.select-all', defaultMessage: 'Select all' })}
                  </Checkbox>
                </Box>
              </Flex>
              <Grid.Root gap={4} padding={4}>
                {controller?.actions &&
                  controller?.actions.map((action) => {
                    return (
                      <Grid.Item
                        col={6}
                        key={action.actionId}
                        direction="column"
                        alignItems="stretch"
                      >
                        <CheckboxWrapper
                          $isActive={isActionSelected(action.actionId)}
                          padding={2}
                          hasRadius
                        >
                          <Checkbox
                            checked={selectedActions.includes(action.actionId)}
                            name={action.actionId}
                            onCheckedChange={() => {
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
                            <Cog id="cog" />
                          </button>
                        </CheckboxWrapper>
                      </Grid.Item>
                    );
                  })}
              </Grid.Root>
            </Box>
          );
        })}
      </Accordion.Content>
    </Accordion.Item>
  );
};
