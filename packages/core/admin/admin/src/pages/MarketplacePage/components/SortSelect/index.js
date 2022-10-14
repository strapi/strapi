import React, { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Option } from '@strapi/design-system/Select';
import { Popover } from '@strapi/design-system/Popover';
import { Button } from '@strapi/design-system/Button';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import CarretDown from '@strapi/icons/CarretDown';
import styled from 'styled-components';

const SortOption = styled(Option)`
  list-style-type: none;
`;

const SortToggleButton = styled(Button)`
  svg {
    width: ${({ theme }) => theme.spaces[2]};
    height: ${({ theme }) => theme.spaces[1]};
  }

  svg > path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const SortSelect = ({ sortQuery, setQuery }) => {
  const { formatMessage } = useIntl();
  const buttonRef = useRef();
  const [isVisible, setIsVisible] = useState(false);

  const sortTypes = {
    'name:asc': {
      id: 'admin.pages.MarketPlacePage.sort.alphabetical',
      defaultMessage: 'Alphabetical order',
    },
    'submissionDate:desc': {
      id: 'admin.pages.MarketPlacePage.sort.newest',
      defaultMessage: 'Newest',
    },
  };

  const handleToggle = () => setIsVisible((prev) => !prev);

  const handleBlur = (e) => {
    e.preventDefault();

    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsVisible(false);
    }
  };

  const handleSortClick = (sortName) => {
    setQuery({ sort: sortName });
    handleToggle();
  };

  const computeSortMessage = (sortName) => {
    const defaultSortLabel = formatMessage({
      id: 'admin.pages.MarketPlacePage.sort.sortBy',
      defaultMessage: 'Sort by',
    });

    if (sortName) {
      const sortInfo = sortTypes[sortName];
      const message = formatMessage({
        id: sortInfo.id,
        defaultMessage: sortInfo.defaultMessage,
      });

      return `${defaultSortLabel}: ${message}`;
    }

    return defaultSortLabel;
  };

  return (
    <>
      <SortToggleButton
        aria-label={computeSortMessage(sortQuery)}
        aria-controls="sort-by-values"
        aria-haspopup="dialog"
        aria-expanded={isVisible}
        aria-disabled={false}
        onClick={handleToggle}
        variant="tertiary"
        ref={buttonRef}
        endIcon={<CarretDown aria-hidden />}
        size="S"
      >
        {computeSortMessage(sortQuery)}
      </SortToggleButton>
      {isVisible && (
        <Popover
          role="dialog"
          id="sort-by-values"
          onBlur={handleBlur}
          source={buttonRef}
          spacing={4}
        >
          <FocusTrap onEscape={handleToggle}>
            {Object.entries(sortTypes).map(([sortName, sortInfo], index) => {
              const { id, defaultMessage } = sortInfo;

              return (
                <SortOption
                  key={sortName}
                  value={sortName}
                  selected={sortQuery === sortName}
                  onClick={() => handleSortClick(sortName)}
                  tabIndex={index}
                >
                  {formatMessage({ id, defaultMessage })}
                </SortOption>
              );
            })}
          </FocusTrap>
        </Popover>
      )}
    </>
  );
};

SortSelect.defaultProps = {
  sortQuery: undefined,
};

SortSelect.propTypes = {
  setQuery: PropTypes.func.isRequired,
  sortQuery: PropTypes.string,
};

export default SortSelect;
