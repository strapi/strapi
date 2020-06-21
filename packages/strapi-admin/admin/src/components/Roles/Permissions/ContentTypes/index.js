import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';
import ContentTypeRow from 'ee_else_ce/components/Roles/Permissions/ContentTypes/ContentTypesRow';

import Wrapper from './Wrapper';
import PermissionsHeader from './PermissionsHeader';
import { usePermissionsContext } from '../../../../hooks';
import { getAllAttributes } from '../utils';

const ContentTypesPermissions = ({ contentTypes }) => {
  const { permissionsLayout, components, onSetAttributesPermissions } = usePermissionsContext();

  useEffect(() => {
    if (contentTypes.length > 0) {
      const requiredAttributes = getAllAttributes(contentTypes, components).filter(
        attribute => attribute.required
      );

      onSetAttributesPermissions({
        attributes: requiredAttributes,
        shouldEnable: true,
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentTypes, components]);

  return (
    <Wrapper>
      <Padded left right bottom size="md">
        <PermissionsHeader contentTypes={contentTypes} />
        {contentTypes &&
          contentTypes.map((contentType, index) => (
            <ContentTypeRow
              contentTypesPermissionsLayout={permissionsLayout.sections.contentTypes}
              key={contentType.uid}
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
