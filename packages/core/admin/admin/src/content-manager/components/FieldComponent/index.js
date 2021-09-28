/* eslint-disable  import/no-cycle */
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import size from 'lodash/size';
import isEqual from 'react-fast-compare';
import { useIntl } from 'react-intl';
import { NotAllowedInput } from '@strapi/helper-plugin';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import { Box } from '@strapi/parts/Box';
import { IconButton } from '@strapi/parts/IconButton';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { getTrad } from '../../utils';
import ComponentInitializer from '../ComponentInitializer';
import NonRepeatableComponent from '../NonRepeatableComponent';
import RepeatableComponent from '../RepeatableComponent';
import connect from './utils/connect';
import select from './utils/select';
import Label from './Label';

const FieldComponent = ({
  addNonRepeatableComponentToField,
  componentUid,
  // TODO add error state
  // formErrors,
  intlLabel,
  isCreatingEntry,
  isFromDynamicZone,
  isRepeatable,
  isNested,
  labelAction,
  max,
  min,
  name,
  // Passed thanks to the connect function
  hasChildrenAllowedFields,
  hasChildrenReadableFields,
  isReadOnly,
  componentValue,
  removeComponentFromField,
}) => {
  const { formatMessage } = useIntl();
  const componentValueLength = size(componentValue);
  const isInitialized = componentValue !== null || isFromDynamicZone;
  const showResetComponent =
    !isRepeatable && isInitialized && !isFromDynamicZone && hasChildrenAllowedFields;

  if (!hasChildrenAllowedFields && isCreatingEntry) {
    return <NotAllowedInput labelAction={labelAction} intlLabel={intlLabel} name={name} />;
  }

  if (!hasChildrenAllowedFields && !isCreatingEntry && !hasChildrenReadableFields) {
    return <NotAllowedInput labelAction={labelAction} intlLabel={intlLabel} name={name} />;
  }

  const handleClickAddNonRepeatableComponentToField = () => {
    addNonRepeatableComponentToField(name, componentUid);
  };

  return (
    <Box>
      <Row justifyContent="space-between">
        {intlLabel && (
          <Label
            intlLabel={intlLabel}
            labelAction={labelAction}
            name={name}
            numberOfEntries={componentValueLength}
            showNumberOfEntries={isRepeatable}
          />
        )}

        {showResetComponent && (
          <IconButton
            label={formatMessage({
              id: getTrad('components.reset-entry'),
              defaultMessage: 'Reset Entry',
            })}
            icon={<DeleteIcon />}
            noBorder
            onClick={() => {
              removeComponentFromField(name, componentUid);
            }}
          />
        )}
      </Row>
      <Stack size={1}>
        {!isRepeatable && !isInitialized && (
          <ComponentInitializer
            isReadOnly={isReadOnly}
            onClick={handleClickAddNonRepeatableComponentToField}
          />
        )}
        {!isRepeatable && isInitialized && (
          <NonRepeatableComponent
            componentUid={componentUid}
            isFromDynamicZone={isFromDynamicZone}
            isNested={isNested}
            name={name}
          />
        )}
        {isRepeatable && (
          <RepeatableComponent
            componentValue={componentValue}
            componentValueLength={componentValueLength}
            componentUid={componentUid}
            isNested={isNested}
            isReadOnly={isReadOnly}
            max={max}
            min={min}
            name={name}
          />
        )}
      </Stack>
    </Box>
  );
};

FieldComponent.defaultProps = {
  componentValue: null,
  hasChildrenAllowedFields: false,
  hasChildrenReadableFields: false,
  intlLabel: undefined,
  isFromDynamicZone: false,
  isReadOnly: false,
  isRepeatable: false,
  isNested: false,
  labelAction: undefined,
  max: Infinity,
  min: -Infinity,
};

FieldComponent.propTypes = {
  addNonRepeatableComponentToField: PropTypes.func.isRequired,
  componentUid: PropTypes.string.isRequired,
  componentValue: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  hasChildrenAllowedFields: PropTypes.bool,
  hasChildrenReadableFields: PropTypes.bool,
  isCreatingEntry: PropTypes.bool.isRequired,
  isFromDynamicZone: PropTypes.bool,
  isReadOnly: PropTypes.bool,
  isRepeatable: PropTypes.bool,
  isNested: PropTypes.bool,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  labelAction: PropTypes.element,
  max: PropTypes.number,
  min: PropTypes.number,
  name: PropTypes.string.isRequired,
  removeComponentFromField: PropTypes.func.isRequired,
};

const Memoized = memo(FieldComponent, isEqual);

export default connect(Memoized, select);
