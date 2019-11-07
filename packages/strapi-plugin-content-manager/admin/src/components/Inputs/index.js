import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty, omit, toLower } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { InputFileWithErrors } from 'strapi-helper-plugin';
import { Inputs as InputsIndex } from '@buffetjs/custom';

import useDataManager from '../../hooks/useDataManager';
import InputJSONWithErrors from '../InputJSONWithErrors';
import SelectWrapper from '../SelectWrapper';
import WysiwygWithErrors from '../WysiwygWithErrors';

const getInputType = (type = '') => {
  switch (toLower(type)) {
    case 'boolean':
      return 'bool';
    case 'biginteger':
    case 'decimal':
    case 'float':
    case 'integer':
      return 'number';
    case 'date':
    case 'datetime':
    case 'time':
      return type;
    case 'email':
      return 'email';
    case 'enumeration':
      return 'select';
    case 'password':
      return 'password';
    case 'string':
      return 'text';
    case 'text':
      return 'textarea';
    case 'media':
    case 'file':
    case 'files':
      return 'media';
    case 'json':
      return 'json';
    case 'wysiwyg':
    case 'WYSIWYG':
    case 'richtext':
      return 'wysiwyg';
    default:
      return 'text';
  }
};

function Inputs({ autoFocus, keys, layout, name, onBlur }) {
  const {
    didCheckErrors,
    formErrors,
    modifiedData,
    onChange,
  } = useDataManager();

  const attribute = useMemo(
    () => get(layout, ['schema', 'attributes', name], {}),
    [layout, name]
  );
  const metadatas = useMemo(
    () => get(layout, ['metadatas', name, 'edit'], {}),
    [layout, name]
  );
  const disabled = useMemo(() => !get(metadatas, 'editable', true), [
    metadatas,
  ]);
  const type = useMemo(() => get(attribute, 'type', null), [attribute]);

  // const inputStyle = type === 'text' ? { height: '196px' } : {};
  const validations = omit(attribute, [
    'type',
    'model',
    'via',
    'collection',
    'default',
    'plugin',
    'enum',
  ]);
  const { description, visible } = metadatas;
  const value = get(modifiedData, keys, null);

  if (visible === false) {
    return null;
  }
  const temporaryErrorIdUntilBuffetjsSupportsFormattedMessage =
    'app.utils.defaultMessage';
  const errorId = get(
    formErrors,
    [keys, 'id'],
    temporaryErrorIdUntilBuffetjsSupportsFormattedMessage
  );

  // TODO add the option placeholder to buffetjs
  // check https://github.com/strapi/strapi/issues/2471
  // const withOptionPlaceholder = get(attribute, 'type', '') === 'enumeration';

  // TODO format error for the JSON, the WYSIWYG and also the file inputs
  // TODO check if the height for the textarea is 196px (not mandatory)

  if (type === 'relation') {
    return (
      <div className="col-6" key={keys}>
        <SelectWrapper
          {...metadatas}
          name={keys}
          plugin={attribute.plugin}
          relationType={attribute.relationType}
          targetModel={attribute.targetModel}
          value={get(modifiedData, keys)}
        />
      </div>
    );
  }

  let inputValue = value;

  // Fix for input file multipe
  if (type === 'media' && !value) {
    inputValue = [];
  }

  return (
    <FormattedMessage id={errorId}>
      {error => {
        return (
          <InputsIndex
            {...metadatas}
            autoFocus={autoFocus}
            didCheckErrors={didCheckErrors}
            disabled={disabled}
            error={
              isEmpty(error) ||
              errorId === temporaryErrorIdUntilBuffetjsSupportsFormattedMessage
                ? null
                : error
            }
            inputDescription={description}
            description={description}
            // inputStyle={inputStyle} used to set the height of the text area
            customInputs={{
              media: InputFileWithErrors,
              json: InputJSONWithErrors,
              wysiwyg: WysiwygWithErrors,
            }}
            multiple={get(attribute, 'multiple', false)}
            // name={name}
            name={keys}
            onBlur={onBlur}
            onChange={onChange}
            options={get(attribute, 'enum', [])}
            type={getInputType(type)}
            validations={validations}
            value={inputValue}
            withDefaultValue={false}
            // withOptionPlaceholder={withOptionPlaceholder}
          />
        );
      }}
    </FormattedMessage>
  );
}

Inputs.defaultProps = {
  autoFocus: false,
  onBlur: null,
};

Inputs.propTypes = {
  autoFocus: PropTypes.bool,
  keys: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func.isRequired,
};

export default memo(Inputs);
