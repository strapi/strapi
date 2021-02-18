import React from 'react';
import PropTypes from 'prop-types';
import { PageFooter } from 'strapi-helper-plugin';
import { Padded } from '@buffetjs/core';
import Wrapper from './Wrapper';

const Footer = ({ count, onChange, params }) => {
  return (
    <Wrapper>
      <Padded left right size="xs">
        <PageFooter
          context={{ emitEvent: () => {} }}
          count={count}
          onChangeParams={onChange}
          params={params}
        />
      </Padded>
    </Wrapper>
  );
};

Footer.defaultProps = {
  count: 0,
  onChange: () => {},
  params: {
    _limit: 10,
    _page: 1,
  },
};

Footer.propTypes = {
  count: PropTypes.number,
  onChange: PropTypes.func,
  params: PropTypes.shape({
    _limit: PropTypes.number,
    _page: PropTypes.number,
  }),
};

export default Footer;
