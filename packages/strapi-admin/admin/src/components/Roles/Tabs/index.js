import React, { useState } from 'react';
import { Flex, Text } from '@buffetjs/core';
import PropTypes from 'prop-types';

import TabsWrapper from './TabsWrapper';
import Tab from './Tab';

const Tabs = ({ children, tabsLabel }) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const handleSelectedTab = index => {
    if (index !== selectedTabIndex) {
      setSelectedTabIndex(index);
    }
  };

  return (
    <TabsWrapper>
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
    </TabsWrapper>
  );
};

Tabs.propTypes = {
  children: PropTypes.node.isRequired,
  tabsLabel: PropTypes.array.isRequired,
};

export default Tabs;
