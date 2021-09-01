import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Box, Row } from '@strapi/parts';
import { FilterIcon } from '@strapi/icons';
import FilterList from './FilterList';
import FilterPicker from './FilterPicker';

const Filters = ({ displayedFilters }) => {
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef();

  const handleToggle = () => {
    setIsVisible(prev => !prev);
  };

  return (
    <Box paddingBottom={4}>
      <Row style={{ flexWrap: 'wrap' }}>
        <Box padding={1}>
          <Button
            variant="tertiary"
            ref={buttonRef}
            endIcon={<FilterIcon />}
            onClick={handleToggle}
          >
            Filters
          </Button>
          <FilterPicker
            displayedFilters={displayedFilters}
            isVisible={isVisible}
            onToggle={handleToggle}
            source={buttonRef}
          />
        </Box>
        <FilterList />
      </Row>
    </Box>
  );
};

Filters.propTypes = {
  displayedFilters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      metadatas: PropTypes.shape({ label: PropTypes.string }),
      fieldSchema: PropTypes.shape({ type: PropTypes.string }),
    })
  ).isRequired,
};

export default Filters;
