import * as React from 'react';

import {
  isFetchError,
  useAPIErrorHandler,
  useFetchClient,
  useForm,
  useNotification,
} from '@strapi/admin/strapi-admin';
import { useDocumentRBAC } from '@strapi/content-manager/strapi-admin';
import { Button, Flex, Loader, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { isAiSource, PLUGIN_ID } from '../constants';
import { usePasteDetection } from '../hooks/usePasteDetection';
import { fieldsStore } from '../store/fields';
import { containsPaste } from '../utils/paste';
import { getTranslation } from '../utils/translations';

import { FieldsModal } from './FieldsModal';
import { PastePrompt } from './PastePrompt';
import { SourceBadge } from './SourceBadge';

import type { EntryProvenance, Source } from '../constants';
import type { PendingPaste } from './FieldsModal';
import type { PanelComponent, PanelComponentProps } from '@strapi/content-manager/strapi-admin';

/**
 * A paste waiting for the editor to say where it comes from. `savedAt` is the `updatedAt` of
 * the entry when the paste happened: once the entry is saved again, the pasted value is
 * stored and an AI declaration can be tied to it.
 */
type Pending = PendingPaste & {
  savedAt: string | undefined;
  /** The pasted text, to drop the declaration when an undo removed it before the save */
  pasted?: string;
  /** The saved value of the field when the paste or the mark happened, as JSON */
  initial?: string;
};

const SOURCE_ORDER: Source[] = [
  'ai-generated',
  'ai-assisted',
  'human-entered',
  'automated',
  'unattributed',
];

const isEmpty = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const ProvenancePanelContent = ({
  model,
  documentId,
  document,
  activeTab,
}: PanelComponentProps) => {
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();

  const [provenance, setProvenance] = React.useState<EntryProvenance | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [pending, setPending] = React.useState<Pending[]>([]);
  const pendingRef = React.useRef(pending);
  pendingRef.current = pending;
  // Read by the save effect, which must only run when `updatedAt` changes
  const documentRef = React.useRef(document);
  documentRef.current = document;

  const locale = (document?.locale as string | undefined) ?? undefined;
  const status =
    activeTab === 'published' ? 'published' : activeTab === 'draft' ? 'draft' : undefined;
  const canUpdate = useDocumentRBAC('ProvenancePanel', (state) => state.canUpdate === true);
  const canUpdateFields = useDocumentRBAC('ProvenancePanel', (state) => state.canUpdateFields);
  // The published tab is read-only, and so is the entry without the update permission
  const canEdit = activeTab !== 'published' && canUpdate;
  const updatedAt = document?.updatedAt as string | undefined;
  // Moving a review workflow stage leaves `updatedAt` as is, but approving reviews the fields
  const stageId = (document?.strapi_stage as { id?: number } | null | undefined)?.id;
  const previousStageId = React.useRef(stageId);
  const basePath = `/${PLUGIN_ID}/entries/${model}/${documentId}`;

  const notifyError = React.useCallback(
    (error: unknown) => {
      toggleNotification({
        type: 'danger',
        message: isFetchError(error) ? formatAPIError(error) : String(error),
      });
    },
    [toggleNotification, formatAPIError]
  );

  const load = React.useCallback(async () => {
    try {
      const { data } = await get<{ data: EntryProvenance }>(basePath, {
        params: { locale, status },
      });
      setProvenance(data.data);
    } catch {
      setProvenance(null);
    } finally {
      setIsLoading(false);
    }
  }, [get, basePath, locale, status]);

  const exportProof = React.useCallback(async () => {
    // The proof is about what readers see: the published version, once there is one
    const exportStatus = document?.status === 'draft' ? 'draft' : 'published';

    try {
      const { data } = await get(`${basePath}/export`, {
        params: { locale, status: exportStatus },
      });
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      );
      const link = window.document.createElement('a');

      link.href = url;
      link.download = `provenance-${documentId}${locale ? `-${locale}` : ''}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notifyError(error);
    }
  }, [get, basePath, locale, document?.status, documentId, notifyError]);

  const declareAi = React.useCallback(
    (fields: string[]) => post(`${basePath}/declare`, { locale, status, fields }),
    [post, basePath, locale, status]
  );

  React.useEffect(() => {
    // After a save, declare the pasted fields the editor marked as AI, now that their value
    // is stored, then reload
    const run = async () => {
      const saved = pendingRef.current.filter((item) => item.savedAt !== updatedAt);
      // An undo can remove a paste before the save: nothing to declare then
      const undone = saved.filter(
        (item) =>
          item.pasted !== undefined &&
          !containsPaste(documentRef.current?.[item.field], item.pasted)
      );
      const ready = saved.filter((item) => item.decision === 'ai' && !undone.includes(item));

      if (undone.length > 0) {
        setPending((current) => current.filter((item) => !undone.includes(item)));
      }

      if (ready.length > 0) {
        try {
          await declareAi(ready.map((item) => item.field));
          setPending((current) =>
            current.filter((item) => !ready.some((done) => done.field === item.field))
          );
        } catch (error) {
          notifyError(error);
        }
      }

      await load();
    };

    run();
  }, [load, declareAi, notifyError, updatedAt]);

  React.useEffect(() => {
    if (previousStageId.current !== stageId) {
      previousStageId.current = stageId;
      load();
    }
  }, [load, stageId]);

  // Read on demand: selecting `values` would render the panel on every keystroke
  const getValues = useForm('ProvenancePanel', (state) => state.getValues);
  const formInitialValues = useForm('ProvenancePanel', (state) => state.initialValues);
  const modified = useForm('ProvenancePanel', (state) => state.modified);
  const initialJson = (field: string) =>
    JSON.stringify((formInitialValues as Record<string, unknown>)[field] ?? null);

  React.useEffect(() => {
    // Back to the saved values without saving (an undo): the edit or paste the decision was
    // about is gone. Otherwise Save stays disabled while Publish waits for a save.
    if (modified) {
      return;
    }

    const values = getValues() as Record<string, unknown>;
    const reverted = (item: Pending) =>
      item.initial !== undefined &&
      initialJson(item.field) === item.initial &&
      JSON.stringify(values[item.field] ?? null) === item.initial;

    if (pendingRef.current.some(reverted)) {
      setPending((current) => current.filter((item) => !reverted(item)));
    }
    // Only when the form becomes unmodified
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modified]);
  const getFormState = () => ({
    values: getValues() as Record<string, unknown>,
    initialValues: formInitialValues as Record<string, unknown>,
  });

  const trackedFields = React.useMemo(
    () => (provenance ? Object.keys(provenance.fields) : []),
    [provenance]
  );

  usePasteDetection(canEdit ? trackedFields : [], (fields, pasted) => {
    setPending((current) => [
      ...current.filter((item) => !fields.includes(item.field)),
      ...fields.map((field) => ({
        field,
        decision: 'undecided' as const,
        savedAt: updatedAt,
        pasted,
        initial: initialJson(field),
      })),
    ]);
  });

  const submit = async (action: () => Promise<unknown>) => {
    setIsSubmitting(true);

    try {
      await action();
      await load();
    } catch (error) {
      notifyError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Marks a field as AI. A value edited since the last save is declared after the next
   * save, so the declaration describes the stored value.
   */
  const markAsAi = (field: string) => {
    const { values, initialValues } = getFormState();
    const edited =
      JSON.stringify(values[field] ?? null) !== JSON.stringify(initialValues[field] ?? null);

    if (pending.some((item) => item.field === field)) {
      qualifyPaste([field], 'ai');
    } else if (edited) {
      setPending((current) => [
        ...current,
        { field, decision: 'ai', savedAt: updatedAt, initial: initialJson(field) },
      ]);
    } else {
      submit(() => declareAi([field]));
    }
  };

  const qualifyPaste = (fields: string[], decision: 'ai' | 'other' | 'undo') => {
    const items = pending.filter((candidate) => fields.includes(candidate.field));
    const without = (current: Pending[], done: Pending[]) =>
      current.filter((candidate) => !done.some((item) => item.field === candidate.field));

    if (decision === 'other') {
      setPending((current) => without(current, items));
    } else if (decision === 'undo') {
      setPending((current) =>
        current.map((candidate) =>
          fields.includes(candidate.field) ? { ...candidate, decision: 'undecided' } : candidate
        )
      );
    } else {
      // Already saved since the paste: the stored value is the pasted one
      const saved = items.filter((item) => item.savedAt !== updatedAt);

      setPending((current) =>
        without(current, saved).map((candidate) =>
          fields.includes(candidate.field) ? { ...candidate, decision: 'ai' } : candidate
        )
      );

      if (saved.length > 0) {
        submit(() => declareAi(saved.map((item) => item.field)));
      }
    }
  };

  // Label actions next to each field read the same state
  const markAsAiRef = React.useRef(markAsAi);
  markAsAiRef.current = markAsAi;
  const qualifyPasteRef = React.useRef(qualifyPaste);
  qualifyPasteRef.current = qualifyPaste;

  React.useEffect(() => {
    fieldsStore.set(
      provenance === null
        ? null
        : {
            provenance,
            pending,
            canEdit,
            canUpdateFields,
            isSubmitting,
            markAsAi: (field) => markAsAiRef.current(field),
            cancel: (field) => qualifyPasteRef.current([field], 'other'),
          }
    );
  }, [provenance, pending, canEdit, canUpdateFields, isSubmitting]);

  React.useEffect(() => () => fieldsStore.set(null), []);

  if (isLoading) {
    return <Loader small />;
  }

  if (provenance === null) {
    return (
      <Typography variant="pi" textColor="neutral600">
        {formatMessage({
          id: getTranslation('panel.unavailable'),
          defaultMessage: 'Provenance is not available for this entry.',
        })}
      </Typography>
    );
  }

  // Empty fields without any history only add noise
  const fields = Object.entries(provenance.fields).filter(
    ([name, field]) =>
      field.source !== 'unattributed' || field.review !== null || !isEmpty(document?.[name])
  );
  const awaitingReview = fields.filter(([, field]) => isAiSource(field.source) && !field.review);
  const counts = SOURCE_ORDER.map(
    (source) => [source, fields.filter(([, field]) => field.source === source).length] as const
  ).filter(([, count]) => count > 0);
  const undecided = pending.filter((item) => item.decision === 'undecided');
  const queued = pending.filter((item) => item.decision === 'ai');

  return (
    <Flex direction="column" alignItems="stretch" gap={3} width="100%">
      <PastePrompt
        // The modal lists the same question; the card would sit above its overlay
        fields={isModalOpen ? [] : undecided.map((item) => item.field)}
        disabled={isSubmitting}
        onQualify={(decision) =>
          qualifyPaste(
            undecided.map((item) => item.field),
            decision
          )
        }
        onOpenDetails={() => setIsModalOpen(true)}
      />

      {queued.length > 0 ? (
        <Typography variant="pi" textColor="neutral600">
          {formatMessage(
            {
              id: getTranslation('paste.queued-summary'),
              defaultMessage:
                '{count, plural, one {# field} other {# fields}} will be marked as AI when you save. Save before publishing.',
            },
            { count: queued.length }
          )}
        </Typography>
      ) : null}

      <Typography variant="pi" textColor={awaitingReview.length > 0 ? 'warning600' : 'neutral600'}>
        {awaitingReview.length > 0
          ? formatMessage(
              {
                id: getTranslation('panel.awaiting-review'),
                defaultMessage:
                  '{count, plural, one {# AI field awaits} other {# AI fields await}} human review',
              },
              { count: awaitingReview.length }
            )
          : formatMessage({
              id: getTranslation('panel.no-pending-ai'),
              defaultMessage: 'No AI content awaiting review',
            })}
      </Typography>

      {provenance.publishRequiresReview && awaitingReview.length > 0 ? (
        <Typography variant="pi" textColor="danger600">
          {formatMessage({
            id: getTranslation('panel.publish-blocked'),
            defaultMessage: 'Publishing is blocked until they are reviewed.',
          })}
        </Typography>
      ) : null}

      {counts.length > 0 ? (
        <Flex gap={2} wrap="wrap">
          {counts.map(([source, count]) => (
            <Flex key={source} gap={1}>
              <SourceBadge source={source} />
              <Typography variant="pi" fontWeight="semiBold" textColor="neutral700">
                {count}
              </Typography>
            </Flex>
          ))}
        </Flex>
      ) : null}

      <Button fullWidth variant="tertiary" onClick={() => setIsModalOpen(true)}>
        {formatMessage({ id: getTranslation('panel.see-fields'), defaultMessage: 'See fields' })}
      </Button>

      <FieldsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        fields={fields}
        pending={pending}
        canEdit={canEdit}
        isSubmitting={isSubmitting}
        onDeclareAi={markAsAi}
        onQualifyPaste={(field, decision) => qualifyPaste([field], decision)}
        onExport={exportProof}
        onReviewAll={() =>
          submit(() =>
            post(`${basePath}/review`, { locale, status, fields: fields.map(([name]) => name) })
          )
        }
      />
    </Flex>
  );
};

const ProvenancePanel: PanelComponent = (props) => {
  const { formatMessage } = useIntl();

  // The loaded document, not the route id: a single type has no id in its route, and the
  // clone screen passes the id of the entry it copies
  const documentId = props.document?.documentId as string | undefined;

  // Nothing is recorded before the entry exists, and only API content types are followed
  if (!documentId || !props.model.startsWith('api::')) {
    return null;
  }

  return {
    title: formatMessage({ id: getTranslation('panel.title'), defaultMessage: 'Provenance' }),
    content: <ProvenancePanelContent {...props} documentId={documentId} />,
  };
};

export { ProvenancePanel };
