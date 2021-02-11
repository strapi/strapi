import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';
import ContentTypeCollapses from '../ContentTypeCollapses';
import GlobalActions from '../GlobalActions';
import Wrapper from './Wrapper';

const ContentTypes = ({ kind, layout: { actions, subjects } }) => {
  return (
    <Wrapper>
      <Padded left right bottom size="md">
        <GlobalActions actions={actions} />
        <ContentTypeCollapses pathToData={kind} subjects={subjects} actions={actions} />
      </Padded>
    </Wrapper>
  );
};

ContentTypes.propTypes = {
  kind: PropTypes.string.isRequired,
  layout: PropTypes.shape({
    actions: PropTypes.array,
    subjects: PropTypes.object,
  }).isRequired,
};

export default memo(ContentTypes);
