import * as React from 'react';

import { ConfirmDialog, Layouts, Page, useNotification, useRBAC } from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  Link,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { ArrowLeft, Mail } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useParams } from 'react-router-dom';

import { PERMISSIONS } from '../../constants';
import {
  useAdminLocales,
  useResetTemplate,
  useSendTestTemplate,
  useTemplate,
  useTemplates,
  useUpdateTemplate,
} from '../../services/templates';

import type { TemplateContent } from '../../../../shared/contracts/templates';

type ContentField = keyof TemplateContent;

const DEFAULT_LOCALE = 'en';

const MONOSPACE = { fontFamily: 'monospace' };

export const EditPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { key = '' } = useParams<{ key: string }>();
  const [locale, setLocale] = React.useState(DEFAULT_LOCALE);

  const {
    allowedActions: { canUpdate },
  } = useRBAC({ update: PERMISSIONS.templatesUpdate });

  const { data: template, isLoading, isError } = useTemplate(key, locale);
  const { data: summaries } = useTemplates();
  const { data: adminLocales = [] } = useAdminLocales();

  const update = useUpdateTemplate(key, locale);
  const reset = useResetTemplate(key, locale);
  const sendTest = useSendTestTemplate(key, locale);

  const [values, setValues] = React.useState<TemplateContent>({ subject: '', html: '', text: '' });
  const [isResetOpen, setIsResetOpen] = React.useState(false);

  // Where the next variable goes: the field last focused and its selection.
  const cursor = React.useRef<{ field: ContentField; start: number; end: number }>({
    field: 'html',
    start: Infinity,
    end: Infinity,
  });

  React.useEffect(() => {
    if (template) {
      setValues({ subject: template.subject, html: template.html, text: template.text });
    }
  }, [template]);

  const locales = Array.from(
    new Set([
      DEFAULT_LOCALE,
      ...(summaries?.find((summary) => summary.key === key)?.locales ?? []),
      ...adminLocales,
      locale,
    ])
  );

  const trackCursor =
    (field: ContentField) =>
    (event: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { selectionStart, selectionEnd } = event.currentTarget;

      cursor.current = {
        field,
        start: selectionStart ?? Infinity,
        end: selectionEnd ?? Infinity,
      };
    };

  const handleChange =
    (field: ContentField) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
    };

  const insertVariable = (name: string) => {
    const { field, start, end } = cursor.current;
    const token = `{{ ${name} }}`;

    setValues((current) => {
      const value = current[field];
      const from = Math.min(start, value.length);
      const to = Math.min(end, value.length);

      return { ...current, [field]: value.slice(0, from) + token + value.slice(to) };
    });

    const position = Math.min(start, values[field].length) + token.length;
    cursor.current = { field, start: position, end: position };
  };

  // A refused request (400) carries the reason, such as a variable in a place it may not go, so it is shown
  // as the server wrote it, not run through the translation formatter: the text can hold `{{ variable }}`.
  // Any other failure gets the generic message.
  const notifyError = (message: { id: string; defaultMessage: string }, error?: unknown) => {
    const { status, response } = (error ?? {}) as {
      status?: number;
      response?: { data?: { error?: { message?: unknown } } };
    };
    const reason = response?.data?.error?.message;

    toggleNotification({
      type: 'danger',
      message:
        status === 400 && typeof reason === 'string' && reason.length > 0
          ? reason
          : formatMessage(message),
    });
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    update.mutate(values, {
      onSuccess: () =>
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'email.Templates.edit.saved',
            defaultMessage: 'Template saved',
          }),
        }),
      onError: (error) =>
        notifyError(
          {
            id: 'email.Templates.edit.saveError',
            defaultMessage: 'Could not save the template',
          },
          error
        ),
    });
  };

  const handleReset = () => {
    setIsResetOpen(false);

    reset.mutate(undefined, {
      onSuccess: () =>
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'email.Templates.edit.resetDone',
            defaultMessage: 'Template reset to default',
          }),
        }),
      onError: () =>
        notifyError({
          id: 'email.Templates.edit.resetError',
          defaultMessage: 'Could not reset the template',
        }),
    });
  };

  const handleSendTest = () => {
    sendTest.mutate(values, {
      onSuccess: () =>
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'email.Templates.edit.testSent',
            defaultMessage: 'Test email sent to your address',
          }),
        }),
      onError: (error) =>
        notifyError(
          {
            id: 'email.Templates.edit.testError',
            defaultMessage: 'Could not send the test email',
          },
          error
        ),
    });
  };

  if (isLoading && !template) {
    return <Page.Loading />;
  }

  if (isError || !template) {
    return <Page.Error />;
  }

  const labels: Record<ContentField, { id: string; defaultMessage: string }> = {
    subject: { id: 'email.Templates.edit.subject', defaultMessage: 'Subject' },
    html: { id: 'email.Templates.edit.html', defaultMessage: 'HTML' },
    text: { id: 'email.Templates.edit.text', defaultMessage: 'Plain text' },
  };

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: key }
        )}
      </Page.Title>
      <form onSubmit={handleSave}>
        <Layouts.Header
          title={key}
          subtitle={
            template.isDefault
              ? formatMessage({
                  id: 'email.Templates.edit.isDefault',
                  defaultMessage: 'Showing the default content',
                })
              : undefined
          }
          navigationAction={
            <Link tag={NavLink} to=".." startIcon={<ArrowLeft />}>
              {formatMessage({ id: 'global.back', defaultMessage: 'Back' })}
            </Link>
          }
          primaryAction={
            canUpdate ? (
              <Flex gap={2}>
                <Button
                  type="button"
                  variant="tertiary"
                  startIcon={<Mail />}
                  loading={sendTest.isLoading}
                  onClick={handleSendTest}
                >
                  {formatMessage({
                    id: 'email.Templates.edit.sendTest',
                    defaultMessage: 'Send test',
                  })}
                </Button>
                <Dialog.Root open={isResetOpen} onOpenChange={setIsResetOpen}>
                  <Dialog.Trigger>
                    <Button type="button" variant="danger-light" loading={reset.isLoading}>
                      {formatMessage({
                        id: 'email.Templates.edit.reset',
                        defaultMessage: 'Reset to default',
                      })}
                    </Button>
                  </Dialog.Trigger>
                  <ConfirmDialog onConfirm={handleReset}>
                    {formatMessage(
                      {
                        id: 'email.Templates.edit.resetConfirm',
                        defaultMessage:
                          'This removes your changes to this template in the {locale} locale and restores the default.',
                      },
                      { locale }
                    )}
                  </ConfirmDialog>
                </Dialog.Root>
                <Button type="submit" loading={update.isLoading}>
                  {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                </Button>
              </Flex>
            ) : undefined
          }
        />
        <Layouts.Content>
          <Flex direction="column" alignItems="stretch" gap={6}>
            <Box
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Flex direction="column" alignItems="stretch" gap={5}>
                <Field.Root name="locale">
                  <Field.Label>
                    {formatMessage({ id: 'email.Templates.edit.locale', defaultMessage: 'Locale' })}
                  </Field.Label>
                  <SingleSelect value={locale} onChange={(value) => setLocale(String(value))}>
                    {locales.map((code) => (
                      <SingleSelectOption key={code} value={code}>
                        {code}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>

                <Field.Root name="subject">
                  <Field.Label>{formatMessage(labels.subject)}</Field.Label>
                  <TextInput
                    value={values.subject}
                    readOnly={!canUpdate}
                    onChange={handleChange('subject')}
                    onBlur={trackCursor('subject')}
                  />
                </Field.Root>

                <Field.Root
                  name="html"
                  hint={formatMessage({
                    id: 'email.Templates.edit.htmlHint',
                    defaultMessage:
                      'Saving removes scripts, frames, forms, style blocks, event handlers such as onclick, and any link or image address that is not http, https or mailto.',
                  })}
                >
                  <Field.Label>{formatMessage(labels.html)}</Field.Label>
                  <Textarea
                    style={MONOSPACE}
                    rows={12}
                    value={values.html}
                    readOnly={!canUpdate}
                    onChange={handleChange('html')}
                    onBlur={trackCursor('html')}
                  />
                  <Field.Hint />
                </Field.Root>

                <Field.Root name="text">
                  <Field.Label>{formatMessage(labels.text)}</Field.Label>
                  <Textarea
                    style={MONOSPACE}
                    rows={8}
                    value={values.text}
                    readOnly={!canUpdate}
                    onChange={handleChange('text')}
                    onBlur={trackCursor('text')}
                  />
                </Field.Root>
              </Flex>
            </Box>

            <Box
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Flex direction="column" alignItems="stretch" gap={3}>
                <Typography variant="delta" tag="h2">
                  {formatMessage({
                    id: 'email.Templates.edit.variables',
                    defaultMessage: 'Variables',
                  })}
                </Typography>
                <Typography textColor="neutral600">
                  {formatMessage({
                    id: 'email.Templates.edit.variablesHint',
                    defaultMessage:
                      'Select a variable to insert it where the cursor was in the subject, HTML or text.',
                  })}
                </Typography>
                <Flex gap={2} wrap="wrap">
                  {template.variables.map((name) => (
                    <Button
                      key={name}
                      type="button"
                      size="S"
                      variant="secondary"
                      disabled={!canUpdate}
                      onClick={() => insertVariable(name)}
                    >
                      {`{{ ${name} }}`}
                    </Button>
                  ))}
                </Flex>
              </Flex>
            </Box>
          </Flex>
        </Layouts.Content>
      </form>
    </Page.Main>
  );
};
