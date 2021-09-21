import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { Dialog, DialogBody, DialogFooter } from '@strapi/parts/Dialog';
import { Select, Option } from '@strapi/parts/Select';
import { Button } from '@strapi/parts/Button';
import { Box } from '@strapi/parts/Box';
import { Typography, Text } from '@strapi/parts/Text';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import AlertWarningIcon from '@strapi/icons/AlertWarningIcon';
import Duplicate from '@strapi/icons/Duplicate';
import { useCMEditViewDataManager, useNotification } from '@strapi/helper-plugin';
import { axiosInstance, getTrad } from '../../../utils';
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

const CMEditViewCopyLocale = props => {
  if (!props.localizations.length) {
    return null;
  }

  return <Content {...props} />;
};

const Content = ({ appLocales, currentLocale, localizations, readPermissions }) => {
  const options = generateOptions(appLocales, currentLocale, localizations, readPermissions);

  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const { allLayoutData, slug } = useCMEditViewDataManager();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(options[0]?.value || '');

  const handleConfirmCopyLocale = async () => {
    if (!value) {
      handleToggle();

      return;
    }

    const requestURL = `/content-manager/collection-types/${slug}/${value}`;

    try {
      setIsLoading(true);

      const { data: response } = await axiosInstance.get(requestURL);

      const cleanedData = cleanData(response, allLayoutData, localizations);

      dispatch({ type: 'ContentManager/CrudReducer/GET_DATA_SUCCEEDED', data: cleanedData });

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

  const handleChange = value => {
    setValue(value);
  };

  const handleToggle = () => {
    setIsOpen(prev => !prev);
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
        <Row>
          <Duplicate width="12px" height="12px" />
          {formatMessage({
            id: getTrad('CMEditViewCopyLocale.copy-text'),
            defaultMessage: 'Fill in from another locale',
          })}
        </Row>
      </StyledTypography>
      {isOpen && (
        <Dialog onClose={handleToggle} title="Confirmation" isOpen={isOpen}>
          <DialogBody icon={<AlertWarningIcon />}>
            <Stack size={2}>
              <Row justifyContent="center">
                <Text id="confirm-description" style={{ textAlign: 'center' }}>
                  {formatMessage({
                    id: getTrad('CMEditViewCopyLocale.ModalConfirm.content'),
                    defaultMessage:
                      'Your current content will be erased and filled by the content of the selected locale:',
                  })}
                </Text>
              </Row>
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
            </Stack>
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

CMEditViewCopyLocale.propTypes = {
  localizations: PropTypes.array.isRequired,
};

Content.propTypes = {
  appLocales: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ).isRequired,
  currentLocale: PropTypes.string.isRequired,
  localizations: PropTypes.array.isRequired,
  readPermissions: PropTypes.array.isRequired,
};

export default CMEditViewCopyLocale;
