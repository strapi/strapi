import React from 'react';
import PropTypes from 'prop-types';
import { IconButton, FocusTrap, SimpleMenu, MenuItem, Flex } from '@strapi/design-system';
import { Cross, Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import getTrad from '../../../utils/getTrad';
import { CroppingActionRow } from './components';

export const CroppingActions = ({ onCancel, onValidate, onDuplicate }) => {
  const { formatMessage } = useIntl();

  return (
    <FocusTrap onEscape={onCancel}>
      <CroppingActionRow justifyContent="flex-end" paddingLeft={3} paddingRight={3}>
        <Flex gap={1}>
          <IconButton
            label={formatMessage({
              id: getTrad('control-card.stop-crop'),
              defaultMessage: 'Stop cropping',
            })}
            icon={<Cross />}
            onClick={onCancel}
          />

          <SimpleMenu
            label={formatMessage({
              id: getTrad('control-card.crop'),
              defaultMessage: 'Crop',
            })}
            as={IconButton}
            icon={<Check />}
          >
            <MenuItem onClick={onValidate}>
              {formatMessage({
                id: getTrad('checkControl.crop-original'),
                defaultMessage: 'Crop the original asset',
              })}
            </MenuItem>

            {onDuplicate && (
              <MenuItem onClick={onDuplicate}>
                {formatMessage({
                  id: getTrad('checkControl.crop-duplicate'),
                  defaultMessage: 'Duplicate & crop the asset',
                })}
              </MenuItem>
            )}
          </SimpleMenu>
        </Flex>
      </CroppingActionRow>
    </FocusTrap>
  );
};

CroppingActions.defaultProps = {
  onDuplicate: undefined,
};

CroppingActions.propTypes = {
  onCancel: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func,
  onValidate: PropTypes.func.isRequired,
};
