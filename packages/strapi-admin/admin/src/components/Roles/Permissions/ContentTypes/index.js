import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';

import ContentTypeRow from './ContentTypesRow';
import Wrapper from './Wrapper';
import PermissionsHeader from './PermissionsHeader';

import reducer, { initialState } from './reducer';

const ContentTypesPermissions = ({ contentTypes }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const openContentTypeAttributes = contentTypeToOpen => {
    dispatch({
      type: 'OPEN_CONTENT_TYPE_ATTRIBUTES',
      contentTypeToOpen,
    });
  };

  return (
    <Wrapper>
      <Padded left right bottom size="md">
        <PermissionsHeader />
        {contentTypes &&
          contentTypes.map((contentType, index) => (
            <ContentTypeRow
              key={contentType.uid}
              openedContentTypeAttributes={state.collapseContentTypeAttribute}
              openContentTypeAttributes={openContentTypeAttributes}
              index={index}
              contentType={contentType}
            />
          ))}
      </Padded>
    </Wrapper>
  );
};

ContentTypesPermissions.propTypes = {
  contentTypes: PropTypes.array.isRequired,
};

export default ContentTypesPermissions;
