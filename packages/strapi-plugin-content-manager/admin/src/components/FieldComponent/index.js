/* eslint-disable  import/no-cycle */
import React from 'react';
import PropTypes from 'prop-types';
import { get, size } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import useEditView from '../../hooks/useEditView';
import ComponentInitializer from '../ComponentInitializer';
import NonRepeatableComponent from '../NonRepeatableComponent';
import RepeatableComponent from '../RepeatableComponent';
import ComponentIcon from './ComponentIcon';
import Label from './Label';
import Reset from './ResetComponent';
import Wrapper from './Wrapper';

const FieldComponent = ({
  componentFriendlyName,
  componentUid,
  icon,
  isFromDynamicZone,
  isRepeatable,
  isNested,
  label,
  max,
  min,
  name,
}) => {
  const { modifiedData, removeComponentFromField } = useDataManager();
  const { allLayoutData } = useEditView();
  const componentValue = get(modifiedData, name, null);
  const componentValueLength = size(componentValue);
  const isInitialized = componentValue !== null || isFromDynamicZone;
  const showResetComponent =
    !isRepeatable && isInitialized && !isFromDynamicZone;
  const currentComponentSchema = get(
    allLayoutData,
    ['components', componentUid],
    {}
  );

  const displayedFields = get(currentComponentSchema, ['layouts', 'edit'], []);

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
        <ComponentInitializer componentUid={componentUid} name={name} />
      )}

      {!isRepeatable && isInitialized && (
        <NonRepeatableComponent
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
  componentFriendlyName: null,
  icon: 'smile',
  isFromDynamicZone: false,
  isRepeatable: false,
  isNested: false,
  max: Infinity,
  min: -Infinity,
};

FieldComponent.propTypes = {
  componentFriendlyName: PropTypes.string,
  componentUid: PropTypes.string.isRequired,
  icon: PropTypes.string,
  isFromDynamicZone: PropTypes.bool,
  isRepeatable: PropTypes.bool,
  isNested: PropTypes.bool,
  label: PropTypes.string.isRequired,
  max: PropTypes.number,
  min: PropTypes.number,
  name: PropTypes.string.isRequired,
};

export default FieldComponent;
