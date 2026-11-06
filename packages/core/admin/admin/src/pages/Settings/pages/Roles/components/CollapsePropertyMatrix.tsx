import * as React from 'react';

import {
  Checkbox,
  Box,
  BoxComponent,
  Flex,
  FlexComponent,
  Typography,
  TypographyComponent,
} from '@strapi/design-system';
import { CaretDown, WarningCircle } from '@strapi/icons';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import { styled, DefaultTheme, css } from 'styled-components';

import {
  Action,
  SubjectLockedRow,
  SubjectProperty,
} from '../../../../../../../shared/contracts/permissions';
import {
  PermissionsDataManagerContextValue,
  usePermissionsDataManager,
} from '../hooks/usePermissionsDataManager';
import { cellWidth, firstRowWidth, rowHeight } from '../utils/constants';
import { getMissingRequiredFields, isCellDisabledByLayout } from '../utils/fieldRules';
import { getCheckboxState } from '../utils/getCheckboxState';
import { getLocaleValidationErrorActionKeys } from '../utils/localePermissionValidation';
import { fieldMatchesSearch, getSearchBelow, matchesSearch } from '../utils/search';

import { CollapseLabel } from './CollapseLabel';
import { HiddenAction } from './HiddenAction';
import { LockedRows } from './LockedRows';
import { RequiredSign } from './RequiredSign';
import { RowLabelWithCheckbox, RowLabelWithCheckboxProps } from './RowLabelWithCheckbox';
import { UnheldPermissionTooltip } from './UnheldPermissionTooltip';

const EMPTY_AVAILABLE_ACTIONS: NonNullable<CollapsePropertyMatrixProps['availableActions']> = [];
const EMPTY_CHILDREN_FORM: NonNullable<CollapsePropertyMatrixProps['childrenForm']> = [];
const EMPTY_ACTION_ROW_CHILDREN_FORM: NonNullable<ActionRowProps['childrenForm']> = [];
const EMPTY_SUB_ACTION_ROW_CHILDREN_FORM: NonNullable<SubActionRowProps['childrenForm']> = [];
const EMPTY_HEADERS: NonNullable<HeaderProps['headers']> = [];
const EMPTY_DISABLED_ACTIONS: string[] = [];

/* -------------------------------------------------------------------------------------------------
 * CollapsePropertyMatrix
 * -----------------------------------------------------------------------------------------------*/

interface CollapsePropertyMatrixProps extends Pick<
  ActionRowProps,
  'childrenForm' | 'isFormDisabled' | 'label' | 'pathToData' | 'propertyName' | 'subject'
> {
  availableActions?: Array<Action & { isDisplayed: boolean }>;
  /**
   * Rows without checkboxes, listed under the matrix.
   */
  lockedRows?: SubjectLockedRow[];
  /**
   * The id of the action that fails unless every required field is set (see
   * `PermissionsProps.requiredFieldsAction`).
   */
  requiredFieldsAction?: string;
  /**
   * What is left to search for in this property (see `normalizeSearch`): only the fields that
   * match are listed, and the property is left out when none does. Everything is listed when
   * absent.
   */
  search?: string;
}

interface PropertyAction {
  label: string;
  actionId: string;
  isActionRelatedToCurrentProperty: boolean;
}

const CollapsePropertyMatrix = ({
  availableActions = EMPTY_AVAILABLE_ACTIONS,
  childrenForm = EMPTY_CHILDREN_FORM,
  isFormDisabled,
  label,
  lockedRows,
  pathToData,
  propertyName,
  requiredFieldsAction,
  search,
  subject,
}: CollapsePropertyMatrixProps) => {
  const { formatMessage, formatList } = useIntl();
  const { modifiedData } = usePermissionsDataManager();
  const propertyActions = React.useMemo(
    () =>
      availableActions.map((action) => {
        const isActionRelatedToCurrentProperty =
          Array.isArray(action.applyToProperties) &&
          action.applyToProperties.indexOf(propertyName) !== -1 &&
          action.isDisplayed;

        return { label: action.label, actionId: action.actionId, isActionRelatedToCurrentProperty };
      }) satisfies PropertyAction[],
    [availableActions, propertyName]
  );

  const contentTypeKind = pathToData.split('..')[0] as 'collectionTypes' | 'singleTypes';
  const localeValidationErrorLabels = React.useMemo(() => {
    if (propertyName !== 'locales' || subject === undefined) return [];
    const errorKeys = getLocaleValidationErrorActionKeys(modifiedData, contentTypeKind, subject);
    return propertyActions
      .filter(
        ({ actionId, isActionRelatedToCurrentProperty }) =>
          isActionRelatedToCurrentProperty && errorKeys.includes(actionId)
      )
      .map(({ label }) => label);
  }, [propertyName, subject, modifiedData, contentTypeKind, propertyActions]);

  const requiredFieldsActionLabel = propertyActions.find(
    ({ actionId, isActionRelatedToCurrentProperty }) =>
      actionId === requiredFieldsAction && isActionRelatedToCurrentProperty
  )?.label;
  const actionForm =
    requiredFieldsAction === undefined
      ? undefined
      : get(modifiedData, [...pathToData.split('..'), requiredFieldsAction]);
  const missingRequiredFields = React.useMemo(
    () =>
      requiredFieldsAction !== undefined && requiredFieldsActionLabel !== undefined
        ? getMissingRequiredFields(childrenForm, propertyName, requiredFieldsAction, actionForm)
        : [],
    [childrenForm, propertyName, requiredFieldsAction, requiredFieldsActionLabel, actionForm]
  );

  // The warning above looks at every field: a search only decides which rows are listed
  const listedChildren = React.useMemo(
    () =>
      search === undefined
        ? childrenForm
        : childrenForm.filter((field) => fieldMatchesSearch(field, search)),
    [childrenForm, search]
  );
  const listedLockedRows = React.useMemo(
    () =>
      search === undefined
        ? lockedRows
        : lockedRows?.filter(({ label }) => matchesSearch(label, search)),
    [lockedRows, search]
  );

  if (search !== undefined && listedChildren.length === 0 && !listedLockedRows?.length) {
    return null;
  }

  return (
    <Flex display="inline-flex" direction="column" alignItems="stretch" minWidth={0}>
      {missingRequiredFields.length > 0 && requiredFieldsActionLabel !== undefined && (
        <Box paddingLeft={6} paddingRight={6} paddingTop={4}>
          <Flex
            role="alert"
            alignItems="flex-start"
            gap={2}
            padding={3}
            background="warning100"
            borderColor="warning200"
            hasRadius
          >
            <WarningCircle width="1.6rem" height="1.6rem" fill="warning600" />
            <Typography variant="pi" textColor="neutral800">
              <Typography variant="pi" fontWeight="bold">
                {formatMessage(
                  {
                    id: 'Settings.roles.form.permissions.required-fields.title',
                    defaultMessage: '{action} requests will fail.',
                  },
                  { action: requiredFieldsActionLabel }
                )}
              </Typography>{' '}
              {formatMessage(
                {
                  id: 'Settings.roles.form.permissions.required-fields.body',
                  defaultMessage:
                    "{count, plural, one {{fields} is} other {{fields} are}} required, but this role can't set {count, plural, one {it} other {them}}.",
                },
                {
                  count: missingRequiredFields.length,
                  fields: formatList(
                    missingRequiredFields.map((field) => <code key={field}>{field}</code>),
                    { type: 'conjunction' }
                  ),
                }
              )}
            </Typography>
          </Flex>
        </Box>
      )}
      <Header label={label} headers={propertyActions} />
      {localeValidationErrorLabels.length > 0 && (
        <Box paddingLeft={6} paddingTop={2} paddingBottom={2}>
          <Typography role="alert" variant="pi" textColor="danger600">
            {formatMessage(
              {
                id: 'Settings.roles.form.permissions.locales.validation',
                defaultMessage:
                  '{count, plural, one {The {actions} action must apply to at least one locale.} other {The {actions} actions must apply to at least one locale.}}',
              },
              {
                count: localeValidationErrorLabels.length,
                actions: formatList(localeValidationErrorLabels, { type: 'conjunction' }),
              }
            )}
          </Typography>
        </Box>
      )}
      <Box>
        {listedChildren.map(
          ({ children: childrenForm, disabledActions, label, value, required }, i) => (
            <ActionRow
              childrenForm={childrenForm}
              disabledActions={disabledActions}
              key={value}
              label={label}
              isFormDisabled={isFormDisabled}
              name={value}
              required={required}
              propertyActions={propertyActions}
              pathToData={pathToData}
              propertyName={propertyName}
              isOdd={i % 2 === 0}
              search={getSearchBelow(label, search)}
              subject={subject}
            />
          )
        )}
        {listedLockedRows && (
          <LockedRows rows={listedLockedRows} rowsBefore={listedChildren.length} />
        )}
      </Box>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ActionRow
 * -----------------------------------------------------------------------------------------------*/

interface ActionRowProps extends Pick<
  SubActionRowProps,
  'childrenForm' | 'isFormDisabled' | 'propertyActions' | 'propertyName' | 'subject'
> {
  /**
   * The actions whose cell is disabled for this field (`SubjectProperty.disabledActions`).
   */
  disabledActions?: string[];
  label: string;
  name: string;
  required?: boolean;
  pathToData: string;
  isOdd?: boolean;
  /**
   * What is left to search for below this row, when the row is listed because of what is in it:
   * the group opens and lists the fields that match. Absent when its own label matches, or without
   * a search.
   */
  search?: string;
}

const ActionRow = ({
  childrenForm = EMPTY_ACTION_ROW_CHILDREN_FORM,
  disabledActions,
  label,
  isFormDisabled = false,
  name,
  required = false,
  pathToData,
  propertyActions,
  propertyName,
  isOdd = false,
  search,
  subject,
}: ActionRowProps) => {
  const { formatMessage } = useIntl();
  const [rowToOpen, setRowToOpen] = React.useState<string | null>(null);
  const {
    modifiedData,
    onChangeCollectionTypeLeftActionRowCheckbox,
    onChangeParentCheckbox,
    onChangeSimpleCheckbox,
    checkUserHasPermission,
    checkUserHasGroupPermission,
  } = usePermissionsDataManager();

  const isActive = rowToOpen === name;

  const recursiveChildren = React.useMemo(() => {
    if (!Array.isArray(childrenForm)) {
      return [];
    }

    return childrenForm;
  }, [childrenForm]);

  const isCollapsable = recursiveChildren.length > 0;

  // A group is listed because a field in it matches: open it, once for each search
  React.useEffect(() => {
    if (search !== undefined && isCollapsable) {
      setRowToOpen(name);
    }
  }, [search, isCollapsable, name]);

  const handleClick = React.useCallback(() => {
    if (isCollapsable) {
      setRowToOpen((prev) => {
        if (prev === name) {
          return null;
        }

        return name;
      });
    }
  }, [isCollapsable, name]);

  const handleChangeLeftRowCheckbox: RowLabelWithCheckboxProps['onChange'] = ({
    target: { value },
  }) => {
    onChangeCollectionTypeLeftActionRowCheckbox(pathToData, propertyName, name, value);
  };

  // The cells the row checkbox can change: not the ones the layout disables
  const editableActionIds = React.useMemo(
    () =>
      propertyActions
        .filter(
          ({ actionId, isActionRelatedToCurrentProperty }) =>
            isActionRelatedToCurrentProperty &&
            !isCellDisabledByLayout({ children: recursiveChildren, disabledActions }, actionId)
        )
        .map(({ actionId }) => actionId),
    [propertyActions, recursiveChildren, disabledActions]
  );
  const hasCells = propertyActions.some(
    ({ isActionRelatedToCurrentProperty }) => isActionRelatedToCurrentProperty
  );

  // Nothing for the row checkbox to change: the layout disables every cell
  const hasNoEditableCell = hasCells && editableActionIds.length === 0;

  const { hasAllActionsSelected, hasSomeActionsSelected } = React.useMemo(() => {
    return getRowLabelCheckboxState(
      editableActionIds,
      modifiedData,
      pathToData,
      propertyName,
      name
    );
  }, [editableActionIds, modifiedData, pathToData, propertyName, name]);

  return (
    <>
      <Wrapper
        alignItems="center"
        $isCollapsable={isCollapsable}
        $isActive={isActive}
        background={isOdd ? 'neutral100' : 'neutral0'}
      >
        <Flex>
          <RowLabelWithCheckbox
            onChange={handleChangeLeftRowCheckbox}
            onClick={handleClick}
            isCollapsable={isCollapsable}
            isFormDisabled={isFormDisabled || hasNoEditableCell}
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

              // Off by the layout. Not the user's ceiling, which has its own reason to show
              // (`userHasPermission`)
              const isCellLocked = isCellDisabledByLayout(
                { children: recursiveChildren, disabledActions },
                actionId
              );

              if (!isCollapsable) {
                const checkboxValue = get(modifiedData, checkboxName, false);
                const userHasPermission = checkUserHasPermission(
                  actionId,
                  subject,
                  name,
                  propertyName
                );

                return (
                  <Flex
                    key={actionId}
                    width={cellWidth}
                    position="relative"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <UnheldPermissionTooltip
                      isFormDisabled={isFormDisabled}
                      userHasPermission={userHasPermission}
                    >
                      <Checkbox
                        disabled={isFormDisabled || !userHasPermission || isCellLocked}
                        name={checkboxName.join('..')}
                        aria-label={formatMessage(
                          {
                            id: `Settings.permissions.select-by-permission`,
                            defaultMessage: 'Select {label} permission',
                          },
                          { label: `${name} ${label}` }
                        )}
                        onCheckedChange={(value) => {
                          onChangeSimpleCheckbox({
                            target: {
                              name: checkboxName.join('..'),
                              value: !!value,
                            },
                          });
                        }}
                        checked={checkboxValue}
                      />
                    </UnheldPermissionTooltip>
                  </Flex>
                );
              }

              const data = get(modifiedData, checkboxName, {});

              const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(data);
              const userHasPermission = checkUserHasGroupPermission(
                actionId,
                subject,
                name,
                propertyName
              );

              return (
                <Flex
                  key={label}
                  width={cellWidth}
                  position="relative"
                  justifyContent="center"
                  alignItems="center"
                >
                  <UnheldPermissionTooltip
                    isFormDisabled={isFormDisabled}
                    userHasPermission={userHasPermission}
                  >
                    <Checkbox
                      disabled={isFormDisabled || !userHasPermission || isCellLocked}
                      name={checkboxName.join('..')}
                      onCheckedChange={(value) => {
                        onChangeParentCheckbox({
                          target: {
                            name: checkboxName.join('..'),
                            value: !!value,
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
                      checked={hasSomeActionsSelected ? 'indeterminate' : hasAllActionsSelected}
                    />
                  </UnheldPermissionTooltip>
                </Flex>
              );
            })}
          </Flex>
        </Flex>
      </Wrapper>
      {isActive && (
        <SubActionRow
          childrenForm={recursiveChildren}
          disabledActions={disabledActions}
          isFormDisabled={isFormDisabled}
          parentName={name}
          pathToDataFromActionRow={pathToData}
          propertyName={propertyName}
          propertyActions={propertyActions}
          recursiveLevel={0}
          search={search}
          subject={subject}
        />
      )}
    </>
  );
};

/**
 *
 * Returns the state of the left checkbox of a ActionRow main checkbox
 */
const getRowLabelCheckboxState = (
  actionIds: string[],
  modifiedData: PermissionsDataManagerContextValue['modifiedData'],
  pathToContentType: string,
  propertyToCheck: string,
  targetKey: string
) => {
  const data = actionIds.reduce<Record<string, boolean>>((acc, current) => {
    const mainData = get(
      modifiedData,
      [...pathToContentType.split('..'), current, 'properties', propertyToCheck, targetKey],
      false
    );

    acc[current] = mainData;

    return acc;
  }, {});

  return getCheckboxState(data);
};

const Wrapper = styled<FlexComponent>(Flex)<{ $isCollapsable?: boolean; $isActive?: boolean }>`
  height: ${rowHeight};
  flex: 1;

  &:hover {
    ${({ $isCollapsable, theme }) => $isCollapsable && activeStyle(theme)}
  }

  ${({ $isCollapsable }) =>
    $isCollapsable &&
    `
      ${CarretIcon} {
        display: flex;
      }
  `}
  ${({ $isActive, theme }) => $isActive && activeStyle(theme)};
`;

const CarretIcon = styled(CaretDown)<{ $isActive: boolean }>`
  display: none;

  svg {
    width: 1.4rem;
  }

  path {
    fill: ${({ theme }) => theme.colors.neutral200};
  }

  transform: rotate(${({ $isActive }) => ($isActive ? '180' : '0')}deg);
  margin-left: ${({ theme }) => theme.spaces[2]};
`;

/* -------------------------------------------------------------------------------------------------
 * SubActionRow
 * -----------------------------------------------------------------------------------------------*/

interface SubActionRowProps {
  childrenForm: SubjectProperty['children'];
  /**
   * The actions the layout disables for the row this one opens from, which it passes on to every
   * field under it.
   */
  disabledActions?: string[];
  isFormDisabled?: boolean;
  parentName: string;
  pathToDataFromActionRow: string;
  propertyActions: PropertyAction[];
  propertyName: string;
  /**
   * What is left to search for among `childrenForm`: only the fields that match are listed.
   * Everything is listed when absent.
   */
  search?: string;
  subject?: string;
  recursiveLevel: number;
}

const SubActionRow = ({
  childrenForm = EMPTY_SUB_ACTION_ROW_CHILDREN_FORM,
  disabledActions = EMPTY_DISABLED_ACTIONS,
  isFormDisabled,
  recursiveLevel,
  pathToDataFromActionRow,
  propertyActions,
  parentName,
  propertyName,
  search,
  subject,
}: SubActionRowProps) => {
  const { formatMessage } = useIntl();
  const {
    modifiedData,
    onChangeParentCheckbox,
    onChangeSimpleCheckbox,
    checkUserHasPermission,
    checkUserHasGroupPermission,
  } = usePermissionsDataManager();
  const [rowToOpen, setRowToOpen] = React.useState<string | null>(null);

  const handleClickToggleSubLevel = (name: string) => {
    setRowToOpen((prev) => {
      if (prev === name) {
        return null;
      }

      return name;
    });
  };

  const displayedRecursiveChildren = React.useMemo(() => {
    if (!rowToOpen) {
      return null;
    }

    return childrenForm.find(({ value }) => value === rowToOpen);
  }, [rowToOpen, childrenForm]);

  const listedChildren = React.useMemo(
    () =>
      search === undefined
        ? childrenForm
        : childrenForm.filter((child) => fieldMatchesSearch(child, search)),
    [childrenForm, search]
  );

  // A group is listed because a field in it matches: open the first one, once for each search
  React.useEffect(() => {
    if (search === undefined) {
      return;
    }

    const group = childrenForm.find(
      ({ label, children }) =>
        Array.isArray(children) &&
        getSearchBelow(label, search) !== undefined &&
        children.some((child) => fieldMatchesSearch(child, search))
    );

    if (group) {
      setRowToOpen(group.value);
    }
  }, [search, childrenForm]);

  return (
    <Box paddingLeft={`3.2rem`}>
      <TopTimeline />
      {listedChildren.map((child, index) => {
        const { label, value, required, children: subChildrenForm } = child;
        const rowDisabledActions = [...disabledActions, ...(child.disabledActions ?? [])];
        const isVisible = index + 1 < listedChildren.length;
        const isArrayType = Array.isArray(subChildrenForm);
        const isActive = rowToOpen === value;

        return (
          <LeftBorderTimeline key={value} $isVisible={isVisible}>
            <Flex height={rowHeight}>
              <StyledBox>
                <Svg
                  width="20"
                  height="23"
                  viewBox="0 0 20 23"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  $color="primary200"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.02477 14.7513C8.65865 17.0594 11.6046 18.6059 17.5596 18.8856C18.6836 18.9384 19.5976 19.8435 19.5976 20.9688V20.9688C19.5976 22.0941 18.6841 23.0125 17.5599 22.9643C10.9409 22.6805 6.454 20.9387 3.75496 17.1258C0.937988 13.1464 0.486328 7.39309 0.486328 0.593262H4.50974C4.50974 7.54693 5.06394 11.9813 7.02477 14.7513Z"
                    fill="#D9D8FF"
                  />
                </Svg>
              </StyledBox>
              <Flex style={{ flex: 1 }}>
                <RowStyle $level={recursiveLevel} $isActive={isActive} $isCollapsable={isArrayType}>
                  <CollapseLabel
                    alignItems="center"
                    $isCollapsable={isArrayType}
                    {...(isArrayType && {
                      onClick: () => handleClickToggleSubLevel(value),
                      'aria-expanded': isActive,
                      onKeyDown: ({ key }: React.KeyboardEvent<HTMLDivElement>) =>
                        (key === 'Enter' || key === ' ') && handleClickToggleSubLevel(value),
                      tabIndex: 0,
                      role: 'button',
                    })}
                    title={label}
                  >
                    <RowLabel ellipsis>{label}</RowLabel>
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
                      // `parentName` uses the '..' form-path separator; permission checks take a
                      // dot-separated field path (e.g. `seo.meta.robots`).
                      const fieldPath = [...parentName.split('..'), value].join('.');
                      // Off by the layout
                      const isCellLocked = isCellDisabledByLayout(
                        { children: subChildrenForm, disabledActions: rowDisabledActions },
                        actionId
                      );

                      if (!subChildrenForm) {
                        const userHasPermission = checkUserHasPermission(
                          actionId,
                          subject,
                          fieldPath,
                          propertyName
                        );

                        return (
                          <Flex
                            key={propertyLabel}
                            position="relative"
                            width={cellWidth}
                            justifyContent="center"
                            alignItems="center"
                          >
                            <UnheldPermissionTooltip
                              isFormDisabled={isFormDisabled}
                              userHasPermission={userHasPermission}
                            >
                              <Checkbox
                                disabled={isFormDisabled || !userHasPermission || isCellLocked}
                                name={checkboxName.join('..')}
                                aria-label={formatMessage(
                                  {
                                    id: `Settings.permissions.select-by-permission`,
                                    defaultMessage: 'Select {label} permission',
                                  },
                                  { label: `${parentName} ${label} ${propertyLabel}` }
                                )}
                                onCheckedChange={(value) => {
                                  onChangeSimpleCheckbox({
                                    target: {
                                      name: checkboxName.join('..'),
                                      value: !!value,
                                    },
                                  });
                                }}
                                checked={checkboxValue}
                              />
                            </UnheldPermissionTooltip>
                          </Flex>
                        );
                      }

                      const { hasAllActionsSelected, hasSomeActionsSelected } =
                        getCheckboxState(checkboxValue);
                      const userHasPermission = checkUserHasGroupPermission(
                        actionId,
                        subject,
                        fieldPath,
                        propertyName
                      );

                      return (
                        <Flex
                          key={propertyLabel}
                          position="relative"
                          width={cellWidth}
                          justifyContent="center"
                          alignItems="center"
                        >
                          <UnheldPermissionTooltip
                            isFormDisabled={isFormDisabled}
                            userHasPermission={userHasPermission}
                          >
                            <Checkbox
                              key={propertyLabel}
                              disabled={isFormDisabled || !userHasPermission || isCellLocked}
                              name={checkboxName.join('..')}
                              aria-label={formatMessage(
                                {
                                  id: `Settings.permissions.select-by-permission`,
                                  defaultMessage: 'Select {label} permission',
                                },
                                { label: `${parentName} ${label} ${propertyLabel}` }
                              )}
                              // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                              onCheckedChange={(value) => {
                                onChangeParentCheckbox({
                                  target: {
                                    name: checkboxName.join('..'),
                                    value: !!value,
                                  },
                                });
                              }}
                              checked={
                                hasSomeActionsSelected ? 'indeterminate' : hasAllActionsSelected
                              }
                            />
                          </UnheldPermissionTooltip>
                        </Flex>
                      );
                    }
                  )}
                </Flex>
              </Flex>
            </Flex>
            {displayedRecursiveChildren && isActive && (
              <Box paddingBottom={2}>
                <SubActionRow
                  disabledActions={rowDisabledActions}
                  isFormDisabled={isFormDisabled}
                  parentName={`${parentName}..${value}`}
                  pathToDataFromActionRow={pathToDataFromActionRow}
                  propertyActions={propertyActions}
                  propertyName={propertyName}
                  recursiveLevel={recursiveLevel + 1}
                  childrenForm={displayedRecursiveChildren.children}
                  search={getSearchBelow(displayedRecursiveChildren.label, search)}
                  subject={subject}
                />
              </Box>
            )}
          </LeftBorderTimeline>
        );
      })}
    </Box>
  );
};

const LeftBorderTimeline = styled<BoxComponent>(Box)<{ $isVisible?: boolean }>`
  border-left: ${({ $isVisible, theme }) =>
    $isVisible ? `4px solid ${theme.colors.primary200}` : '4px solid transparent'};
`;

const RowStyle = styled<FlexComponent>(Flex)<{
  $level: number;
  $isCollapsable?: boolean;
  $isActive?: boolean;
}>`
  padding-left: ${({ theme }) => theme.spaces[4]};
  width: ${({ $level }) => 145 - $level * 36}px;

  &:hover {
    ${({ $isCollapsable, theme }) => $isCollapsable && activeStyle(theme)}
  }

  ${({ $isCollapsable }) =>
    $isCollapsable &&
    `
      ${CarretIcon} {
        display: flex;
      }
  `}
  ${({ $isActive, theme }) => $isActive && activeStyle(theme)};
`;

const RowLabel = styled<TypographyComponent>(Typography)``;

const TopTimeline = styled.div`
  padding-top: ${({ theme }) => theme.spaces[2]};
  margin-top: ${({ theme }) => theme.spaces[2]};
  width: 0.4rem;
  background-color: ${({ theme }) => theme.colors.primary200};
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
`;

const StyledBox = styled<BoxComponent>(Box)`
  transform: translate(-4px, -12px);

  &:before {
    content: '';
    width: 0.4rem;
    height: 1.2rem;
    background: ${({ theme }) => theme.colors.primary200};
    display: block;
  }
`;

const Svg = styled.svg<{ $color: keyof DefaultTheme['colors'] }>`
  position: relative;
  flex-shrink: 0;
  transform: translate(-0.5px, -1px);

  * {
    fill: ${({ theme, $color }) => theme.colors[$color]};
  }
`;

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/

interface HeaderProps {
  headers?: PropertyAction[];
  label: string;
}

const Header = ({ headers = EMPTY_HEADERS, label }: HeaderProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex>
      <Flex width={firstRowWidth} height={rowHeight} shrink={0} alignItems="center" paddingLeft={6}>
        <Typography variant="sigma" textColor="neutral500">
          {formatMessage(
            {
              id: 'Settings.roles.form.permission.property-label',
              defaultMessage: '{label} permissions',
            },
            { label }
          )}
        </Typography>
      </Flex>
      {headers.map((header) => {
        if (!header.isActionRelatedToCurrentProperty) {
          return <Flex width={cellWidth} shrink={0} key={header.label} />;
        }

        return (
          <Flex width={cellWidth} shrink={0} justifyContent="center" key={header.label}>
            <Typography variant="sigma" textColor="neutral500">
              {formatMessage({
                id: `Settings.roles.form.permissions.${header.label.toLowerCase()}`,
                defaultMessage: header.label,
              })}
            </Typography>
          </Flex>
        );
      })}
    </Flex>
  );
};

const activeStyle = (theme: DefaultTheme) => css`
  color: ${theme.colors.primary600};
  font-weight: ${theme.fontWeights.bold};

  ${CarretIcon} {
    path {
      fill: ${theme.colors.primary600};
    }
  }
`;

export { CollapsePropertyMatrix };
