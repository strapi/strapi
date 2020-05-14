import React from 'react';
import { Padded, Text } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import Section from '../Section';
import Link from './Link';
import Wrapper from './Wrapper';

const AuthLink = ({ label, to }) => {
  const { formatMessage } = useIntl();
  const message = formatMessage({ id: label });

  return (
    <Section textAlign="center">
      <Wrapper>
        <Padded top size="24px">
          <Link to={to}>
            <Text fontSize="md">{message}</Text>
          </Link>
        </Padded>
      </Wrapper>
    </Section>
  );
};

AuthLink.propTypes = {
  label: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
};

export default AuthLink;
