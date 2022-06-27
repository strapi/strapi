import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import CollapsableContentType from '../CollapsableContentType';
// import { useIntl } from 'react-intl';

const ContentTypesSection = ({ section, name }) => {
  //   const { formatMessage } = useIntl();

  return (
    <Box padding={4} background="neutral0">
      {Object.keys(section).map((contentType, index) => (
        <CollapsableContentType
          key={contentType}
          label={contentType.split('::')[1]}
          actions={section[contentType]}
          orderNumber={index}
          name={`${name}.${contentType}`}
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
