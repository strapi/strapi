import * as React from 'react';

import {
  BackButton,
  Blocker,
  Form,
  Layouts,
  Page,
  Permissions,
  useAPIErrorHandler,
  useForm,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import { Alert, Box, Button, Flex, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';

import { NotFound } from '../../components/NotFound';
import { PERMISSIONS } from '../../constants';
import { pluginId } from '../../pluginId';
import { useLazyGetConditionsQuery } from '../../services/conditions';
import { useGetPermissionLayoutQuery } from '../../services/permissions';
import {
  useCreateRoleMutation,
  useGetRoleQuery,
  useUpdateRoleMutation,
} from '../../services/roles';
import { getTranslation } from '../../utils/getTranslation';
import { useQuestion } from '../../utils/useQuestion';

import { BulkChangeDialog } from './components/BulkChangeDialog';
import { DetailsPane } from './components/DetailsPane';
import { ProblemsBanner } from './components/ProblemsBanner';
import { RenameRoleDialog } from './components/RenameRoleDialog';
import { ReviewChangesModal } from './components/ReviewChangesModal';
import { RoleDetails } from './components/RoleDetails';
import { RulesDot } from './components/RulesDot';
import { SubjectSettingsModal } from './components/SubjectSettingsModal';
import { toEditorModel, toPermissionDiff, toPermissionRows } from './utils/editorModel';
import {
  createEditorRows,
  toGrantedRows,
  useEditorRows,
  useGrantedActions,
} from './utils/editorRows';
import { describeSave } from './utils/saveReview';
import { findSelfWritableWarnings } from './utils/selfWritableWarnings';

import type { BulkQuestion } from './components/BulkChangeDialog';
import type { RenameQuestion } from './components/RenameRoleDialog';
import type { RoleDetailsValues } from './components/RoleDetails';
import type { ChangeGroup, EditorModel, SubjectSettings } from './utils/editorModel';
import type { EditorRows } from './utils/editorRows';
import type { SelfWritableWarning } from './utils/selfWritableWarnings';
import type {
  LayoutContentType,
  PermissionLayout,
  PermissionRow,
} from '../../../../shared/contracts/permissions';
import type { RoleDetail } from '../../../../shared/contracts/roles';
import type {
  PermissionsProps,
  PermissionsRow,
  PermissionsTabId,
} from '@strapi/admin/strapi-admin';

/** Where the list is, and where Back and a created role go: the roles page is mounted here */
const ROLES_PATH = `/settings/${pluginId}/roles`;

/**
 * A form value nothing shows: it turns true on the first change of the editor or of the rows to
 * remove, which `<Form>` does not see otherwise, so `modified` and `<Blocker />` know about them.
 */
const PERMISSIONS_CHANGED = 'permissionsChanged';

interface RoleFormValues extends RoleDetailsValues {
  [PERMISSIONS_CHANGED]: boolean;
}

type EditorMode = 'edit' | 'create' | 'duplicate';

/** What a save the server refused leaves on the page, above the editor and its edits */
type SaveFailure = { kind: 'conflict' } | { kind: 'error'; message: string };

/** The only tab the plugin names itself: its Settings tab lists the project's own routes */
const TAB_LABELS: PermissionsProps['tabLabels'] = {
  settings: {
    id: getTranslation('roles.edit.tab.custom-routes'),
    defaultMessage: 'Custom routes',
  },
};

/** A column ticked or unticked on this many content types or more is asked about first */
const BULK_CONFIRM_FROM = 3;

/** The server answered 404: nothing has this id */
const isNotFound = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { status?: unknown }).status === 404;

/** 409 `ROLE_CHANGED`: the role was saved by someone else after this editor loaded it */
const isRoleChanged = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const { status, details } = error as { status?: unknown; details?: unknown };

  return (
    status === 409 ||
    (typeof details === 'object' &&
      details !== null &&
      (details as { code?: unknown }).code === 'ROLE_CHANGED')
  );
};

/* -------------------------------------------------------------------------------------------------
 * Settings of a content type
 * -----------------------------------------------------------------------------------------------*/

interface SubjectSettingsContextValue {
  contentTypes: Map<string, LayoutContentType>;
  settings: Record<string, SubjectSettings>;
  rows: EditorRows;
  apply: (uid: string, next: SubjectSettings) => void;
}

/**
 * What the Settings button of each content type reads. The editor is memoized and draws those
 * buttons through `renderSubjectActions`, so they get their data from here: a change of settings
 * renders the buttons and not the editor.
 */
const SubjectSettingsContext = React.createContext<SubjectSettingsContextValue | null>(null);

interface SubjectSettingsProviderProps extends Pick<
  SubjectSettingsContextValue,
  'settings' | 'rows'
> {
  layout: PermissionLayout;
  onSettingsChange: (uid: string, next: SubjectSettings) => void;
  children: React.ReactNode;
}

const SubjectSettingsProvider = ({
  layout,
  settings,
  rows,
  onSettingsChange,
  children,
}: SubjectSettingsProviderProps) => {
  const setFormValue = useForm('SubjectSettingsProvider', (state) => state.onChange);

  const contentTypes = React.useMemo(
    () => new Map(layout.contentTypes.map((contentType) => [contentType.uid, contentType])),
    [layout]
  );

  // The settings are part of what a save sends, which the form does not see
  const apply = React.useCallback(
    (uid: string, next: SubjectSettings) => {
      if (JSON.stringify(settings[uid]) !== JSON.stringify(next)) {
        onSettingsChange(uid, next);
        setFormValue(PERMISSIONS_CHANGED, true);
      }
    },
    [settings, onSettingsChange, setFormValue]
  );

  const value = React.useMemo(
    () => ({ contentTypes, settings, rows, apply }),
    [contentTypes, settings, rows, apply]
  );

  return (
    <SubjectSettingsContext.Provider value={value}>{children}</SubjectSettingsContext.Provider>
  );
};

const NO_SETTINGS: SubjectSettings = { populateDepth: null, conditions: {} };

const useSubjectSettings = () => {
  const context = React.useContext(SubjectSettingsContext);

  if (!context) {
    throw new Error('The Settings button of a content type needs a SubjectSettingsProvider');
  }

  return context;
};

/** The Settings button of one content type's row, with the actions the role has on it now */
const SubjectSettingsSlot = ({ subject, disabled }: { subject: string; disabled: boolean }) => {
  const { contentTypes, settings, rows, apply } = useSubjectSettings();
  const granted = useGrantedActions(rows, subject);
  const contentType = contentTypes.get(subject);

  if (!contentType) {
    return null;
  }

  return (
    <SubjectSettingsModal
      contentType={contentType}
      granted={granted}
      value={settings[subject] ?? NO_SETTINGS}
      disabled={disabled}
      onApply={(next) => apply(subject, next)}
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * Details of the open subject
 * -----------------------------------------------------------------------------------------------*/

/**
 * The routes bound to the open content type, plugin or category, inside its row. They are told what
 * the role is granted as the editor has it now, from the store, so a click renders this and not
 * the editor.
 */
const SubjectDetails = ({
  tab,
  subject,
  layout,
  rows,
}: {
  tab: PermissionsTabId;
  subject: string;
  layout: PermissionLayout;
  rows: EditorRows;
}) => {
  const { formatMessage } = useIntl();
  const editorRows = useEditorRows(rows);
  const granted = React.useMemo(() => toGrantedRows(editorRows, layout), [editorRows, layout]);

  return (
    <Box
      tag="section"
      aria-label={formatMessage({
        id: getTranslation('roles.details.label'),
        defaultMessage: 'Details',
      })}
      background="neutral100"
      paddingTop={4}
      paddingBottom={6}
      paddingLeft={6}
      paddingRight={6}
    >
      <DetailsPane open={{ tab, id: subject }} layout={layout} rows={granted} />
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PermissionsPanel
 * -----------------------------------------------------------------------------------------------*/

interface PermissionsPanelProps {
  layout: PermissionLayout;
  model: EditorModel;
  /** The editor's latest rows, for the save to read: a store, so a click costs no render here */
  rows: EditorRows;
  disabled: boolean;
  confirmBulkChange: NonNullable<PermissionsProps['confirmBulkChange']>;
}

/**
 * The editor, drawn from the model and told about the rows it gets. Memoised: the form around it
 * changes on every keystroke of the name, and the editor has nothing to do with that.
 */
const PermissionsPanelBase = ({
  layout,
  model,
  rows,
  disabled,
  confirmBulkChange,
}: PermissionsPanelProps) => {
  const { formatMessage } = useIntl();
  const setFormValue = useForm('PermissionsPanel', (state) => state.onChange);

  // The editor takes the admin's `Permission`, which also has an id, timestamps and
  // `actionParameters`; it reads only the action, subject, conditions and properties, and these
  // rows have no more. The input is typed as the admin's entity, the output (`onChange`) is not.
  const permissions = React.useMemo(
    () => model.rows as unknown as NonNullable<PermissionsProps['permissions']>,
    [model]
  );

  // A dot where the route of an action has policies or middlewares
  const actionsWithRules = React.useMemo(
    () =>
      new Set(
        layout.contentTypes.flatMap(({ uid, actions }) =>
          actions.filter(({ hasRules }) => hasRules).map(({ action }) => `${uid}:${action}`)
        )
      ),
    [layout]
  );

  const rulesLabel = formatMessage({
    id: getTranslation('roles.edit.rules'),
    defaultMessage: "This action's route has policies or middlewares.",
  });

  const renderActionIndicator = React.useCallback<
    NonNullable<PermissionsProps['renderActionIndicator']>
  >(
    ({ actionId, subject }) =>
      actionsWithRules.has(`${subject}:${actionId}`) ? (
        <RulesDot role="img" aria-label={rulesLabel} />
      ) : null,
    [actionsWithRules, rulesLabel]
  );

  const handleChange = React.useCallback(
    (next: PermissionsRow[]) => {
      rows.set(next);
      setFormValue(PERMISSIONS_CHANGED, true);
    },
    [rows, setFormValue]
  );

  // Stable, like every callback of the memoized panel: the slot reads what it shows from context
  const renderSubjectActions = React.useCallback<
    NonNullable<PermissionsProps['renderSubjectActions']>
  >(
    ({ subject, disabled: isDisabled }) => (
      <SubjectSettingsSlot subject={subject} disabled={isDisabled} />
    ),
    []
  );

  // Stable too: the layout and the store of rows don't change for the life of the editor
  const renderSubjectDetails = React.useCallback<
    NonNullable<PermissionsProps['renderSubjectDetails']>
  >(
    ({ tab, subject }) => (
      <SubjectDetails tab={tab} subject={subject} layout={layout} rows={rows} />
    ),
    [layout, rows]
  );

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      {actionsWithRules.size > 0 && (
        <Flex gap={2} alignItems="center">
          <RulesDot aria-hidden />
          <Typography variant="pi" textColor="neutral600">
            {rulesLabel}
          </Typography>
        </Flex>
      )}
      <Box shadow="filterShadow" hasRadius>
        <Permissions
          isFormDisabled={disabled}
          layout={model.layout}
          permissions={permissions}
          tabLabels={TAB_LABELS}
          onChange={handleChange}
          confirmBulkChange={confirmBulkChange}
          renderActionIndicator={renderActionIndicator}
          renderSubjectActions={renderSubjectActions}
          renderSubjectDetails={renderSubjectDetails}
          requiredFieldsAction="create"
          searchable
        />
      </Box>
    </Flex>
  );
};

const PermissionsPanel = React.memo(PermissionsPanelBase);

/* -------------------------------------------------------------------------------------------------
 * RoleEditor
 * -----------------------------------------------------------------------------------------------*/

interface RoleEditorProps {
  mode: EditorMode;
  layout: PermissionLayout;
  /** The role being edited, or the one a duplicate is made from */
  role?: RoleDetail;
  /** Whether the admin may save: `roles.update` on an edit, `roles.create` otherwise */
  canSave: boolean;
  /** Edit only: loads the role again and starts the editor over from it, so a 409 can be left */
  onReload?: () => Promise<void>;
}

/**
 * The page of a role, for the three ways to get to one. It reads the layout and the role once:
 * the editor builds its state from them when it mounts, so whoever renders this gives it a `key`
 * that changes when the role does (a save, a reload), and it starts over from what is stored.
 */
const RoleEditor = ({ mode, layout, role, canSave, onReload }: RoleEditorProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [loadConditions] = useLazyGetConditionsQuery();

  const model = React.useMemo(
    () => toEditorModel(layout, role?.permissions ?? [], role?.problems ?? []),
    [layout, role]
  );

  // What a save is built from: the Settings of each content type, the editor's rows, and the ids
  // of the stored rows to remove
  const [settings, setSettings] = React.useState(model.settings);
  const [rows] = React.useState(() => createEditorRows(model.rows));
  const [remove, setRemove] = React.useState<string[]>([]);

  const handleSettingsChange = React.useCallback(
    (uid: string, next: SubjectSettings) => setSettings((current) => ({ ...current, [uid]: next })),
    []
  );

  // Two questions the admin answers in a dialog, which what asked them waits for: a column change
  // that touches many content types, and the review of a save
  const bulk = useQuestion<BulkQuestion>();
  const review = useQuestion<{
    title: string;
    groups: ChangeGroup[];
    warnings: SelfWritableWarning[];
  }>();
  const rename = useQuestion<RenameQuestion>();
  const askBulk = bulk.ask;

  const confirmBulkChange = React.useCallback<NonNullable<PermissionsProps['confirmBulkChange']>>(
    (change) => {
      if (change.subjects.length < BULK_CONFIRM_FROM) {
        return Promise.resolve(true);
      }

      // The question counts the content types the column changes: the ones that already are as it
      // asks are left out, as the review that follows leaves them out
      const subjects = change.subjects.filter(
        (uid) => rows.grantedKey(uid).split(',').includes(change.actionId) !== change.value
      );

      return subjects.length === 0
        ? Promise.resolve(true)
        : askBulk({ ...change, subjects, unchanged: change.subjects.length - subjects.length });
    },
    [askBulk, rows]
  );

  const [failure, setFailure] = React.useState<SaveFailure | null>(null);
  const [isReloading, setIsReloading] = React.useState(false);

  const initialValues = React.useMemo((): RoleFormValues => {
    if (!role || mode === 'create') {
      return {
        name: null,
        description: null,
        requireTwoFactor: false,
        [PERMISSIONS_CHANGED]: false,
      };
    }

    if (mode === 'duplicate') {
      return {
        name: formatMessage(
          { id: getTranslation('roles.edit.copy-name'), defaultMessage: '{name} (copy)' },
          { name: role.name }
        ),
        description: role.description,
        // Public has no two-factor to copy: its copy is a role of signed-in users
        requireTwoFactor: role.type === 'public' ? false : role.requireTwoFactor,
        [PERMISSIONS_CHANGED]: false,
      };
    }

    return {
      name: role.name,
      description: role.description,
      requireTwoFactor: role.requireTwoFactor,
      [PERMISSIONS_CHANGED]: false,
    };
  }, [mode, role, formatMessage]);

  const reviewTitle = (name: string) =>
    `${formatMessage({ id: getTranslation('roles.review.title'), defaultMessage: 'Review changes' })} · ${name}`;

  /**
   * The builder conditions that read a profile or user field the rows being saved let users write
   * and the stored rows did not. Public has no signed-in user to write one, and a list that can't
   * be read is no reason to stop a save: the review simply has no warning.
   */
  const selfWritableWarnings = async (
    before: PermissionRow[],
    after: PermissionRow[]
  ): Promise<SelfWritableWarning[]> => {
    if (role?.type === 'public' && mode === 'edit') {
      return [];
    }

    const { data: conditions } = await loadConditions();

    return conditions ? findSelfWritableWarnings(conditions, before, after) : [];
  };

  const handleSubmit = async (values: RoleFormValues) => {
    const details = {
      name: (values.name ?? '').trim(),
      description:
        values.description === null || values.description === '' ? null : values.description,
      requireTwoFactor:
        role?.type === 'public' && mode === 'edit' ? false : values.requireTwoFactor,
    };

    try {
      if (mode === 'edit' && role) {
        const next = toPermissionRows(rows.get(), settings, layout, role.permissions, model.stale);
        const permissions = toPermissionDiff(role.permissions, next, remove, layout);

        const groups = describeSave(
          {
            name: role.name,
            description: role.description,
            requireTwoFactor: role.requireTwoFactor,
            rows: role.permissions,
          },
          { ...details, rows: next },
          layout,
          role.permissions,
          remove
        );

        // Ticking a cell and unticking it again leaves the page modified and the role as it was
        if (
          groups.length === 0 &&
          !permissions.create.length &&
          !permissions.update.length &&
          !permissions.delete.length
        ) {
          toggleNotification({
            type: 'info',
            message: formatMessage({
              id: getTranslation('roles.edit.nothing'),
              defaultMessage: 'There is nothing to save.',
            }),
          });

          return;
        }

        // The Who checks of conditions match a role by its name: a rename is asked about first
        if (
          details.name !== role.name &&
          role.namedBy.length > 0 &&
          !(await rename.ask({ from: role.name, to: details.name, namedBy: role.namedBy }))
        ) {
          return;
        }

        const warnings = await selfWritableWarnings(role.permissions, next);

        if (!(await review.ask({ title: reviewTitle(details.name), groups, warnings }))) {
          return;
        }

        const result = await updateRole({
          documentId: role.documentId,
          revision: role.revision,
          ...details,
          permissions,
        });

        if ('error' in result) {
          setFailure(
            isRoleChanged(result.error)
              ? { kind: 'conflict' }
              : { kind: 'error', message: formatAPIError(result.error) }
          );

          return;
        }

        // The answer is the role as stored, with its new revision: it replaces the one the page
        // was loaded with, which starts the editor over from it
        setFailure(null);
        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
        });

        return;
      }

      // A duplicate leaves out what the source has set aside: the server refuses those rows, so
      // the copy could not be created with them
      const staleIds = new Set(model.stale.map(({ documentId }) => documentId));
      const stored = (role?.permissions ?? []).filter(
        ({ documentId }) => !staleIds.has(documentId)
      );
      const permissions = toPermissionRows(rows.get(), settings, layout, stored, []);

      // A new role is listed against an empty one: everything it has is a change
      const groups = describeSave(
        { name: '', description: null, requireTwoFactor: false, rows: [] },
        { ...details, rows: permissions },
        layout,
        [],
        []
      );

      const warnings = await selfWritableWarnings([], permissions);

      if (!(await review.ask({ title: reviewTitle(details.name), groups, warnings }))) {
        return;
      }

      const result = await createRole({ ...details, permissions });

      if ('error' in result) {
        setFailure({ kind: 'error', message: formatAPIError(result.error) });

        return;
      }

      toggleNotification({
        type: 'success',
        message: formatMessage({ id: 'Settings.roles.created', defaultMessage: 'Role created' }),
      });
      navigate(`${ROLES_PATH}/${result.data.documentId}`, { replace: true });
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  const handleReload = async () => {
    setIsReloading(true);

    try {
      await onReload?.();
    } finally {
      setIsReloading(false);
    }
  };

  const title =
    mode === 'edit'
      ? formatMessage({ id: 'Settings.roles.edit.title', defaultMessage: 'Edit a role' })
      : mode === 'duplicate'
        ? formatMessage({
            id: getTranslation('roles.duplicate.title'),
            defaultMessage: 'Duplicate a role',
          })
        : formatMessage({ id: 'Settings.roles.create.title', defaultMessage: 'Create a role' });

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings — {name}' },
          { name: 'Roles' }
        )}
      </Page.Title>
      <Form
        method={mode === 'edit' ? 'PUT' : 'POST'}
        disabled={!canSave}
        initialValues={initialValues}
        onSubmit={handleSubmit}
      >
        {({ modified, isSubmitting, values, onChange }) => {
          const hasName = ((values as RoleFormValues).name ?? '').trim() !== '';
          // A copy or a new role is saved as it is; an edit needs something to save
          const hasSomethingToSave = mode === 'edit' ? modified : true;

          return (
            <>
              <Blocker />
              <Layouts.Header
                primaryAction={
                  <Button
                    type="submit"
                    startIcon={<Check />}
                    disabled={!canSave || !hasName || !hasSomethingToSave}
                    // The form is submitting while the review waits for its answer
                    loading={isSubmitting && review.question === null}
                    fullWidth
                  >
                    {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                  </Button>
                }
                title={title}
                subtitle={formatMessage({
                  id: 'Settings.roles.create.description',
                  defaultMessage: 'Define the rights given to the role',
                })}
                navigationAction={
                  // The back link for mobile is placed higher up in the settings layout
                  <Box display={{ initial: 'none', medium: 'block' }}>
                    <BackButton fallback={ROLES_PATH} />
                  </Box>
                }
              />
              <Layouts.Content>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  {failure?.kind === 'conflict' && (
                    <Alert
                      variant="danger"
                      closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                      onClose={() => setFailure(null)}
                      action={
                        <Button
                          variant="danger-light"
                          size="S"
                          loading={isReloading}
                          onClick={handleReload}
                        >
                          {formatMessage({
                            id: getTranslation('roles.edit.reload'),
                            defaultMessage: 'Reload',
                          })}
                        </Button>
                      }
                    >
                      {formatMessage({
                        id: getTranslation('roles.edit.changed'),
                        defaultMessage:
                          'This role was changed by someone else. Reload it to see the changes.',
                      })}
                    </Alert>
                  )}
                  {failure?.kind === 'error' && (
                    <Alert
                      variant="danger"
                      closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                      onClose={() => setFailure(null)}
                    >
                      {failure.message}
                    </Alert>
                  )}
                  {mode === 'edit' && role && (
                    <ProblemsBanner
                      problems={role.problems}
                      removing={remove}
                      disabled={!canSave}
                      onRemove={(documentIds) => {
                        setRemove(documentIds);
                        onChange(PERMISSIONS_CHANGED, true);
                      }}
                    />
                  )}
                  <RoleDetails mode={mode} role={role} disabled={!canSave} />
                  <SubjectSettingsProvider
                    layout={layout}
                    settings={settings}
                    rows={rows}
                    onSettingsChange={handleSettingsChange}
                  >
                    <PermissionsPanel
                      layout={layout}
                      model={model}
                      rows={rows}
                      disabled={!canSave}
                      confirmBulkChange={confirmBulkChange}
                    />
                  </SubjectSettingsProvider>
                </Flex>
              </Layouts.Content>
              <BulkChangeDialog change={bulk.question} onAnswer={bulk.answer} />
              <RenameRoleDialog question={rename.question} onAnswer={rename.answer} />
              {review.question && (
                <ReviewChangesModal
                  title={review.question.title}
                  groups={review.question.groups}
                  warnings={review.question.warnings}
                  onConfirm={() => review.answer(true)}
                  onCancel={() => review.answer(false)}
                />
              )}
            </>
          );
        }}
      </Form>
    </Page.Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EditPage
 * -----------------------------------------------------------------------------------------------*/

/**
 * `/settings/end-users/roles/:documentId`. The editor starts over, with the form, whenever the
 * revision of the role changes (its own save answered, or a reload found another) or the admin
 * reloads: until then a save the server refused leaves every edit where it was.
 */
const EditPage = () => {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS.roles);
  const { data: layout, isLoading: isLoadingLayout } = useGetPermissionLayoutQuery();
  const {
    data: role,
    error: roleError,
    isLoading: isLoadingRole,
    refetch,
  } = useGetRoleQuery(documentId);
  const [reloads, setReloads] = React.useState(0);

  const revision = role?.revision;

  const handleReload = React.useCallback(async () => {
    const result = await refetch();

    if (result.isError) {
      // Nothing was loaded: the edits stay
      toggleNotification({
        type: 'danger',
        message: result.error
          ? formatAPIError(result.error)
          : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });

      return;
    }

    // A role that has moved on starts the editor over by its revision; one that has not needs the
    // reload counter
    if (result.data?.revision === revision) {
      setReloads((count) => count + 1);
    }
  }, [refetch, revision, toggleNotification, formatAPIError, formatMessage]);

  if (isLoadingPermissions || isLoadingLayout || isLoadingRole) {
    return <Page.Loading />;
  }

  // A role the server does not have is not a failure to load: it says so, with the way back
  if (!role && isNotFound(roleError)) {
    return <NotFound kind="role" backPath={ROLES_PATH} />;
  }

  if (!layout || !role) {
    return <Page.Error />;
  }

  return (
    <RoleEditor
      key={`${role.revision}:${reloads}`}
      mode="edit"
      layout={layout}
      role={role}
      canSave={canUpdate}
      onReload={handleReload}
    />
  );
};

export { EditPage, RoleEditor };
export type { EditorMode, RoleEditorProps };
