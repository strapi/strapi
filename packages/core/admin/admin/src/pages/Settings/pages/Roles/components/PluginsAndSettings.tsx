import * as React from 'react';

import {
  Accordion,
  Badge,
  Box,
  BoxComponent,
  Checkbox,
  EmptyStateLayout,
  Flex,
  Grid,
  Modal,
  Typography,
} from '@strapi/design-system';
import { EmptyDocuments } from '@strapi/icons/symbols';
import get from 'lodash/get';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import {
  SettingPermission,
  PluginPermission,
} from '../../../../../../../shared/contracts/permissions';
import { UnsavedChangesModal } from '../../../../../components/UnsavedChangesModal';
import { capitalise } from '../../../../../utils/strings';
import {
  PermissionsDataManagerContextValue,
  usePermissionsDataManager,
} from '../hooks/usePermissionsDataManager';
import { useReportOpenSubject } from '../hooks/useReportOpenSubject';
import { createArrayOfValues } from '../utils/createArrayOfValues';
import { ChildrenForm, ConditionForm } from '../utils/forms';
import { RecursiveRecordOfBooleans, getCheckboxState } from '../utils/getCheckboxState';
import { removeConditionKeyFromData } from '../utils/removeConditionKeyFromData';
import { getSearchBelow, matchesSearch, normalizeSearch } from '../utils/search';

import { ConditionsButton } from './ConditionsButton';
import { ConditionsModal } from './ConditionsModal';
import { NoSearchResults, PermissionsSearch } from './PermissionsSearch';
import { UnheldPermissionTooltip } from './UnheldPermissionTooltip';

import type { PermissionsProps } from './Permissions';
import type { GenericLayout } from '../utils/layouts';

const EMPTY_ACTIONS: NonNullable<SubCategoryProps['actions']> = [];

/* -------------------------------------------------------------------------------------------------
 * PluginsAndSettingsPermissions
 * -----------------------------------------------------------------------------------------------*/

type Layout = GenericLayout<SettingPermission | PluginPermission>[];

/**
 * The name a category goes by in the accordion: the last part of the key of the plugin or category.
 */
const getCategoryName = (category: string) => category.split('::').pop() ?? '';

const getCategoryDisplayName = (category: string) => {
  const categoryName = getCategoryName(category);

  return categoryName === 'upload' ? 'Media Library' : capitalise(categoryName.replace(/-/g, ' '));
};

interface ListedCategory {
  layout: Layout[number];
  /** What is left to search for in the category, `undefined` when it is listed whole. */
  search?: string;
}

/**
 * What a search lists: a category whose name matches with everything in it, or the sub-categories
 * whose name matches (with all their actions) or that have an action whose label matches.
 */
const listCategories = (layout: Layout, search: string): ListedCategory[] =>
  layout.flatMap((category) => {
    const categorySearch = getSearchBelow(getCategoryDisplayName(category.category), search);

    if (categorySearch === undefined) {
      return [{ layout: category }];
    }

    const childrenForm = category.childrenForm.filter(
      ({ subCategoryName, actions }) =>
        matchesSearch(subCategoryName, search) ||
        actions.some(({ displayName }) => matchesSearch(displayName, search))
    );

    return childrenForm.length > 0
      ? [{ layout: { ...category, childrenForm }, search: categorySearch }]
      : [];
  });

interface PluginsAndSettingsPermissionsProps
  extends
    Pick<RowProps, 'kind' | 'isFormDisabled'>,
    Pick<PermissionsProps, 'onOpenSubjectChange' | 'renderSubjectDetails' | 'searchable'> {
  layout: Layout;
}

const PluginsAndSettingsPermissions = ({
  layout,
  onOpenSubjectChange,
  renderSubjectDetails,
  searchable = false,
  ...restProps
}: PluginsAndSettingsPermissionsProps) => {
  const { formatMessage } = useIntl();
  const reportOpenSubject = useReportOpenSubject(restProps.kind, onOpenSubjectChange);
  const [query, setQuery] = React.useState('');
  const [openCategory, setOpenCategory] = React.useState('');
  const search = searchable ? normalizeSearch(query) : '';

  const listedCategories = React.useMemo<ListedCategory[]>(
    () =>
      search ? listCategories(layout, search) : layout.map((category) => ({ layout: category })),
    [layout, search]
  );

  // The accordion reports an empty value when its item closes
  const handleOpenCategoryChange = (value: string) => {
    setOpenCategory(value);
    reportOpenSubject(value || null);
  };

  const handleSearchChange = (nextQuery: string) => {
    setQuery(nextQuery);

    // When the search changes, the first category it lists opens, unless the one that is open is
    // listed too: the match is on screen without a click. Clearing the search leaves things as
    // they are.
    const nextSearch = normalizeSearch(nextQuery);

    if (nextSearch !== '' && nextSearch !== search) {
      const nextListed = listCategories(layout, nextSearch);

      if (
        nextListed.length > 0 &&
        !nextListed.some(({ layout: { category } }) => category === openCategory)
      ) {
        handleOpenCategoryChange(nextListed[0].layout.category);
      }
    }
  };

  // Nothing to search or to tick: no search box either
  if (layout.length === 0) {
    return (
      <Box padding={6} background="neutral0">
        <EmptyStateLayout
          icon={<EmptyDocuments width="16rem" />}
          content={formatMessage({
            id: 'Settings.permissions.empty.nothing-to-set',
            defaultMessage: 'Nothing to set here',
          })}
        />
      </Box>
    );
  }

  return (
    <Box padding={6} background="neutral0">
      {searchable && (
        <Box paddingBottom={4}>
          <PermissionsSearch kind={restProps.kind} value={query} onChange={handleSearchChange} />
        </Box>
      )}
      {search && listedCategories.length === 0 && (
        <NoSearchResults kind={restProps.kind} query={query} />
      )}
      <Accordion.Root size="M" value={openCategory} onValueChange={handleOpenCategoryChange}>
        {listedCategories.map(
          ({ layout: { category, categoryId, childrenForm }, search: categorySearch }, index) => {
            return (
              <Row
                key={category}
                childrenForm={childrenForm}
                variant={index % 2 === 1 ? 'primary' : 'secondary'}
                name={category}
                pathToData={[restProps.kind, categoryId]}
                search={categorySearch}
                renderDetails={renderSubjectDetails}
                {...restProps}
              />
            );
          }
        )}
      </Accordion.Root>
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Row
 * -----------------------------------------------------------------------------------------------*/

interface RowProps
  extends Pick<Layout[number], 'childrenForm'>, Pick<Accordion.HeaderProps, 'variant'> {
  kind: Exclude<keyof PermissionsDataManagerContextValue['modifiedData'], `${string}Types`>;
  name: string;
  isFormDisabled?: boolean;
  pathToData: string[];
  /**
   * What is left to search for in the sub-categories: they list the actions that match, unless
   * their own name does. Everything is listed when absent.
   */
  search?: string;
  renderDetails?: PermissionsProps['renderSubjectDetails'];
}

const Row = ({
  childrenForm,
  kind,
  name,
  isFormDisabled = false,
  variant,
  pathToData,
  renderDetails,
  search,
}: RowProps) => {
  const { formatMessage } = useIntl();

  const categoryName = getCategoryName(name);
  const categoryDisplayName = getCategoryDisplayName(name);
  // The section stays visible and editable: hiding it would drop its grants on the next save
  const isDisabledByConfig =
    childrenForm.length > 0 &&
    childrenForm.every(({ actions }) =>
      actions.every((action) => 'disabledByConfig' in action && action.disabledByConfig === true)
    );

  return (
    <Accordion.Item value={name}>
      <Accordion.Header variant={variant}>
        <Accordion.Trigger
          caretPosition="right"
          description={`${formatMessage(
            { id: 'Settings.permissions.category', defaultMessage: categoryName },
            { category: categoryName }
          )} ${kind === 'plugins' ? 'plugin' : kind}`}
        >
          {isDisabledByConfig === true ? (
            // Next to the title, not after the caret, so the caret stays aligned with other rows.
            // The trigger clips its single line without an ellipsis, so on narrow screens the
            // badge moves under the title and, if still too wide, wraps its own text.
            <Flex tag="span" gap={2} wrap="wrap">
              {categoryDisplayName}
              <WrappingBadge>
                {formatMessage({
                  id: 'Settings.permissions.category.disabled-by-config',
                  defaultMessage: 'Disabled by configuration',
                })}
              </WrappingBadge>
            </Flex>
          ) : (
            categoryDisplayName
          )}
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content>
        <Box padding={6}>
          {childrenForm.map(({ actions, subCategoryName, subCategoryId }) => (
            <SubCategory
              key={subCategoryName}
              actions={actions}
              categoryName={categoryName}
              isFormDisabled={isFormDisabled}
              subCategoryName={subCategoryName}
              pathToData={[...pathToData, subCategoryId]}
              search={getSearchBelow(subCategoryName, search)}
            />
          ))}
          {renderDetails?.({ tab: kind, subject: name })}
        </Box>
      </Accordion.Content>
    </Accordion.Item>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SubCategory
 * -----------------------------------------------------------------------------------------------*/

interface SubCategoryProps {
  actions?: Array<SettingPermission | PluginPermission>;
  categoryName: string;
  isFormDisabled?: boolean;
  subCategoryName: string;
  pathToData: string[];
  /**
   * What is left to search for among the actions: only the ones whose label matches are listed (the
   * conditions still cover them all). Everything is listed when absent.
   */
  search?: string;
}

const SubCategory = ({
  actions = EMPTY_ACTIONS,
  categoryName,
  isFormDisabled,
  subCategoryName,
  pathToData,
  search,
}: SubCategoryProps) => {
  const {
    availableConditions,
    modifiedData,
    onChangeParentCheckbox,
    onChangeSimpleCheckbox,
    checkUserHasPermission,
    inheritConditions,
  } = usePermissionsDataManager();
  const [isConditionModalOpen, setIsConditionModalOpen] = React.useState(false);
  const { formatMessage } = useIntl();

  const mainData = get(modifiedData, pathToData, {});

  const dataWithoutCondition = React.useMemo(() => {
    return Object.keys(mainData).reduce<RecursiveRecordOfBooleans>((acc, current) => {
      acc[current] = removeConditionKeyFromData(mainData[current])!;

      return acc;
    }, {});
  }, [mainData]);

  const { hasAllActionsSelected, hasSomeActionsSelected } = getCheckboxState(dataWithoutCondition);

  // We need to format the actions so it matches the shape of the ConditionsModal actions props
  const formattedActions = React.useMemo(() => {
    return actions.map((action) => {
      const checkboxName = [...pathToData, action.action, 'properties', 'enabled'];
      const checkboxValue = get(modifiedData, checkboxName, false);
      const conditionValue = get(modifiedData, [...pathToData, action.action, 'conditions'], {});
      const hasConditions = createArrayOfValues(conditionValue).some((val) => val);

      return {
        ...action,
        isDisplayed: checkboxValue,
        checkboxName: checkboxName.join('..'),
        hasSomeActionsSelected: checkboxValue,
        value: checkboxValue,
        hasConditions,
        label: action.displayName,
        actionId: action.action,
        pathToConditionsObject: [...pathToData, action.action],
      };
    });
  }, [actions, modifiedData, pathToData]);

  const listedActions = React.useMemo(
    () =>
      search === undefined
        ? formattedActions
        : formattedActions.filter(({ displayName }) => matchesSearch(displayName, search)),
    [formattedActions, search]
  );

  const datum: ChildrenForm = get(modifiedData, [...pathToData], {});

  const doesButtonHasCondition = createArrayOfValues(
    Object.entries(datum).reduce<Record<string, ConditionForm>>((acc, current) => {
      const [catName, { conditions }] = current;

      acc[catName] = conditions;

      return acc;
    }, {})
  ).some((val) => val);

  return (
    <>
      <Box>
        <Flex justifyContent="space-between" alignItems="center">
          <Box paddingRight={4}>
            <Typography variant="sigma" textColor="neutral600">
              {subCategoryName}
            </Typography>
          </Box>
          <Border flex={1} />
          <Box paddingLeft={4}>
            <Checkbox
              name={pathToData.join('..')}
              disabled={isFormDisabled}
              // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
              onCheckedChange={(value) => {
                onChangeParentCheckbox({
                  target: {
                    name: pathToData.join('..'),
                    value: !!value,
                  },
                });
              }}
              checked={hasSomeActionsSelected ? 'indeterminate' : hasAllActionsSelected}
            >
              {formatMessage({ id: 'app.utils.select-all', defaultMessage: 'Select all' })}
            </Checkbox>
          </Box>
        </Flex>
        <Flex paddingTop={6} paddingBottom={6}>
          <Grid.Root gap={2} style={{ flex: 1 }}>
            {listedActions.map(({ checkboxName, value, action, displayName, hasConditions }) => {
              const userHasPermission = checkUserHasPermission(action, null);

              return (
                <Grid.Item col={4} m={6} xs={12} key={action} direction="column" alignItems="start">
                  <CheckboxWrapper
                    $disabled={isFormDisabled || !userHasPermission}
                    $hasConditions={hasConditions}
                  >
                    <UnheldPermissionTooltip
                      isFormDisabled={isFormDisabled}
                      userHasPermission={userHasPermission}
                    >
                      <Checkbox
                        name={checkboxName}
                        disabled={isFormDisabled || !userHasPermission}
                        // Keep same signature as packages/core/admin/admin/src/components/Roles/Permissions/index.js l.91
                        onCheckedChange={(value) => {
                          onChangeSimpleCheckbox({
                            target: {
                              name: checkboxName,
                              value: !!value,
                            },
                          });
                        }}
                        checked={value}
                      >
                        {displayName}
                      </Checkbox>
                    </UnheldPermissionTooltip>
                  </CheckboxWrapper>
                </Grid.Item>
              );
            })}
          </Grid.Root>
          {availableConditions.length > 0 && (
            <UnsavedChangesModal open={isConditionModalOpen} onOpenChange={setIsConditionModalOpen}>
              <Modal.Trigger>
                <ConditionsButton hasConditions={doesButtonHasCondition} />
              </Modal.Trigger>
              <ConditionsModal
                headerBreadCrumbs={[categoryName, subCategoryName]}
                actions={formattedActions}
                isFormDisabled={isFormDisabled}
                isReadOnly={inheritConditions}
                onClose={() => {
                  setIsConditionModalOpen(false);
                }}
              />
            </UnsavedChangesModal>
          )}
        </Flex>
      </Box>
    </>
  );
};

const WrappingBadge = styled(Badge)`
  white-space: normal;
`;

const Border = styled<BoxComponent>(Box)`
  align-self: center;
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const CheckboxWrapper = styled.div<{ $hasConditions?: boolean; $disabled?: boolean }>`
  position: relative;
  word-break: keep-all;
  ${({ $hasConditions, $disabled, theme }) =>
    $hasConditions &&
    `
    &:before {
      content: '';
      position: absolute;
      top: -0.4rem;
      left: -0.8rem;
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 2rem;
      background: ${$disabled ? theme.colors.neutral100 : theme.colors.primary600};
    }
  `}
`;

export { PluginsAndSettingsPermissions };
