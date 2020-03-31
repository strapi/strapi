import React from 'react';
import { Inputs } from '@buffetjs/custom';
import { useGlobalContext } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import Wrapper from './Wrapper';
import { getTrad } from '../../utils';

const InputUploadURL = ({ onChange, value }) => {
  const { formatMessage } = useGlobalContext();
  const label = formatMessage({ id: getTrad('input.url.label') });
  const description = formatMessage({ id: getTrad('input.url.description') });

  return (
    <Wrapper>
      <div className="row">
        <div className="col-12">
          <Inputs
            type="textarea"
            name="url"
            onChange={onChange}
            label={label}
            description={description}
            value={value.join('\n')}
          />
        </div>
      </div>
    </Wrapper>
  );
};

InputUploadURL.defaultProps = {
  onChange: () => {},
  value: [],
};

InputUploadURL.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.arrayOf(PropTypes.string),
};

export default InputUploadURL;
