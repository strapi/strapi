import React from 'react';
import { FormattedMessage } from 'react-intl';
import CreatableSelect from 'react-select/creatable';
import PropTypes from 'prop-types';
import { InputText, Button } from '@buffetjs/core';

import Wrapper from './Wrapper';

import keys from './keys';

const HeadersInput = ({ onClick, onChange, name, value }) => {
  const handleChange = (selected, name) => {
    if (selected === null) {
      onChange({ target: { name, value: '' } });
    } else {
      const { value } = selected;
      onChange({ target: { name, value } });
    }
  };

  const optionFormat = value => {
    return { value: value, label: value };
  };

  const options = keys.map(key => {
    return optionFormat(key);
  });

  const handleClick = () => {
    onClick(name);
  };

  return (
    <Wrapper>
      <ul>
        <li>
          <section>
            <p>
              <FormattedMessage id="Settings.webhooks.key" />
            </p>
          </section>
          <section>
            <p>
              <FormattedMessage id="Settings.webhooks.value" />
            </p>
          </section>
        </li>
        {value.map((header, index) => {
          const { key, value } = header;

          return (
            <li key={index}>
              <section>
                <CreatableSelect
                  isClearable
                  onChange={e => handleChange(e, `${name}.${index}.key`)}
                  options={options}
                  name={`${name}.${index}.key`}
                  value={optionFormat(key)}
                />
              </section>
              <section>
                <InputText value={value} name={`${name}.${index}.value`} />
              </section>
            </li>
          );
        })}
      </ul>
      <Button onClick={handleClick} color="secondary" icon>
        <FormattedMessage id="Settings.webhooks.create.header" />
      </Button>
    </Wrapper>
  );
};

HeadersInput.defaultProps = {
  handleClick: () => {},
  onClick: () => {},
};

HeadersInput.propTypes = {
  handleClick: PropTypes.func,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  value: PropTypes.array,
};

export default HeadersInput;
