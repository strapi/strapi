import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import pluginId from '../../../pluginId';
import OptionsWrapper from './wrapper';
import Option from './Option';
import OptionsTitle from './OptionsTitle';
import RightOptionLabel from './RightOptionLabel';

const Options = ({ options, title }) => {
  const [displayRightOptionLabel, setDisplayRightOptionLabel] = useState(false);
  const handleOptionMouseEnter = () => {
    setDisplayRightOptionLabel(true);
  };
  const handleOptionMouseLeave = () => {
    setDisplayRightOptionLabel(false);
  };

  return (
    <OptionsWrapper>
      {title && <OptionsTitle>{title}</OptionsTitle>}
      {options.map(option => (
        <Option
          onMouseEnter={handleOptionMouseEnter}
          onMouseLeave={handleOptionMouseLeave}
          key={option.id}
          onClick={option.onClick}
        >
          <div>{option.label}</div>
          {displayRightOptionLabel && (
            <FormattedMessage id={`${pluginId}.components.uid.apply`}>
              {msg => <RightOptionLabel>{msg}</RightOptionLabel>}
            </FormattedMessage>
          )}
        </Option>
      ))}
    </OptionsWrapper>
  );
};

Options.propTypes = {
  options: PropTypes.array.isRequired,
  title: PropTypes.string,
};

Options.defaultProps = {
  title: null,
};

export default Options;
