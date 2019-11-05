import React from 'react';
import PropTypes from 'prop-types';
import { get, size } from 'lodash';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import useEditView from '../../hooks/useEditView';
import ComponentInitializer from '../ComponentInitializer';
import AddFieldButton from './AddFieldButton';
import EmptyComponent from './EmptyComponent';
import Label from './Label';

import Reset from './ResetComponent';
import Wrapper from './Wrapper';
import NonRepeatableComponent from '../NonRepeatableComponent';

const FieldComponent = ({ componentUid, isRepeatable, label, name }) => {
  const {
    addRepeatableComponentToField,
    modifiedData,
    removeComponentFromField,
  } = useDataManager();
  const { allLayoutData } = useEditView();
  const componentValue = get(modifiedData, name, null);
  const componentValueLength = size(componentValue);
  const isInitialized = componentValue !== null;
  const showResetComponent = !isRepeatable && isInitialized;
  const currentComponentSchema = get(
    allLayoutData,
    ['components', componentUid],
    {}
  );
  const displayedFields = get(currentComponentSchema, ['layouts', 'edit'], []);
  console.log({ componentValue });

  return (
    <Wrapper className="col-12">
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
      {!isRepeatable && !isInitialized && <ComponentInitializer name={name} />}

      {!isRepeatable && isInitialized && (
        <NonRepeatableComponent
          fields={displayedFields}
          name={name}
          schema={currentComponentSchema}
        />
      )}
      {isRepeatable && (
        <div>
          {componentValueLength === 0 && (
            <EmptyComponent>
              <FormattedMessage id={`${pluginId}.components.empty-repeatable`}>
                {msg => <p>{msg}</p>}
              </FormattedMessage>
            </EmptyComponent>
          )}
          <AddFieldButton
            withBorderRadius={false}
            type="button"
            onClick={() => {
              // TODO min max validations
              // TODO add componentUID
              addRepeatableComponentToField(name);
            }}
          >
            <i className="fa fa-plus" />
            <FormattedMessage id={`${pluginId}.containers.EditView.add.new`} />
          </AddFieldButton>
        </div>
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
