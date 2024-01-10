import * as React from 'react';

import {
  Box,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import {
  Permission,
  useCMEditViewDataManager,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { Duplicate, ExclamationMarkCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { useTypedDispatch } from '../store/hooks';
import { Locale } from '../store/reducers';
import { Localization, cleanData } from '../utils/data';
import { getTranslation } from '../utils/getTranslation';

/* -------------------------------------------------------------------------------------------------
 * CMEditViewCopyLocale
 * -----------------------------------------------------------------------------------------------*/

interface CMEditViewCopyLocaleProps {
  appLocales: Locale[];
  currentLocale: string;
  localizations: Localization[];
  readPermissions: Permission[];
}

const CMEditViewCopyLocale = ({
  appLocales = [],
  currentLocale,
  localizations = [],
  readPermissions = [],
}: CMEditViewCopyLocaleProps) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const dispatch = useTypedDispatch();
  const { allLayoutData, initialData, slug } = useCMEditViewDataManager();
  const { get } = useFetchClient();

  const options = React.useMemo(
    () =>
      appLocales
        .filter(({ code }) => {
          return (
            code !== currentLocale &&
            localizations.findIndex(({ locale }) => locale === code) !== -1
          );
        })
        .filter(({ code }) => {
          return readPermissions.some(({ properties }) =>
            (properties?.locales ?? []).includes(code)
          );
        })
        .map((locale) => {
          /**
           * We will only ever have localisations that have been activated by the
           * user, so we can safely assume that the locale will be in the list.
           */
          const localization = localizations.find((loc) => locale.code === loc.locale)!;

          /**
           * @note we use the value of the localization here because we're accessing the
           * content's entities not the entry of the locale itself
           */
          return {
            label: locale.name,
            value: localization.id,
          };
        }),
    [appLocales, currentLocale, localizations, readPermissions]
  );

  const [value, setValue] = React.useState(options[0]?.value || '');

  if (localizations.length === 0) {
    return null;
  }

  /**
   * TODO: move this to an actual mutation
   */
  const handleConfirmCopyLocale = async () => {
    if (!value) {
      handleToggle();

      return;
    }

    setIsLoading(true);
    try {
      const { data: response } = await get(`/content-manager/collection-types/${slug}/${value}`);

      // @ts-expect-error – there will always be allLayoutData.contentType. TODO: fix in V5 helper-plugin.
      const cleanedData = cleanData(response, allLayoutData, localizations);
      ['createdBy', 'updatedBy', 'publishedAt', 'id', 'createdAt'].forEach((key) => {
        if (!initialData[key]) return;
        cleanedData[key] = initialData[key];
      });

      dispatch({
        // @ts-expect-error – we've not added the CRUD reducer the redux store types yet.
        type: 'ContentManager/CrudReducer/GET_DATA_SUCCEEDED',
        data: cleanedData,
        setModifiedDataOnly: true,
      });

      toggleNotification({
        type: 'success',
        message: {
          id: getTranslation('CMEditViewCopyLocale.copy-success'),
          defaultMessage: 'Locale copied!',
        },
      });
    } catch (err) {
      console.error(err);

      toggleNotification({
        type: 'warning',
        message: {
          id: getTranslation('CMEditViewCopyLocale.copy-failure'),
          defaultMessage: 'Failed to copy locale',
        },
      });
    } finally {
      setIsLoading(false);
      handleToggle();
    }
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <StyledTypography
        fontSize={2}
        textColor="primary600"
        as="button"
        type="button"
        onClick={handleToggle}
      >
        <Flex>
          <Duplicate width="12px" height="12px" />
          {formatMessage({
            id: getTranslation('CMEditViewCopyLocale.copy-text'),
            defaultMessage: 'Fill in from another locale',
          })}
        </Flex>
      </StyledTypography>
      {isOpen && (
        <Dialog onClose={handleToggle} title="Confirmation" isOpen={isOpen}>
          <DialogBody icon={<ExclamationMarkCircle />}>
            <Flex direction="column" alignItems="stretch" gap={2}>
              <Flex justifyContent="center">
                <Typography textAlign="center" id="confirm-description">
                  {formatMessage({
                    id: getTranslation('CMEditViewCopyLocale.ModalConfirm.content'),
                    defaultMessage:
                      'Your current content will be erased and filled by the content of the selected locale:',
                  })}
                </Typography>
              </Flex>
              <Box>
                <SingleSelect
                  label={formatMessage({
                    id: getTranslation('Settings.locales.modal.locales.label'),
                    defaultMessage: 'Locales',
                  })}
                  onChange={setValue}
                  value={value}
                >
                  {options.map(({ label, value }) => {
                    return (
                      <SingleSelectOption key={value} value={value}>
                        {label}
                      </SingleSelectOption>
                    );
                  })}
                </SingleSelect>
              </Box>
            </Flex>
          </DialogBody>
          <DialogFooter
            startAction={
              <Button onClick={handleToggle} variant="tertiary">
                {formatMessage({
                  id: 'popUpWarning.button.cancel',
                  defaultMessage: 'No, cancel',
                })}
              </Button>
            }
            endAction={
              <Button variant="success" onClick={handleConfirmCopyLocale} loading={isLoading}>
                {formatMessage({
                  id: getTranslation('CMEditViewCopyLocale.submit-text'),
                  defaultMessage: 'Yes, fill in',
                })}
              </Button>
            }
          />
        </Dialog>
      )}
    </>
  );
};

const StyledTypography = styled(Typography)`
  svg {
    margin-right: ${({ theme }) => theme.spaces[2]};
    fill: none;
    > g,
    path {
      fill: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

export { CMEditViewCopyLocale };
