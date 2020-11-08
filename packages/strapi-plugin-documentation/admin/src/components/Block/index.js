/**
 *
 * Block
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Wrapper, Title } from './components';

const renderMsg = msg => <p>{msg}</p>;

const Block = ({ children, description, style, title }) => (
  <div className="col-md-12">
    <Wrapper style={style}>
      <Title>
        <FormattedMessage id={title} />
        <FormattedMessage id={description}>{renderMsg}</FormattedMessage>
      </Title>
      {children}
    </Wrapper>
  </div>
);

Block.defaultProps = {
  children: null,
  description: 'app.utils.defaultMessage',
  style: {},
  title: 'app.utils.defaultMessage',
};

Block.propTypes = {
  children: PropTypes.any,
  description: PropTypes.string,
  style: PropTypes.object,
  title: PropTypes.string,
};

export default Block;
