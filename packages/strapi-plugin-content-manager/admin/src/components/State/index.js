import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Text } from '@buffetjs/core';
import { getTrad } from '../../utils';
import Wrapper from './Wrapper';

const State = ({ isPublished }) => {
  const { formatMessage } = useIntl();

  return (
    <Wrapper isGreen={isPublished}>
      <Text>
        {formatMessage({
          id: getTrad(`containers.List.${isPublished ? 'published' : 'draft'}`),
        })}
      </Text>
    </Wrapper>
  );
};

State.propTypes = {
  isPublished: PropTypes.bool.isRequired,
};

export default State;
