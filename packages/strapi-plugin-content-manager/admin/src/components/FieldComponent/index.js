/* eslint-disable  import/no-cycle */
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { get, size } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import isEqual from 'react-fast-compare';
import pluginId from '../../pluginId';
import useEditView from '../../hooks/useEditView';
import ComponentInitializer from '../ComponentInitializer';
import NonRepeatableComponent from '../NonRepeatableComponent';
import NotAllowedInput from '../NotAllowedInput';
import RepeatableComponent from '../RepeatableComponent';
import connect from './utils/connect';
import select from './utils/select';
import ComponentIcon from './ComponentIcon';
import Label from './Label';
import Reset from './ResetComponent';
import Wrapper from './Wrapper';

const FieldComponent = ({
  componentFriendlyName,
  componentUid,
  icon,
  isCreatingEntry,
  isFromDynamicZone,
  isRepeatable,
  isNested,
  label,
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
  const { allLayoutData } = useEditView();

  const componentValueLength = size(componentValue);
  const isInitialized = componentValue !== null || isFromDynamicZone;
  const showResetComponent =
    !isRepeatable && isInitialized && !isFromDynamicZone && hasChildrenAllowedFields;
  const currentComponentSchema = get(allLayoutData, ['components', componentUid], {});

  const displayedFields = get(currentComponentSchema, ['layouts', 'edit'], []);

  if (!hasChildrenAllowedFields && isCreatingEntry) {
    return (
      <div className="col-12">
        <NotAllowedInput label={label} />
      </div>
    );
  }

  if (!hasChildrenAllowedFields && !isCreatingEntry && !hasChildrenReadableFields) {
    return (
      <div className="col-12">
        <NotAllowedInput label={label} />
      </div>
    );
  }

  return (
    <Wrapper className="col-12" isFromDynamicZone={isFromDynamicZone}>
      {isFromDynamicZone && (
        <ComponentIcon title={componentFriendlyName}>
          <div className="component_name">
            <div className="component_icon">
              <FontAwesomeIcon icon={icon} title={componentFriendlyName} />
            </div>
            <p>{componentFriendlyName}</p>
          </div>
        </ComponentIcon>
      )}
      <Label>
        {label}&nbsp;
        {isRepeatable && `(${componentValueLength})`}
      </Label>
      {showResetComponent && (
        <Reset
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            removeComponentFromField(name, componentUid);
          }}
        >
          <FormattedMessage id={`${pluginId}.components.reset-entry`} />
          <div />
        </Reset>
      )}
      {!isRepeatable && !isInitialized && (
        <ComponentInitializer componentUid={componentUid} name={name} isReadOnly={isReadOnly} />
      )}

      {!isRepeatable && isInitialized && (
        <NonRepeatableComponent
          componentUid={componentUid}
          fields={displayedFields}
          isFromDynamicZone={isFromDynamicZone}
          name={name}
          schema={currentComponentSchema}
        />
      )}
      {isRepeatable && (
        <RepeatableComponent
          componentValue={componentValue}
          componentValueLength={componentValueLength}
          componentUid={componentUid}
          fields={displayedFields}
          isFromDynamicZone={isFromDynamicZone}
          isNested={isNested}
          isReadOnly={isReadOnly}
          max={max}
          min={min}
          name={name}
          schema={currentComponentSchema}
        />
      )}
    </Wrapper>
  );
};

FieldComponent.defaultProps = {
  componentValue: null,
  componentFriendlyName: null,
  hasChildrenAllowedFields: false,
  hasChildrenReadableFields: false,
  icon: 'smile',
  isFromDynamicZone: false,
  isReadOnly: false,
  isRepeatable: false,
  isNested: false,
  max: Infinity,
  min: -Infinity,
};

FieldComponent.propTypes = {
  componentFriendlyName: PropTypes.string,
  componentUid: PropTypes.string.isRequired,
  componentValue: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  hasChildrenAllowedFields: PropTypes.bool,
  hasChildrenReadableFields: PropTypes.bool,
  icon: PropTypes.string,
  isCreatingEntry: PropTypes.bool.isRequired,
  isFromDynamicZone: PropTypes.bool,
  isReadOnly: PropTypes.bool,
  isRepeatable: PropTypes.bool,
  isNested: PropTypes.bool,
  label: PropTypes.string.isRequired,
  max: PropTypes.number,
  min: PropTypes.number,
  name: PropTypes.string.isRequired,
  removeComponentFromField: PropTypes.func.isRequired,
};

const Memoized = memo(FieldComponent, isEqual);

export default connect(Memoized, select);
