import * as React from 'react';

import { Box, Button, Field, Modal, Textarea } from '@strapi/design-system';
import { Form, Formik } from 'formik';
import { useIntl } from 'react-intl';

import { useTracking } from '../../../hooks/useTracking';
import { getTrad, urlsToAssets, urlSchema } from '../../../utils';

import type { FileWithRawFile } from './AddAssetStep';
import type { MessageDescriptor, PrimitiveType } from 'react-intl';

type TranslationMessage = MessageDescriptor & { values?: Record<string, PrimitiveType> };

const isMessageDescriptor = (error: unknown): error is TranslationMessage =>
  typeof error === 'object' && error !== null && 'id' in error;

interface FromUrlFormProps {
  onClose: () => void;
  onAddAsset: (assets: FileWithRawFile[]) => void;
  trackedLocation?: string;
}

export const FromUrlForm = ({ onClose, onAddAsset, trackedLocation }: FromUrlFormProps) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  /**
   * `urlSchema` errors are message descriptors: they carry the values needed to interpolate
   * placeholders such as `{max}` or `{number}`, even though Formik types the error as a string.
   */
  const formatValidationError = (validationError: unknown) => {
    if (isMessageDescriptor(validationError)) {
      const { values, ...message } = validationError;

      return formatMessage({ defaultMessage: 'An error occurred', ...message }, values);
    }

    if (typeof validationError === 'string') {
      return formatMessage({ id: validationError, defaultMessage: 'An error occurred' });
    }

    return undefined;
  };

  const handleSubmit = async ({ urls }: { urls: string }) => {
    setLoading(true);
    const urlArray = urls.split(/\r?\n/);
    try {
      const assets: FileWithRawFile[] = await urlsToAssets(urlArray);

      if (trackedLocation) {
        trackUsage('didSelectFile', { source: 'url', location: trackedLocation });
      }

      // no need to set the loading to false since the component unmounts
      onAddAsset(assets);
    } catch (e: unknown) {
      setError(e as Error);
      setLoading(false);
    }
  };

  return (
    <Formik
      enableReinitialize
      initialValues={{
        urls: '',
      }}
      onSubmit={handleSubmit}
      validationSchema={urlSchema}
      validateOnChange={false}
    >
      {({ values, errors, handleChange }) => (
        <Form noValidate>
          <Box paddingLeft={8} paddingRight={8} paddingBottom={6} paddingTop={6}>
            <Field.Root
              hint={formatMessage({
                id: getTrad('input.url.description'),
                defaultMessage: 'Separate your URL links by a carriage return.',
              })}
              error={error?.message || formatValidationError(errors.urls)}
            >
              <Field.Label>
                {formatMessage({ id: getTrad('input.url.label'), defaultMessage: 'URL' })}
              </Field.Label>
              <Textarea name="urls" onChange={handleChange} value={values.urls} />
              <Field.Hint />
              <Field.Error />
            </Field.Root>
          </Box>

          <Modal.Footer>
            <Button onClick={onClose} variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'cancel' })}
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
