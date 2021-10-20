import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';
import ContentTypeCollapses from '../ContentTypeCollapses';
import GlobalActions from '../GlobalActions';
import Wrapper from './Wrapper';

const ContentTypes = ({ isFormDisabled, kind, layout: { actions, subjects } }) => {
  return (
    <Wrapper>
      <Padded left right bottom size="md">
        <GlobalActions actions={actions} kind={kind} isFormDisabled={isFormDisabled} />
        <ContentTypeCollapses
          actions={actions}
          isFormDisabled={isFormDisabled}
          pathToData={kind}
          subjects={subjects}
        />
      </Padded>
    </Wrapper>
  );
};

ContentTypes.propTypes = {
  isFormDisabled: PropTypes.bool.isRequired,
  kind: PropTypes.string.isRequired,
  layout: PropTypes.shape({
    actions: PropTypes.array,
    subjects: PropTypes.arrayOf(
      PropTypes.shape({
        uid: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        properties: PropTypes.array.isRequired,
      })
    ),
  }).isRequired,
};

export default memo(ContentTypes);
