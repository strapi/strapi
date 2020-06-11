import React from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';

import ContentTypeRow from './ContentTypesRow';
import Wrapper from './Wrapper';
import PermissionsHeader from './PermissionsHeader';

const ContentTypesPermissions = ({ contentTypes }) => (
  <Wrapper>
    <Padded left right bottom size="md">
      <PermissionsHeader />
      {contentTypes &&
        contentTypes.map((contentType, index) => (
          <ContentTypeRow key={contentType.uid} index={index} contentType={contentType} />
        ))}
    </Padded>
  </Wrapper>
);

ContentTypesPermissions.propTypes = {
  contentTypes: PropTypes.array.isRequired,
};

export default ContentTypesPermissions;
