import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';
import GlobalActions from '../GlobalActions';
import Wrapper from './Wrapper';

const ContentTypes = ({ layout: { actions, subjects } }) => {
  console.log({ subjects });

  return (
    <Wrapper>
      <Padded left right bottom size="md">
        <GlobalActions actions={actions} />
      </Padded>
    </Wrapper>
  );
};

ContentTypes.propTypes = {
  layout: PropTypes.shape({
    actions: PropTypes.array,
    subjects: PropTypes.object,
  }).isRequired,
};

export default memo(ContentTypes);
