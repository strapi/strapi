import React, { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { BaseCheckbox, Box, Flex, Typography } from '@strapi/design-system';
import { usePermissionsDataManager } from '../../../../../../../../../hooks';
import CollapseLabel from '../../../CollapseLabel';
import Curve from '../../../Curve';
import HiddenAction from '../../../HiddenAction';
import { cellWidth, rowHeight } from '../../../Permissions/utils/constants';
import RequiredSign from '../../../RequiredSign';
import { getCheckboxState } from '../../../utils';
import { activeStyle } from '../../utils';
import CarretIcon from '../CarretIcon';

const Cell = styled(Flex)`
  width: ${cellWidth};
  position: relative;
`;

const RowWrapper = styled(Flex)`
  height: ${rowHeight};
`;

const Wrapper = styled(Box)`
  padding-left: ${31 / 16}rem;
`;

const LeftBorderTimeline = styled(Box)`
  border-left: ${({ isVisible, theme }) =>
    isVisible ? `4px solid ${theme.colors.primary200}` : '4px solid transparent'};
`;

const RowStyle = styled(Flex)`
  padding-left: ${({ theme }) => theme.spaces[4]};
  width: ${({ level }) => 145 - level * 36}px;

  ${({ isCollapsable, theme }) =>
    isCollapsable &&
    `
      ${CarretIcon} {
        display: block;
        color: ${theme.colors.neutral100};
      }
      &:hover {
        ${activeStyle(theme)}
      }
  `}
  ${({ isActive, theme }) => isActive && activeStyle(theme)};
`;

const TopTimeline = styled.div`
  padding-top: ${({ theme }) => theme.spaces[2]};
  margin-top: ${({ theme }) => theme.spaces[2]};
  width: ${4 / 16}rem;
  background-color: ${({ theme }) => theme.colors.primary200};
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
`;

const SubActionRow = ({
  childrenForm,
  isFormDisabled,
  recursiveLevel,
  pathToDataFromActionRow,
  propertyActions,
  parentName,
  propertyName,
}) => {
  const { formatMessage } = useIntl();
  const { modifiedData, onChangeParentCheckbox, onChangeSimpleCheckbox } =
    usePermissionsDataManager();
  const [rowToOpen, setRowToOpen] = useState(null);

  const handleClickToggleSubLevel = (name) => {
    setRowToOpen((prev) => {
      if (prev === name) {
        return null;
      }

      return name;
    });
  };

  const displayedRecursiveChildren = useMemo(() => {
    if (!rowToOpen) {
      return null;
    }

    return childrenForm.find(({ value }) => value === rowToOpen);
  }, [rowToOpen, childrenForm]);

  return (
    <Wrapper>
      <TopTimeline />
      {childrenForm.map(({ label, value, required, children: subChildrenForm }, index) => {
        const isVisible = index + 1 < childrenForm.length;
        const isArrayType = Array.isArray(subChildrenForm);
        const isActive = rowToOpen === value;

        return (
          <LeftBorderTimeline key={value} isVisible={isVisible}>
            <RowWrapper>
              <Curve color="primary200" />
              <Flex style={{ flex: 1 }}>
                <RowStyle level={recursiveLevel} isActive={isActive} isCollapsable={isArrayType}>
                  <CollapseLabel
                    alignItems="center"
                    isCollapsable={isArrayType}
                    {...(isArrayType && {
                      onClick: () => handleClickToggleSubLevel(value),
                      'aria-expanded': isActive,
                      onKeyDown: ({ key }) =>
                        (key === 'Enter' || key === ' ') && handleClickToggleSubLevel(value),
                      tabIndex: 0,
                      role: 'button',
                    })}
                    title={label}
                  >
                    <Typography ellipsis>{upperFirst(label)}</Typography>
                    {required && <RequiredSign />}
                    <CarretIcon $isActive={isActive} />
                  </CollapseLabel>
                </RowStyle>
                <Flex style={{ flex: 1 }}>
                  {propertyActions.map(
                    ({ actionId, label: propertyLabel, isActionRelatedToCurrentProperty }) => {
                      if (!isActionRelatedToCurrentProperty) {
                        return <HiddenAction key={actionId} />;
                      }
                      /*
                       * Usually we use a 'dot' in order to know the key path of an object for which we want to change the value.
                       * Since an action and a subject are both separated by '.' or '::' we chose to use the '..' separators
                       */
                      const checkboxName = [
                        ...pathToDataFromActionRow.split('..'),
                        actionId,
                        'properties',
                        propertyName,
                        ...parentName.split('..'),
                        value,
                      ];

                      const checkboxValue = get(modifiedData, checkboxName, false);

                      if (!subChildrenForm) {
                        return (
                          <Cell key={propertyLabel} justifyContent="center" alignItems="center">
                            <BaseCheckbox
                              disabled={isFormDisabled}
                              name={checkboxName.join('..')}
                              aria-label={formatMessage(
                                {
                                  id: `Settings.permissions.select-by-permission`,
                                  defaultMessage: 'Select {label} permission',
                                },
                                { label: `${parentName} ${label} ${propertyLabel}` }
                              )}
                              // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                              onValueChange={(value) => {
                                onChangeSimpleCheckbox({
                                  target: {
                                    name: checkboxName.join('..'),
                                    value,
                                  },
                                });
                              }}
                              value={checkboxValue}
                            />
                          </Cell>
                        );
                      }

                      const { hasAllActionsSelected, hasSomeActionsSelected } =
                        getCheckboxState(checkboxValue);

                      return (
                        <Cell key={propertyLabel} justifyContent="center" alignItems="center">
                          <BaseCheckbox
                            key={propertyLabel}
                            disabled={isFormDisabled}
                            name={checkboxName.join('..')}
                            aria-label={formatMessage(
                              {
                                id: `Settings.permissions.select-by-permission`,
                                defaultMessage: 'Select {label} permission',
                              },
                              { label: `${parentName} ${label} ${propertyLabel}` }
                            )}
                            // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                            onValueChange={(value) => {
                              onChangeParentCheckbox({
                                target: {
                                  name: checkboxName.join('..'),
                                  value,
                                },
                              });
                            }}
                            value={hasAllActionsSelected}
                            indeterminate={hasSomeActionsSelected}
                          />
                        </Cell>
                      );
                    }
                  )}
                </Flex>
              </Flex>
            </RowWrapper>
            {displayedRecursiveChildren && isActive && (
              <Box paddingBottom={2}>
                <SubActionRow
                  isFormDisabled={isFormDisabled}
                  parentName={`${parentName}..${value}`}
                  pathToDataFromActionRow={pathToDataFromActionRow}
                  propertyActions={propertyActions}
                  propertyName={propertyName}
                  recursiveLevel={recursiveLevel + 1}
                  childrenForm={displayedRecursiveChildren.children}
                />
              </Box>
            )}
          </LeftBorderTimeline>
        );
      })}
    </Wrapper>
  );
};

SubActionRow.propTypes = {
  childrenForm: PropTypes.array.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  parentName: PropTypes.string.isRequired,
  pathToDataFromActionRow: PropTypes.string.isRequired,
  propertyActions: PropTypes.array.isRequired,
  propertyName: PropTypes.string.isRequired,
  recursiveLevel: PropTypes.number.isRequired,
};

export default memo(SubActionRow);
