import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { CircleButton } from 'strapi-helper-plugin';
import { InputText } from '@buffetjs/core';
import { Plus } from '@buffetjs/icons';
import Wrapper from './Wrapper';

/* eslint-disable react/no-array-index-key */

const BodyInput = ({ errors, name, onClick, onChange, onRemove, value }) => {
  return (
    <Wrapper>
      <ul>
        <li>
          <section>
            <p>
              <FormattedMessage id="Settings.webhooks.key" defaultMessage="Key" />
            </p>
          </section>
          <section>
            <p>
              <FormattedMessage id="Settings.webhooks.value" defaultMessage="Value" />
            </p>
          </section>
        </li>
        {value.map((body, index) => {
          const { key, value } = body;

          return (
            <li key={index}>
              <section>
                <InputText
                  className={get(errors, `body.${index}.key`, null) && 'bordered'}
                  onChange={onChange}
                  name={`${name}.${index}.key`}
                  value={key}
                />
              </section>
              <section>
                <InputText
                  className={get(errors, `body.${index}.value`, null) && 'bordered'}
                  onChange={onChange}
                  name={`${name}.${index}.value`}
                  value={value}
                />
              </section>
              <div>
                <CircleButton type="button" isRemoveButton onClick={() => onRemove(index)} />
              </div>
            </li>
          );
        })}
      </ul>
      <button onClick={() => onClick(name)} type="button">
        <Plus fill="#007eff" width="10px" />
        <FormattedMessage
          id="Settings.webhooks.create.body"
          defaultMessage="Create a new body parameter"
        />
      </button>
    </Wrapper>
  );
};

BodyInput.defaultProps = {
  errors: {},
  onRemove: () => {},
};

BodyInput.propTypes = {
  errors: PropTypes.object,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
  value: PropTypes.array.isRequired,
};

export default BodyInput;
