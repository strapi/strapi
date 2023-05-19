/* eslint-disable  import/no-cycle */
import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import size from 'lodash/size';
import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';

import { NotAllowedInput } from '@strapi/helper-plugin';
import { Trash } from '@strapi/icons';
import { Box, IconButton, Flex } from '@strapi/design-system';

import connect from './utils/connect';
import select from './utils/select';
import Label from './Label';
import ComponentInitializer from '../ComponentInitializer';
import NonRepeatableComponent from '../NonRepeatableComponent';
import RepeatableComponent from '../RepeatableComponent';
import { useContentTypeLayout } from '../../hooks';
import { getTrad } from '../../utils';

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
  required,
}) => {
  const { formatMessage } = useIntl();
  const componentValueLength = size(componentValue);
  const isInitialized = componentValue !== null || isFromDynamicZone;
  const showResetComponent =
    !isRepeatable && isInitialized && !isFromDynamicZone && hasChildrenAllowedFields;

  const { getComponentLayout, components } = useContentTypeLayout();
  const componentLayoutData = useMemo(
    () => getComponentLayout(componentUid),
    [componentUid, getComponentLayout]
  );

  if (!hasChildrenAllowedFields && isCreatingEntry) {
    return <NotAllowedInput labelAction={labelAction} intlLabel={intlLabel} name={name} />;
  }

  if (!hasChildrenAllowedFields && !isCreatingEntry && !hasChildrenReadableFields) {
    return <NotAllowedInput labelAction={labelAction} intlLabel={intlLabel} name={name} />;
  }

  const handleClickAddNonRepeatableComponentToField = () => {
    addNonRepeatableComponentToField(name, componentLayoutData, components);
  };

  return (
    <Box>
      <Flex justifyContent="space-between">
        {intlLabel && (
          <Label
            intlLabel={intlLabel}
            labelAction={labelAction}
            name={name}
            numberOfEntries={componentValueLength}
            showNumberOfEntries={isRepeatable}
            required={required}
          />
        )}

        {showResetComponent && (
          <IconButton
            label={formatMessage({
              id: getTrad('components.reset-entry'),
              defaultMessage: 'Reset Entry',
            })}
            icon={<Trash />}
            noBorder
            onClick={() => {
              removeComponentFromField(name, componentUid);
            }}
          />
        )}
      </Flex>
      <Flex direction="column" alignItems="stretch" gap={1}>
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
            isReadOnly={isReadOnly}
            max={max}
            min={min}
            name={name}
          />
        )}
      </Flex>
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
  required: false,
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
  required: PropTypes.bool,
};

const Memoized = memo(FieldComponent, isEqual);

export default connect(Memoized, select);
