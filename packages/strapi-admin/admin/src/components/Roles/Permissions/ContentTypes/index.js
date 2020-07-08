import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';
import ContentTypeRow from 'ee_else_ce/components/Roles/Permissions/ContentTypes/ContentTypesRow';
import PermissionsHeader from 'ee_else_ce/components/Roles/Permissions/ContentTypes/PermissionsHeader';

import Wrapper from './Wrapper';
import { usePermissionsContext } from '../../../../hooks';

const ContentTypesPermissions = ({ contentTypes, allContentTypesAttributes }) => {
  const { permissionsLayout, onSetAttributesPermissions } = usePermissionsContext();
  const onSetAttributesPermissionsRef = useRef(onSetAttributesPermissions);

  useEffect(() => {
    if (allContentTypesAttributes.length > 0) {
      const requiredAttributes = allContentTypesAttributes.filter(attribute => attribute.required);

      onSetAttributesPermissionsRef.current({
        attributes: requiredAttributes,
        shouldEnable: true,
        contentTypeAction: false,
      });
    }
  }, [allContentTypesAttributes]);

  return (
    <Wrapper>
      <Padded left right bottom size="md">
        <PermissionsHeader allAttributes={allContentTypesAttributes} contentTypes={contentTypes} />
        {contentTypes &&
          contentTypes.map((contentType, index) => (
            <ContentTypeRow
              permissionsLayout={permissionsLayout.sections.contentTypes}
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
  allContentTypesAttributes: PropTypes.array.isRequired,
};

export default ContentTypesPermissions;
