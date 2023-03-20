import React, { memo, useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { BaseCheckbox, Flex } from '@strapi/design-system';
import get from 'lodash/get';
import { usePermissionsDataManager } from '../../../../../../../../../hooks';
import HiddenAction from '../../../HiddenAction';
import { cellWidth, rowHeight } from '../../../Permissions/utils/constants';
import RequiredSign from '../../../RequiredSign';
import RowLabelWithCheckbox from '../../../RowLabelWithCheckbox';
import { getCheckboxState } from '../../../utils';
import { activeStyle } from '../../utils';
import CarretIcon from '../CarretIcon';
import SubActionRow from '../SubActionRow';
import getRowLabelCheckboxeState from './utils/getRowLabelCheckboxeState';

const Cell = styled(Flex)`
  width: ${cellWidth};
  position: relative;
`;

const Wrapper = styled(Flex)`
  height: ${rowHeight};
  flex: 1;

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

const ActionRow = ({
  childrenForm,
  label,
  isFormDisabled,
  name,
  required,
  pathToData,
  propertyActions,
  propertyName,
  isOdd,
}) => {
  const { formatMessage } = useIntl();
  const [rowToOpen, setRowToOpen] = useState(null);
  const {
    modifiedData,
    onChangeCollectionTypeLeftActionRowCheckbox,
    onChangeParentCheckbox,
    onChangeSimpleCheckbox,
  } = usePermissionsDataManager();

  const isActive = rowToOpen === name;

  const recursiveChildren = useMemo(() => {
    if (!Array.isArray(childrenForm)) {
      return [];
    }

    return childrenForm;
  }, [childrenForm]);

  const isCollapsable = recursiveChildren.length > 0;

  const handleClick = useCallback(() => {
    if (isCollapsable) {
      setRowToOpen((prev) => {
        if (prev === name) {
          return null;
        }

        return name;
      });
    }
  }, [isCollapsable, name]);

  const handleChangeLeftRowCheckbox = ({ target: { value } }) => {
    onChangeCollectionTypeLeftActionRowCheckbox(pathToData, propertyName, name, value);
  };

  const { hasAllActionsSelected, hasSomeActionsSelected } = useMemo(() => {
    return getRowLabelCheckboxeState(propertyActions, modifiedData, pathToData, propertyName, name);
  }, [propertyActions, modifiedData, pathToData, propertyName, name]);

  return (
    <>
      <Wrapper
        alignItems="center"
        isCollapsable={isCollapsable}
        isActive={isActive}
        background={isOdd ? 'neutral100' : 'neutral0'}
      >
        <Flex>
          <RowLabelWithCheckbox
            onChange={handleChangeLeftRowCheckbox}
            onClick={handleClick}
            isCollapsable={isCollapsable}
            isFormDisabled={isFormDisabled}
            label={label}
            someChecked={hasSomeActionsSelected}
            value={hasAllActionsSelected}
            isActive={isActive}
          >
            {required && <RequiredSign />}
            <CarretIcon $isActive={isActive} />
          </RowLabelWithCheckbox>
          <Flex>
            {propertyActions.map(({ label, isActionRelatedToCurrentProperty, actionId }) => {
              if (!isActionRelatedToCurrentProperty) {
                return <HiddenAction key={label} />;
              }

              const checkboxName = [
                ...pathToData.split('..'),
                actionId,
                'properties',
                propertyName,
                name,
              ];

              if (!isCollapsable) {
                const checkboxValue = get(modifiedData, checkboxName, false);

                return (
                  <Cell key={actionId} justifyContent="center" alignItems="center">
                    <BaseCheckbox
                      disabled={isFormDisabled}
                      name={checkboxName.join('..')}
                      aria-label={formatMessage(
                        {
                          id: `Settings.permissions.select-by-permission`,
                          defaultMessage: 'Select {label} permission',
                        },
                        { label: `${name} ${label}` }
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

              const data = get(modifiedData, checkboxName, {});

              const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(data);

              return (
                <Cell key={label} justifyContent="center" alignItems="center">
                  <BaseCheckbox
                    disabled={isFormDisabled}
                    name={checkboxName.join('..')}
                    // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                    onValueChange={(value) => {
                      onChangeParentCheckbox({
                        target: {
                          name: checkboxName.join('..'),
                          value,
                        },
                      });
                    }}
                    aria-label={formatMessage(
                      {
                        id: `Settings.permissions.select-by-permission`,
                        defaultMessage: 'Select {label} permission',
                      },
                      { label: `${name} ${label}` }
                    )}
                    value={hasAllActionsSelected}
                    indeterminate={hasSomeActionsSelected}
                  />
                </Cell>
              );
            })}
          </Flex>
        </Flex>
      </Wrapper>
      {isActive && (
        <SubActionRow
          childrenForm={recursiveChildren}
          isFormDisabled={isFormDisabled}
          parentName={name}
          pathToDataFromActionRow={pathToData}
          propertyName={propertyName}
          propertyActions={propertyActions}
          recursiveLevel={0}
        />
      )}
    </>
  );
};

ActionRow.defaultProps = {
  childrenForm: [],
  required: false,
};

ActionRow.propTypes = {
  childrenForm: PropTypes.array,
  label: PropTypes.string.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  pathToData: PropTypes.string.isRequired,
  propertyActions: PropTypes.array.isRequired,
  propertyName: PropTypes.string.isRequired,
  required: PropTypes.bool,
  isOdd: PropTypes.bool.isRequired,
};

export default memo(ActionRow);
