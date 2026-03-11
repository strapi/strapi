import * as React from 'react';

import { useFetchClient, useTracking } from '@strapi/admin/strapi-admin';
import { Box, Button, Field, Modal, TextInput } from '@strapi/design-system';
import { Form, Formik } from 'formik';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';

const extractVimeoId = (raw: unknown) => {
  const s = String(raw ?? '').trim();

  if (/^\d+$/.test(s)) return s;

  let m = s.match(/vimeo\.com\/(\d+)/);
  if (m?.[1]) return m[1];

  m = s.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (m?.[1]) return m[1];

  return null;
};

interface FromVimeoIdFormProps {
  onClose: () => void;
  addUploadedFiles?: (files: any[]) => void;
  trackedLocation?: string;
}

export const FromVimeoIdForm = ({
  onClose,
  addUploadedFiles,
  trackedLocation,
}: FromVimeoIdFormProps) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  const { formatMessage } = useIntl();
  const { post } = useFetchClient();
  const { trackUsage } = useTracking();

  const handleSubmit = async ({ vimeoId }: { vimeoId: string }) => {
    setLoading(true);
    setError(undefined);

    const id = extractVimeoId(vimeoId);

    if (!id) {
      setError(
        new Error(
          formatMessage({
            id: getTrad('modal.vimeo-id.error.invalid'),
            defaultMessage: 'Invalid Vimeo ID.',
          })
        )
      );
      setLoading(false);
      return;
    }

    try {
      const res = await post('/upload/actions/import-vimeo-id', { vimeoId: id });
      const createdAsset = res?.data;

      if (!createdAsset) {
        throw new Error(
          formatMessage({
            id: getTrad('modal.vimeo-id.error.invalid-response'),
            defaultMessage: 'Invalid server response (missing asset).',
          })
        );
      }

      if (trackedLocation) {
        trackUsage('didSelectFile', { source: 'url', location: trackedLocation });
      }

      if (typeof addUploadedFiles === 'function') {
        addUploadedFiles([createdAsset]);
      }

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Formik
      enableReinitialize
      initialValues={{ vimeoId: '' }}
      onSubmit={handleSubmit}
      validateOnChange={false}
    >
      {({ values, handleChange }) => (
        <Form noValidate>
          <Box paddingLeft={8} paddingRight={8} paddingBottom={6} paddingTop={6}>
            <Field.Root
              hint={formatMessage({
                id: getTrad('modal.vimeo-id.hint'),
                defaultMessage: 'Paste a Vimeo ID or a Vimeo URL (e.g. 1145884689).',
              })}
              error={error?.message}
            >
              <Field.Label>
                {formatMessage({
                  id: getTrad('modal.vimeo-id.label'),
                  defaultMessage: 'Vimeo',
                })}
              </Field.Label>
              <TextInput name="vimeoId" onChange={handleChange} value={values.vimeoId} />
              <Field.Hint />
              <Field.Error />
            </Field.Root>
          </Box>

          <Modal.Footer>
            <Button onClick={onClose} variant="tertiary">
              {formatMessage({
                id: 'app.components.Button.cancel',
                defaultMessage: 'cancel',
              })}
            </Button>
            <Button type="submit" loading={loading}>
              {formatMessage({
                id: getTrad('button.next'),
                defaultMessage: 'Next',
              })}
            </Button>
          </Modal.Footer>
        </Form>
      )}
    </Formik>
  );
};
