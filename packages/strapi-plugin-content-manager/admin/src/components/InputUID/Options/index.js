import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import getTrad from '../../../utils/getTrad';
import OptionsWrapper from './wrapper';
import Option from './Option';
import OptionsTitle from './OptionsTitle';
import RightOptionLabel from './RightOptionLabel';

const Options = ({ options, title }) => (
  <OptionsWrapper>
    {title && <OptionsTitle>{title}</OptionsTitle>}
    {options.map(option => (
      <Option key={option.id} onClick={option.onClick}>
        <div>{option.label}</div>
        <FormattedMessage id={getTrad('components.uid.apply')}>
          {msg => <RightOptionLabel className="right-label">{msg}</RightOptionLabel>}
        </FormattedMessage>
      </Option>
    ))}
  </OptionsWrapper>
);

Options.propTypes = {
  options: PropTypes.array.isRequired,
  title: PropTypes.string,
};

Options.defaultProps = {
  title: null,
};

export default Options;
