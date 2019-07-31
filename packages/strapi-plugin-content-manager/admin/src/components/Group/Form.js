/* eslint-disable react-hooks/exhaustive-deps */
import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import Inputs from '../Inputs';
import SelectWrapper from '../SelectWrapper';

const Form = ({ keys, layout, modifiedData, fieldName, onChange }) => {
  const currentField = useMemo(() => {
    // We are not providing any deps to the hook in purpose
    // We don't need any recalculation there since these values are not changed in the component's lifecycle
    return get(layout, ['schema', 'attributes', fieldName], '');
  }, []);
  const currentFieldMeta = useMemo(() => {
    return get(layout, ['metadatas', fieldName, 'edit'], {});
  }, []);

  if (currentField.type === 'relation') {
    return (
      <div className="col-6" key={keys}>
        <SelectWrapper
          {...currentFieldMeta}
          name={keys}
          relationType={currentField.relationType}
          targetModel={currentField.targetModel}
          value={get(modifiedData, keys)}
        />
      </div>
    );
  }

  return (
    <Inputs
      key={keys}
      layout={layout}
      modifiedData={modifiedData}
      keys={keys}
      name={fieldName}
      onChange={({ target: { value } }) => {
        onChange({
          target: { name: keys, value },
        });
      }}
    />
  );
};

Form.propTypes = {
  fieldName: PropTypes.string.isRequired,
  keys: PropTypes.string.isRequired,
  layout: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default memo(Form);
