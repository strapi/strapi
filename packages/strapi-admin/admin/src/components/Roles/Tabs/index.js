import React, { useState } from 'react';
import { Flex, Text, Padded } from '@buffetjs/core';
import PropTypes from 'prop-types';
import { LoadingIndicator } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';

import TabsWrapper from './TabsWrapper';
import Tab from './Tab';

const Tabs = ({ children, isLoading, tabsLabel }) => {
  const { formatMessage } = useIntl();
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
                isActive={index === selectedTabIndex}
                key={tab.id}
                onClick={() => handleSelectedTab(index)}
              >
                <Text fontWeight={index === selectedTabIndex ? 'bold' : 'semiBold'}>
                  {formatMessage({ id: tab.labelId, defaultMessage: tab.defaultMessage })}
                </Text>
              </Tab>
            ))}
          </Flex>
          {children[selectedTabIndex]}
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
  isLoading: PropTypes.bool,
  tabsLabel: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string.isRequired,
      labelId: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default Tabs;
