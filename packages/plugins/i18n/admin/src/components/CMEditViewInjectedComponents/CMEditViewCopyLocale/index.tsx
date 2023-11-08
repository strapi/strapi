import * as React from 'react';

import {
  Box,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  Flex,
  Option,
  Select,
  Typography,
} from '@strapi/design-system';
import { useCMEditViewDataManager, useFetchClient, useNotification } from '@strapi/helper-plugin';
import { Duplicate, ExclamationMarkCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { getTrad } from '../../../utils';

import { cleanData, generateOptions } from './utils';

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

const CenteredTypography = styled(Typography)`
  text-align: center;
`;

type ContentProps = {
  appLocales: Array<{
    code: string;
    name: string;
  }>;
  currentLocale: string;
  localizations: Array<{
    id: number;
    locale: string;
  }>;
  readPermissions: Array<{
    properties: {
      locales: Array<string>;
    };
  }>;
};

type CMEditViewCopyLocaleProps = ContentProps;

const CMEditViewCopyLocale = (props: CMEditViewCopyLocaleProps) => {
  if (!props.localizations.length) {
    return null;
  }

  return <Content {...props} />;
};

const Content = ({ appLocales, currentLocale, localizations, readPermissions }: ContentProps) => {
  const options = generateOptions(appLocales, currentLocale, localizations, readPermissions);

  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const { allLayoutData, initialData, slug } = useCMEditViewDataManager();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [value, setValue] = React.useState(options[0]?.value || '');
  const { get } = useFetchClient();

  const handleConfirmCopyLocale = async () => {
    if (!value) {
      handleToggle();

      return;
    }

    const requestURL = `/content-manager/collection-types/${slug}/${value}`;

    setIsLoading(true);
    try {
      const { data: response } = await get(requestURL);

      const cleanedData = cleanData(response, allLayoutData, localizations);
      ['createdBy', 'updatedBy', 'publishedAt', 'id', 'createdAt'].forEach((key) => {
        if (!initialData[key]) return;
        cleanedData[key] = initialData[key];
      });

      dispatch({
        type: 'ContentManager/CrudReducer/GET_DATA_SUCCEEDED',
        data: cleanedData,
        setModifiedDataOnly: true,
      });

      toggleNotification({
        type: 'success',
        message: {
          id: getTrad('CMEditViewCopyLocale.copy-success'),
          defaultMessage: 'Locale copied!',
        },
      });
    } catch (err) {
      console.error(err);

      toggleNotification({
        type: 'warning',
        message: {
          id: getTrad('CMEditViewCopyLocale.copy-failure'),
          defaultMessage: 'Failed to copy locale',
        },
      });
    } finally {
      setIsLoading(false);
      handleToggle();
    }
  };

  const handleChange = (value: any) => {
    setValue(value);
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
            id: getTrad('CMEditViewCopyLocale.copy-text'),
            defaultMessage: 'Fill in from another locale',
          })}
        </Flex>
      </StyledTypography>
      {isOpen && (
        <Dialog onClose={handleToggle} title="Confirmation" isOpen={isOpen}>
          <DialogBody icon={<ExclamationMarkCircle />}>
            <Flex direction="column" alignItems="stretch" gap={2}>
              <Flex justifyContent="center">
                <CenteredTypography id="confirm-description">
                  {formatMessage({
                    id: getTrad('CMEditViewCopyLocale.ModalConfirm.content'),
                    defaultMessage:
                      'Your current content will be erased and filled by the content of the selected locale:',
                  })}
                </CenteredTypography>
              </Flex>
              <Box>
                <Select
                  label={formatMessage({
                    id: getTrad('Settings.locales.modal.locales.label'),
                  })}
                  onChange={handleChange}
                  value={value}
                >
                  {options.map(({ label, value }) => {
                    return (
                      <Option key={value} value={value}>
                        {label}
                      </Option>
                    );
                  })}
                </Select>
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
                  id: getTrad('CMEditViewCopyLocale.submit-text'),
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

export default CMEditViewCopyLocale;
