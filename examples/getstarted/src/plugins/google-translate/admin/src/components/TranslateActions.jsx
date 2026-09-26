import * as React from 'react';
import {
  Button,
  Dialog,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import { useFetchClient, useNotification, useQueryParams } from '@strapi/strapi/admin';

const TranslateIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden
  >
    <text x="0.5" y="11.5" fontSize="9" fill="currentColor" fontFamily="system-ui, sans-serif">
      文
    </text>
    <text x="8" y="13" fontSize="10" fill="currentColor" fontFamily="system-ui, sans-serif">
      A
    </text>
  </svg>
);

const useGoogleTranslate = () => {
  const { get, post } = useFetchClient();
  const [configured, setConfigured] = React.useState(false);
  const [locales, setLocales] = React.useState([]);

  React.useEffect(() => {
    Promise.all([get('/google-translate/settings'), get('/google-translate/locales')])
      .then(([settingsRes, localesRes]) => {
        setConfigured(Boolean(settingsRes.data?.configured));
        setLocales(localesRes.data || []);
      })
      .catch(() => {
        setConfigured(false);
      });
  }, [get]);

  return { configured, locales, post };
};

const TranslateDialogContent = ({
  locales,
  sourceLocale,
  setSourceLocale,
  currentLocale,
  configured,
  loading,
  onClose,
  onConfirm,
}) => {
  const sourceOptions = locales.filter((locale) => locale.code !== currentLocale);

  return (
    <>
      <Dialog.Body>
        <Flex direction="column" gap={3} width="100%">
          {!configured ? (
            <Typography textAlign="center">
              Add Google credentials first: Settings → Google Translate.
            </Typography>
          ) : (
            <>
              <Typography textAlign="center">
                Your current locale will be filled with a Google translation from the language you
                select.
              </Typography>
              <Field.Root width="100%">
                <Field.Label>Translate from</Field.Label>
                <SingleSelect
                  value={sourceLocale}
                  placeholder="Select one locale..."
                  onChange={(value) => setSourceLocale(value)}
                >
                  {sourceOptions.map((locale) => (
                    <SingleSelectOption key={locale.code} value={locale.code}>
                      {locale.name}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
              </Field.Root>
            </>
          )}
        </Flex>
      </Dialog.Body>
      <Dialog.Footer>
        <Flex gap={2} width="100%">
          <Button flex="auto" variant="tertiary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            flex="auto"
            onClick={onConfirm}
            loading={loading}
            disabled={!configured || !sourceLocale}
          >
            Translate
          </Button>
        </Flex>
      </Dialog.Footer>
    </>
  );
};

/**
 * Header icon next to the locale picker (same pattern as "Fill from another locale").
 */
const GoogleTranslateHeaderAction = ({ documentId, model, document }) => {
  const { toggleNotification } = useNotification();
  const [{ query }] = useQueryParams();
  const { configured, locales, post } = useGoogleTranslate();
  const [sourceLocale, setSourceLocale] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const currentLocale = query?.plugins?.i18n?.locale || query?.locale || document?.locale;

  React.useEffect(() => {
    const fallback =
      locales.find((locale) => locale.code !== currentLocale && locale.isDefault)?.code ||
      locales.find((locale) => locale.code !== currentLocale)?.code ||
      '';
    setSourceLocale((current) => {
      if (current && current !== currentLocale) {
        return current;
      }
      return fallback;
    });
  }, [locales, currentLocale]);

  if (!documentId) {
    return null;
  }

  const runTranslate = (onClose) => async () => {
    if (!configured) {
      toggleNotification({
        type: 'danger',
        message: 'Add Google credentials in Settings → Google Translate first.',
      });
      return;
    }

    if (!sourceLocale || !currentLocale) {
      toggleNotification({
        type: 'danger',
        message: 'Choose a source language and open a locale in the editor.',
      });
      return;
    }

    setLoading(true);
    try {
      await post('/google-translate/translate', {
        uid: model,
        documentId,
        sourceLocale,
        targetLocale: currentLocale,
      });
      toggleNotification({
        type: 'success',
        message: `Translated from ${sourceLocale} to ${currentLocale}`,
      });
      onClose();
      window.location.reload();
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: error?.response?.data?.error?.message || error.message || 'Translation failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    type: 'icon',
    icon: <TranslateIcon />,
    disabled: locales.length < 2,
    label: 'Translate from another locale',
    dialog: {
      type: 'dialog',
      title: 'Translate from another locale',
      content: ({ onClose }) => (
        <TranslateDialogContent
          locales={locales}
          sourceLocale={sourceLocale}
          setSourceLocale={setSourceLocale}
          currentLocale={currentLocale}
          configured={configured}
          loading={loading}
          onClose={onClose}
          onConfirm={runTranslate(onClose)}
        />
      ),
    },
  };
};

export { GoogleTranslateHeaderAction };
