import React, { useState } from 'react';
import { Flex, Text, Padded } from '@buffetjs/core';
import PropTypes from 'prop-types';
import { LoadingIndicator } from 'strapi-helper-plugin';

import TabsWrapper from './TabsWrapper';
import Tab from './Tab';

const Tabs = ({ children, tabsLabel, isLoading }) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const handleSelectedTab = index => {
    if (index !== selectedTabIndex) {
      setSelectedTabIndex(index);
    }
  };

  return (
    <TabsWrapper>
      {isLoading ? (
        <Padded top bottom size="lg">
          <LoadingIndicator />
        </Padded>
      ) : (
        <>
          <Flex alignItems="stretch">
            {tabsLabel.map((tab, index) => (
              <Tab
                // eslint-disable-next-line react/no-array-index-key
                key={`${tab}-${index}`}
                onClick={() => handleSelectedTab(index)}
                isActive={index === selectedTabIndex}
              >
                <Text fontWeight={index === selectedTabIndex ? 'bold' : 'semiBold'}>{tab}</Text>
              </Tab>
            ))}
          </Flex>
          {children && children[selectedTabIndex]}
        </>
      )}
    </TabsWrapper>
  );
};

Tabs.defaultProps = {
  isLoading: false,
};

Tabs.propTypes = {
  children: PropTypes.node.isRequired,
  tabsLabel: PropTypes.array.isRequired,
  isLoading: PropTypes.bool,
};

export default Tabs;
