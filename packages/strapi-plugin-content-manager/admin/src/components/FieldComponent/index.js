import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import useEditView from '../../hooks/useEditView';
import ComponentInitializer from '../ComponentInitializer';
import Label from './Label';
import Reset from './ResetComponent';
import Wrapper from './Wrapper';
import NonRepeatableComponent from './NonRepeatableComponent';

const FieldComponent = ({ componentUid, isRepeatable, label, name }) => {
  const { modifiedData, removeComponentFromField } = useDataManager();
  const { allLayoutData } = useEditView();
  const isInitialized = get(modifiedData, name, null) !== null;
  const showResetComponent = !isRepeatable && isInitialized;
  const currentComponentSchema = get(
    allLayoutData,
    ['components', componentUid],
    {}
  );
  const displayedFields = get(currentComponentSchema, ['layouts', 'edit'], []);
  const schema = get(currentComponentSchema, 'schema', {});

  return (
    <Wrapper className="col-12">
      <Label>
        {label}
        {isRepeatable && `(0) TODO`}
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
      {!isRepeatable && !isInitialized && <ComponentInitializer name={name} />}

      {!isRepeatable && isInitialized && (
        <NonRepeatableComponent
          fields={displayedFields}
          name={name}
          schema={schema}
        />
      )}
    </Wrapper>
  );
};

FieldComponent.defaultProps = {
  isRepeatable: false,
};

FieldComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  isRepeatable: PropTypes.bool,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default FieldComponent;
