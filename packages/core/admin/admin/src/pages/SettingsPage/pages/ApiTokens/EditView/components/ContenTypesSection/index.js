import React, { useState } from 'react';

import { Box } from '@strapi/design-system';
import PropTypes from 'prop-types';

import CollapsableContentType from '../CollapsableContentType';

const ContentTypesSection = ({ section, ...props }) => {
  const [indexExpandedCollpsedContent, setIndexExpandedCollpsedContent] = useState(null);
  const handleExpandedCollpsedContentIndex = (index) => setIndexExpandedCollpsedContent(index);

  return (
    <Box padding={4} background="neutral0">
      {section &&
        section.map((api, index) => (
          <CollapsableContentType
            key={api.apiId}
            label={api.label}
            controllers={api.controllers}
            orderNumber={index}
            indexExpandendCollapsedContent={indexExpandedCollpsedContent}
            onExpanded={handleExpandedCollpsedContentIndex}
            name={api.apiId}
            {...props}
          />
        ))}
    </Box>
  );
};

ContentTypesSection.defaultProps = {
  section: null,
};

ContentTypesSection.propTypes = {
  section: PropTypes.arrayOf(PropTypes.object),
};

export default ContentTypesSection;
