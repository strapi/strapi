import * as React from 'react';

import { useAPIErrorHandler } from '@strapi/admin/strapi-admin';
import {
  Alert,
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import {
  useLazyFindEndUsersByEmailQuery,
  usePreviewConditionMutation,
} from '../../../services/conditions';
import { getTranslation } from '../../../utils/getTranslation';
import { typesOf } from '../utils/builderForm';

import type { BuilderConditionV2 } from '../../../../../shared/builder/types';
import type { BuilderLayout } from '../../../../../shared/contracts/conditions';

/** "article" in "12 of 340 articles": the display name in the plural, which a collection type has */
const toPlural = (label: string) => {
  const word = label.toLowerCase();

  if (/[^aeiou]y$/.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }

  return /(s|x|z|ch|sh)$/.test(word) ? `${word}es` : `${word}s`;
};

type Outcome =
  | { kind: 'result'; matching: number; total: number; label: string; email: string }
  | { kind: 'problem'; message: string };

const isForbidden = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { status?: unknown }).status === 403;

interface PreviewPanelProps {
  layout: BuilderLayout;
  /** The condition as the form has it now: its content types, inputs, Who and Which */
  condition: BuilderConditionV2;
  /** The form has nothing the server would refuse: without that there is nothing to count */
  ready: boolean;
}

/** What the admin typed for an input, as the value the condition reads: a number or a boolean when the input is one */
const valueOfInput = (kind: BuilderConditionV2['inputs'][number]['kind'], text: string) =>
  kind === 'number' ? Number(text) : kind === 'boolean' ? text === 'true' : text;

/**
 * Try the condition before it is saved: how many entries of a content type it keeps for a sample
 * end user (found by email, through the Content Manager's list, so the admin finds only whom they
 * may read), out of how many there are. It writes nothing and works in any environment.
 */
const PreviewPanel = ({ layout, condition, ready }: PreviewPanelProps) => {
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [findUser] = useLazyFindEndUsersByEmailQuery();
  const [preview] = usePreviewConditionMutation();

  const [chosen, setChosen] = React.useState<string>();
  const [email, setEmail] = React.useState('');
  // What was typed for each input; an input not typed in keeps its default
  const [typed, setTyped] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  // What was last tried, and for which condition: a result of another one isn't shown
  const [outcome, setOutcome] = React.useState<{ key: string; value: Outcome }>();

  const subjects = typesOf(layout, condition.appliesTo).map(({ uid }) => uid);
  const subject = chosen && subjects.includes(chosen) ? chosen : subjects[0];
  const inputs: Record<string, unknown> = {};

  for (const input of condition.inputs) {
    const text = typed[input.name] ?? (input.default === undefined ? '' : String(input.default));

    if (text !== '') {
      inputs[input.name] = valueOfInput(input.kind, text);
    }
  }

  const key = JSON.stringify([condition, subject, email.trim(), inputs]);
  const shown = outcome?.key === key ? outcome.value : undefined;

  const labelOf = (uid: string) =>
    layout.contentTypes.find((type) => type.uid === uid)?.displayName ?? uid;

  const handlePreview = async () => {
    const address = email.trim();

    if (!ready || !subject || address === '' || busy) {
      return;
    }

    const settle = (value: Outcome) => setOutcome({ key, value });

    setBusy(true);

    try {
      const found = await findUser(address);

      if (found.isError) {
        settle({
          kind: 'problem',
          message: isForbidden(found.error)
            ? formatMessage({
                id: getTranslation('conditions.builder.preview.users-forbidden'),
                defaultMessage:
                  'Finding an end user needs Content Manager read access to end users.',
              })
            : formatAPIError(found.error as Parameters<typeof formatAPIError>[0]),
        });

        return;
      }

      const [user] = found.data ?? [];

      if (!user) {
        settle({
          kind: 'problem',
          message: formatMessage(
            {
              id: getTranslation('conditions.builder.preview.no-user'),
              defaultMessage: 'No end user has the email {email}.',
            },
            { email: address }
          ),
        });

        return;
      }

      const result = await preview({
        condition,
        subject,
        userDocumentId: user.documentId,
        inputs,
      });

      if ('error' in result) {
        // A 403 names what the admin can't read: the content type, the end users, or a field
        settle({
          kind: 'problem',
          message: formatAPIError(result.error as Parameters<typeof formatAPIError>[0]),
        });

        return;
      }

      const type = layout.contentTypes.find(({ uid }) => uid === subject);
      const label = labelOf(subject);

      settle({
        kind: 'result',
        ...result.data,
        label: type?.kind === 'singleType' ? label : toPlural(label),
        email: address,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: getTranslation('conditions.builder.preview.title'),
            defaultMessage: 'Preview',
          })}
        </Typography>
        <Typography textColor="neutral600">
          {formatMessage({
            id: getTranslation('conditions.builder.preview.description'),
            defaultMessage:
              'Try the condition on a content type for an end user: it counts the entries the condition keeps for them. Nothing is saved.',
          })}
        </Typography>
      </Flex>

      <Field.Root name="previewSubject">
        <Field.Label>
          {formatMessage({
            id: getTranslation('conditions.builder.preview.content-type'),
            defaultMessage: 'Content type',
          })}
        </Field.Label>
        <SingleSelect
          value={subject}
          onChange={(next) => setChosen(String(next))}
          disabled={subjects.length === 0}
          placeholder={formatMessage({
            id: getTranslation('conditions.builder.preview.choose-type'),
            defaultMessage: 'Choose a content type under Applies to',
          })}
        >
          {subjects.map((uid) => (
            <SingleSelectOption key={uid} value={uid}>
              {labelOf(uid)}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>

      <Field.Root name="previewEmail">
        <Field.Label>
          {formatMessage({
            id: getTranslation('conditions.builder.preview.email'),
            defaultMessage: "End user's email",
          })}
        </Field.Label>
        <TextInput
          value={email}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
          onKeyDown={(event: React.KeyboardEvent) => {
            // The page is one form: Enter would save the condition
            if (event.key === 'Enter') {
              event.preventDefault();
              handlePreview().catch(() => {
                // The preview reports its own problems; an unexpected failure leaves the panel as it was
              });
            }
          }}
        />
      </Field.Root>

      {condition.inputs
        .filter(({ name }) => name !== '')
        .map((input) => (
          <Field.Root key={input.name} name={`previewInput-${input.name}`}>
            <Field.Label>{input.name}</Field.Label>
            <TextInput
              value={
                typed[input.name] ?? (input.default === undefined ? '' : String(input.default))
              }
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setTyped({ ...typed, [input.name]: event.target.value })
              }
            />
          </Field.Root>
        ))}
      <Flex>
        <Button
          type="button"
          variant="secondary"
          loading={busy}
          disabled={!ready || !subject || email.trim() === ''}
          onClick={handlePreview}
        >
          {formatMessage({
            id: getTranslation('conditions.builder.preview.run'),
            defaultMessage: 'Preview',
          })}
        </Button>
      </Flex>
      {!ready && (
        <Typography textColor="neutral600" variant="pi">
          {formatMessage({
            id: getTranslation('conditions.builder.preview.not-ready'),
            defaultMessage: 'Fix the problems listed above to preview this condition.',
          })}
        </Typography>
      )}
      {shown?.kind === 'result' && (
        <Flex direction="column" alignItems="stretch" gap={1} role="status">
          <Typography variant="beta" tag="p">
            {formatMessage(
              {
                id: getTranslation('conditions.builder.preview.result'),
                defaultMessage: '{matching} of {total} {types}',
              },
              { matching: shown.matching, total: shown.total, types: shown.label }
            )}
          </Typography>
          <Typography textColor="neutral600">
            {formatMessage(
              {
                id: getTranslation('conditions.builder.preview.result-for'),
                defaultMessage: 'The condition keeps these for {email}.',
              },
              { email: shown.email }
            )}
          </Typography>
        </Flex>
      )}
      {shown?.kind === 'problem' && (
        <Alert
          variant="danger"
          closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
          onClose={() => setOutcome(undefined)}
        >
          {shown.message}
        </Alert>
      )}
    </Flex>
  );
};

export { PreviewPanel };
export type { PreviewPanelProps };
