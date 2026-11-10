import * as React from 'react';

import {
  BackButton,
  Blocker,
  ConfirmDialog,
  Form,
  Layouts,
  Page,
  useAPIErrorHandler,
  useAppInfo,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import { Alert, Box, Button, Dialog, Flex, Grid, Typography } from '@strapi/design-system';
import { Check, Information, Trash } from '@strapi/icons';
import {
  private_AutoReloadOverlayBlockerProvider as AutoReloadOverlayBlockerProvider,
  private_useAutoReloadOverlayBlocker as useAutoReloadOverlayBlocker,
} from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import { NotFound } from '../../components/NotFound';
import { PERMISSIONS } from '../../constants';
import { pluginId } from '../../pluginId';
import { endUsersApi } from '../../services/api';
import {
  useCreateConditionMutation,
  useDeleteConditionMutation,
  useGetBuilderLayoutQuery,
  useGetConditionsQuery,
  useGetConditionsStatusQuery,
  useUpdateConditionMutation,
} from '../../services/conditions';
import { getTranslation } from '../../utils/getTranslation';

import { AppliesToSection } from './components/builder/AppliesToSection';
import { InputsSection } from './components/builder/InputsSection';
import { OnSaveSection } from './components/builder/OnSaveSection';
import { SummaryCard } from './components/builder/SummaryCard';
import { WhichSection } from './components/builder/WhichSection';
import { WhoSection } from './components/builder/WhoSection';
import { PreviewPanel } from './components/PreviewPanel';
import { SelfWritableAlert } from './components/SelfWritableAlert';
import { fieldsFor, formProblems, toCondition, toForm } from './utils/builderForm';
import { splitProblems } from './utils/fieldProblems';
import { toFormErrors } from './utils/toFormErrors';
import { useConditionsRestartWatcher } from './utils/useConditionsRestartWatcher';
import { useConfirmation } from './utils/useConfirmation';
import { isRestartTimeout } from './utils/watchConditionsRestart';

import type { BuilderForm, FormGroup } from './utils/builderForm';
import type {
  BuilderLayout,
  ConditionListItem,
  ConditionWriteResponse,
  SelfWritableField,
} from '../../../../shared/contracts/conditions';

/** Where the list is, and where Back, a save and a delete go: the conditions page is mounted here */
const CONDITIONS_PATH = `/settings/${pluginId}/conditions`;

/** A builder condition is named `api::<slug>`, and its page is addressed by the slug */
const BUILDER_NAME_PREFIX = 'api::';

interface ConditionFormValues {
  /** The whole form in one value: the page keeps it in the admin's form, which knows when it changed */
  form: BuilderForm;
}

/** What a save leaves on the page when it is refused for a reason no field of the form names */
type Failure = string | null;

/** The checks a group holds, nested groups included */
const countChecks = (group: FormGroup): number =>
  group.items.reduce((sum, item) => sum + (item.kind === 'group' ? countChecks(item) : 1), 0);

/* -------------------------------------------------------------------------------------------------
 * ConditionBuilder
 * -----------------------------------------------------------------------------------------------*/

interface ConditionBuilderProps {
  layout: BuilderLayout;
  /** The builder condition being edited, or none for a new one */
  condition?: ConditionListItem;
  /** Strapi runs in development: the only environment where conditions are written */
  autoReload: boolean;
  /** Strapi runs in development and the admin may update conditions */
  canEdit: boolean;
  /** Loads the list again: the page leaves once it holds what the write changed */
  refetchList: () => Promise<unknown>;
}

/**
 * The page of a condition. A save or a delete writes a file and restarts the server: the page
 * locks the app with the Content-Type Builder's overlay, waits until the server answers, unlocks,
 * loads the list again and returns to it.
 */
const ConditionBuilder = ({
  layout,
  condition,
  autoReload,
  canEdit,
  refetchList,
}: ConditionBuilderProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();
  const waitForRestart = useConditionsRestartWatcher();
  const [createCondition] = useCreateConditionMutation();
  const [updateCondition] = useUpdateConditionMutation();
  const [deleteCondition] = useDeleteConditionMutation();
  const { data: status } = useGetConditionsStatusQuery(undefined, {
    skip: !canEdit,
    refetchOnMountOrArgChange: true,
  });
  const confirmation = useConfirmation();

  const isEditing = condition !== undefined;
  const slugOfCondition = condition?.name.slice(BUILDER_NAME_PREFIX.length) ?? '';
  // A write waits for its restart: another one is refused until the server is back
  const isUpdating = status?.isUpdating === true;

  const [failure, setFailure] = React.useState<Failure>(null);
  // What the server refused about the name and the display name, which show on their fields
  const [fieldErrors, setFieldErrors] = React.useState<{ slug?: string; displayName?: string }>({});
  // The fields the admin has left: what is wrong with one shows from then on, not while it is untouched
  const [touched, setTouched] = React.useState<
    Partial<Record<'slug' | 'displayName' | 'types', true>>
  >({});
  // The inputs a save took out that roles had bound a value to: the page stays to say so
  const [removedInputs, setRemovedInputs] = React.useState<
    NonNullable<NonNullable<ConditionWriteResponse['warnings']>['removedInputs']>
  >([]);
  // The values the saved condition reads that a signed-in user can write: the page stays to say so
  const [selfWritable, setSelfWritable] = React.useState<SelfWritableField[]>([]);
  const hasWarnings = removedInputs.length > 0 || selfWritable.length > 0;
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  // Set as the page goes back to the list: nothing the form holds is unsaved by then
  const [isLeaving, setIsLeaving] = React.useState(false);

  // Once the page has stopped asking about unsaved edits (the render that sets `isLeaving` takes
  // `<Blocker />` out), not before: a navigation it sees is one it stops and then forgets
  React.useEffect(() => {
    if (isLeaving) {
      navigate(CONDITIONS_PATH);
    }
  }, [isLeaving, navigate]);

  const initialValues = React.useMemo(
    (): ConditionFormValues => ({ form: toForm(condition?.builder) }),
    [condition]
  );
  // The inputs the saved file has: their names can't change
  const savedKeys = React.useMemo(
    () => (isEditing ? initialValues.form.inputs.map(({ key }) => key) : []),
    [initialValues, isEditing]
  );

  /** What is left to do after the server has been asked to write: wait for its restart, then go back */
  const finish = async (
    message: string,
    warned: typeof removedInputs = [],
    selfWritableFields: SelfWritableField[] = []
  ) => {
    try {
      await waitForRestart();
    } catch (error) {
      unlockAppWithAutoreload();
      toggleNotification({
        type: 'danger',
        message: isRestartTimeout(error)
          ? formatMessage({
              id: getTranslation('conditions.builder.restart-timeout'),
              defaultMessage:
                'The server has not answered yet. Check the terminal where Strapi runs, then reload the page.',
            })
          : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });

      return;
    }

    unlockAppWithAutoreload();
    // The layout lists the conditions a role can pick: the role editor reads it again
    dispatch(endUsersApi.util.invalidateTags([{ type: 'EndUsersLayout', id: 'LAYOUT' }]));
    toggleNotification({ type: 'success', message });

    await refetchList();

    if (warned.length > 0 || selfWritableFields.length > 0) {
      // The page stays to name the roles and the values; the save is done, so nothing is unsaved
      setRemovedInputs(warned);
      setSelfWritable(selfWritableFields);

      return;
    }

    setIsLeaving(true);
  };

  /** A refusal: what names the name or the display name is shown on that field, the rest above the page */
  const refuse = (error: unknown) => {
    const { parts, others } = toFormErrors(error);

    setFieldErrors({ slug: parts.slug, displayName: parts.displayName });
    setFailure(
      others.length > 0
        ? others.join(' ')
        : Object.keys(parts).length > 0
          ? null
          : formatAPIError(error as Parameters<typeof formatAPIError>[0])
    );
  };

  const handleSubmit = async (values: ConditionFormValues) => {
    setFailure(null);
    setFieldErrors({});

    const built = toCondition({
      ...values.form,
      slug: values.form.slug.trim(),
      displayName: values.form.displayName.trim(),
    });

    // The roles that use it get what the new condition keeps, from the next start on
    if (condition && condition.usedBy > 0 && !(await confirmation.ask())) {
      return;
    }

    lockAppWithAutoreload();

    const result = condition ? await updateCondition(built) : await createCondition(built);

    if ('error' in result) {
      unlockAppWithAutoreload();
      refuse(result.error);

      return;
    }

    await finish(
      formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
      result.data.warnings?.removedInputs ?? [],
      result.data.warnings?.selfWritable ?? []
    );
  };

  const handleDelete = async () => {
    setFailure(null);
    setIsDeleting(true);
    lockAppWithAutoreload();

    const result = await deleteCondition(slugOfCondition);

    if ('error' in result) {
      unlockAppWithAutoreload();
      setIsDeleting(false);
      setFailure(formatAPIError(result.error as Parameters<typeof formatAPIError>[0]));

      return;
    }

    await finish(
      formatMessage({
        id: getTranslation('conditions.builder.deleted'),
        defaultMessage: 'Condition deleted',
      })
    );
    setIsDeleting(false);
  };

  const title = isEditing
    ? condition.displayName
    : formatMessage({
        id: getTranslation('conditions.builder.new'),
        defaultMessage: 'New condition',
      });

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings — {name}' },
          {
            name: formatMessage({
              id: getTranslation('conditions.list.title'),
              defaultMessage: 'Conditions',
            }),
          }
        )}
      </Page.Title>
      <Form
        method={isEditing ? 'PUT' : 'POST'}
        disabled={!canEdit}
        initialValues={initialValues}
        onSubmit={handleSubmit}
      >
        {({ modified, isSubmitting, values, onChange }) => {
          const { form } = values as ConditionFormValues;
          const setForm = (next: BuilderForm) => onChange('form', next);
          const fields = fieldsFor(layout, form.appliesTo);
          const problems = formProblems(form, layout);
          const { fields: fieldProblems, rest: otherProblems } = splitProblems(problems, form);
          const fieldError = (part: 'slug' | 'displayName' | 'types') => {
            const server = part === 'types' ? undefined : fieldErrors[part];
            const found = touched[part] ? fieldProblems[part] : undefined;

            return (
              server ??
              (found
                ? formatMessage(
                    { id: found.id, defaultMessage: found.defaultMessage },
                    found.values
                  )
                : undefined)
            );
          };
          // The preview takes a condition as it is now, whatever its name: only the rest has to hold up
          const previewProblems = formProblems(
            { ...form, slug: 'preview', displayName: 'Preview' },
            layout
          );
          const restrictsNothing = countChecks(form.which) === 0;
          const canSave =
            canEdit &&
            !isUpdating &&
            !hasWarnings &&
            problems.length === 0 &&
            // An edit needs something to save
            (!isEditing || modified);

          return (
            <>
              {!isLeaving && !hasWarnings && <Blocker />}
              <Layouts.Header
                primaryAction={
                  <Button
                    type="submit"
                    startIcon={<Check />}
                    disabled={!canSave || isDeleting}
                    // The form is submitting while the confirmation waits for its answer
                    loading={isSubmitting && !confirmation.asking}
                    fullWidth
                  >
                    {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                  </Button>
                }
                secondaryAction={
                  isEditing && canEdit ? (
                    <Button
                      type="button"
                      variant="danger-light"
                      startIcon={<Trash />}
                      disabled={condition.usedBy > 0 || isUpdating || isSubmitting}
                      onClick={() => setIsConfirmingDelete(true)}
                    >
                      {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
                    </Button>
                  ) : null
                }
                title={title}
                subtitle={formatMessage({
                  id: getTranslation('conditions.builder.subtitle'),
                  defaultMessage: 'The entries a role can reach when it holds this condition',
                })}
                navigationAction={
                  // The back link for mobile is placed higher up in the settings layout
                  <Box display={{ initial: 'none', medium: 'block' }}>
                    <BackButton fallback={CONDITIONS_PATH} />
                  </Box>
                }
              />
              <Layouts.Content>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  {failure && (
                    <Alert
                      variant="danger"
                      closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                      onClose={() => setFailure(null)}
                    >
                      {failure}
                    </Alert>
                  )}
                  {isUpdating && (
                    <Alert
                      variant="warning"
                      closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                    >
                      {formatMessage({
                        id: getTranslation('conditions.builder.updating'),
                        defaultMessage:
                          'Another change is waiting for the server to restart. Reload the page in a moment.',
                      })}
                    </Alert>
                  )}
                  {selfWritable.length > 0 && (
                    <SelfWritableAlert
                      fields={selfWritable}
                      action={
                        removedInputs.length === 0 ? (
                          <Button
                            type="button"
                            variant="tertiary"
                            onClick={() => setIsLeaving(true)}
                          >
                            {formatMessage({
                              id: getTranslation('conditions.builder.back-to-list'),
                              defaultMessage: 'Back to conditions',
                            })}
                          </Button>
                        ) : undefined
                      }
                    />
                  )}
                  {removedInputs.length > 0 && (
                    <Alert
                      variant="warning"
                      closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                      action={
                        <Button type="button" variant="tertiary" onClick={() => setIsLeaving(true)}>
                          {formatMessage({
                            id: getTranslation('conditions.builder.back-to-list'),
                            defaultMessage: 'Back to conditions',
                          })}
                        </Button>
                      }
                    >
                      {removedInputs.map(({ name, roles }) => (
                        <Typography key={name} tag="span" display="block">
                          {formatMessage(
                            {
                              id: getTranslation('conditions.builder.removed-input'),
                              defaultMessage:
                                'The input {name} is gone, and {roles} had a value bound to it. Open {count, plural, one {that role} other {those roles}} and review what they grant.',
                            },
                            { name, roles: roles.join(', '), count: roles.length }
                          )}
                        </Typography>
                      ))}
                    </Alert>
                  )}
                  {!autoReload && (
                    <Flex
                      gap={3}
                      padding={4}
                      background="neutral100"
                      borderColor="neutral200"
                      hasRadius
                    >
                      <Information fill="neutral600" aria-hidden />
                      <Typography textColor="neutral800">
                        {formatMessage(
                          {
                            id: getTranslation('conditions.builder.read-only'),
                            defaultMessage:
                              'Conditions can be created and changed only while Strapi runs with <code>strapi develop</code>. The preview still works.',
                          },
                          { code: (chunks: React.ReactNode) => <code>{chunks}</code> }
                        )}
                      </Typography>
                    </Flex>
                  )}
                  {isEditing && condition.usedBy > 0 && (
                    <Typography textColor="neutral600">
                      {formatMessage(
                        {
                          id: getTranslation('conditions.builder.used-by'),
                          defaultMessage:
                            'Used by {count, plural, one {# role} other {# roles}}. It can be deleted once no role uses it.',
                        },
                        { count: condition.usedBy }
                      )}
                    </Typography>
                  )}
                  {restrictsNothing && (
                    <Flex
                      gap={3}
                      padding={4}
                      background="neutral100"
                      borderColor="neutral200"
                      hasRadius
                    >
                      <Information fill="neutral600" aria-hidden />
                      <Typography textColor="neutral800">
                        {formatMessage({
                          id: getTranslation('conditions.builder.restricts-nothing'),
                          defaultMessage: 'This condition restricts nothing.',
                        })}
                      </Typography>
                    </Flex>
                  )}
                  {otherProblems.length > 0 && (modified || isEditing) && (
                    <Alert
                      variant="danger"
                      title={formatMessage({
                        id: getTranslation('conditions.builder.problems'),
                        defaultMessage: 'Fix these before saving',
                      })}
                      closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                    >
                      {otherProblems.map(({ path, message }) => (
                        <Typography key={`${path}:${message}`} tag="span" display="block">
                          {message}
                        </Typography>
                      ))}
                    </Alert>
                  )}
                  <Grid.Root gap={6}>
                    <Grid.Item col={8} xs={12} direction="column" alignItems="stretch">
                      <Flex direction="column" alignItems="stretch" gap={6}>
                        <AppliesToSection
                          slug={form.slug}
                          displayName={form.displayName}
                          appliesTo={form.appliesTo}
                          layout={layout}
                          isEditing={isEditing}
                          disabled={!canEdit}
                          errors={{
                            slug: fieldError('slug'),
                            displayName: fieldError('displayName'),
                            types: fieldError('types'),
                          }}
                          onTouch={(part) =>
                            setTouched((current) => ({ ...current, [part]: true }))
                          }
                          onChange={(patch) => setForm({ ...form, ...patch })}
                        />
                        <InputsSection
                          inputs={form.inputs}
                          savedKeys={savedKeys}
                          layout={layout}
                          disabled={!canEdit}
                          onChange={(inputs) => setForm({ ...form, inputs })}
                        />
                        <WhoSection
                          who={form.who}
                          layout={layout}
                          inputs={form.inputs}
                          disabled={!canEdit}
                          onChange={(who) => setForm({ ...form, who })}
                        />
                        <WhichSection
                          which={form.which}
                          layout={layout}
                          fields={fields}
                          inputs={form.inputs}
                          disabled={!canEdit}
                          onChange={(which) => setForm({ ...form, which })}
                        />
                        <OnSaveSection
                          onSave={form.onSave}
                          fields={fields}
                          inputs={form.inputs}
                          disabled={!canEdit}
                          onChange={(onSave) => setForm({ ...form, onSave })}
                        />
                      </Flex>
                    </Grid.Item>
                    <Grid.Item col={4} xs={12} direction="column" alignItems="stretch">
                      <Flex direction="column" alignItems="stretch" gap={6}>
                        <SummaryCard condition={toCondition(form)} layout={layout} />
                        <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                          <PreviewPanel
                            layout={layout}
                            condition={{
                              ...toCondition(form),
                              slug: 'preview',
                              displayName: 'Preview',
                            }}
                            ready={previewProblems.length === 0}
                          />
                        </Box>
                      </Flex>
                    </Grid.Item>
                  </Grid.Root>
                </Flex>
              </Layouts.Content>
              <Dialog.Root
                open={confirmation.asking}
                onOpenChange={(open) => !open && confirmation.answer(false)}
              >
                <ConfirmDialog
                  variant="default"
                  title={formatMessage({
                    id: getTranslation('conditions.builder.confirm-save.title'),
                    defaultMessage: 'Save this condition?',
                  })}
                  onConfirm={() => confirmation.answer(true)}
                  onCancel={() => confirmation.answer(false)}
                >
                  {formatMessage(
                    {
                      id: getTranslation('conditions.builder.confirm-save'),
                      defaultMessage:
                        '{count, plural, one {# role uses} other {# roles use}} this condition. Saving changes what they grant.',
                    },
                    { count: condition?.usedBy ?? 0 }
                  )}
                </ConfirmDialog>
              </Dialog.Root>
              <Dialog.Root open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
                <ConfirmDialog onConfirm={handleDelete}>
                  {formatMessage(
                    {
                      id: getTranslation('conditions.builder.confirm-delete'),
                      defaultMessage:
                        'Delete <b>{name}</b>? Its file is removed and the server restarts.',
                    },
                    {
                      name: condition?.displayName ?? '',
                      b: (chunks: React.ReactNode) => (
                        <Typography fontWeight="bold">{chunks}</Typography>
                      ),
                    }
                  )}
                </ConfirmDialog>
              </Dialog.Root>
            </>
          );
        }}
      </Form>
    </Page.Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BuilderPage
 * -----------------------------------------------------------------------------------------------*/

const BuilderLoader = () => {
  const { slug } = useParams<{ slug?: string }>();
  const autoReload = useAppInfo('ConditionsBuilderPage', (state) => state.autoReload) === true;
  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS.conditions);
  const { data: layout, isLoading: isLoadingLayout } = useGetBuilderLayoutQuery();
  const { data: conditions, isLoading: isLoadingConditions, refetch } = useGetConditionsQuery();

  const found =
    slug === undefined
      ? undefined
      : conditions?.find(({ name }) => name === `${BUILDER_NAME_PREFIX}${slug}`);

  // The condition the page opened with. The list is loaded again once a write has restarted the
  // server, while the page is still here: after a delete it no longer holds the condition, and the
  // page must not turn into "No content found" or start over from the list on its way back to it.
  const [opened, setOpened] = React.useState<{ slug?: string; condition: ConditionListItem }>();

  if (found && opened?.slug !== slug) {
    setOpened({ slug, condition: found });
  }

  const condition = opened && opened.slug === slug ? opened.condition : found;

  if (isLoadingPermissions || isLoadingLayout || isLoadingConditions) {
    return <Page.Loading />;
  }

  if (!layout || !conditions) {
    return <Page.Error />;
  }

  // The builder opens builder conditions only: the others are in code, a plugin or the plugin itself
  if (slug !== undefined && condition?.source !== 'builder') {
    return <NotFound kind="condition" backPath={CONDITIONS_PATH} />;
  }

  return (
    <ConditionBuilder
      key={condition?.name ?? 'new'}
      layout={layout}
      condition={condition}
      autoReload={autoReload}
      canEdit={autoReload && canUpdate}
      refetchList={refetch}
    />
  );
};

/**
 * `/settings/end-users/conditions/new` and `/settings/end-users/conditions/:slug`. Only the
 * Content-Type Builder mounts the overlay a restart needs, so the page mounts its own.
 */
const BuilderPage = () => {
  return (
    <AutoReloadOverlayBlockerProvider>
      <BuilderLoader />
    </AutoReloadOverlayBlockerProvider>
  );
};

export { BuilderPage };
