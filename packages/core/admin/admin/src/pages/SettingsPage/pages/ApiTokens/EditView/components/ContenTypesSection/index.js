import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import CollapsableContentType from '../CollapsableContentType';

const ContentTypesSection = ({ section, name, ...props }) => {
  const [indexExpandedCollpsedContent, setIndexExpandedCollpsedContent] = useState(null);
  const handleExpandedCollpsedContentIndex = index => setIndexExpandedCollpsedContent(index);
  
return (
  <Box padding={4} background="neutral0">
    {section &&
        Object.keys(section).map((contentType, index) => (
          <CollapsableContentType
            key={contentType}
            label={contentType.split('::')[1]}
            actions={section[contentType]}
            orderNumber={index}
            indexExpandendCollapsedContent={indexExpandedCollpsedContent}
            onExpanded={handleExpandedCollpsedContentIndex}
            name={`${name}.${contentType}`}
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
  section: PropTypes.objectOf(PropTypes.objectOf(PropTypes.bool)),
  name: PropTypes.string.isRequired,
};

export default ContentTypesSection;
