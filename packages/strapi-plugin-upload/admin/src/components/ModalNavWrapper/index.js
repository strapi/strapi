import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Flex, Padded } from '@buffetjs/core';

import ModalSection from '../ModalSection';
import ModalTab from '../ModalTab';
import Hr from './Hr';
import BaselineAlignment from './BaselineAlignment';
import Wrapper from './Wrapper';

const ModalNavWrapper = ({ children, links, renderRightContent, initialTab }) => {
  const [to, setTo] = useState(initialTab || links[0].to);

  const handleGoTo = link => {
    setTo(link.to);

    if (link.onClick) {
      link.onClick(link.to);
    }
  };

  return (
    <Wrapper>
      <Padded left right size="md">
        <BaselineAlignment />
        <Flex justifyContent="space-between">
          <Flex>
            {links.map(link => {
              const isActive = link.to === to;

              return (
                <ModalTab
                  count={link.count}
                  isActive={isActive}
                  isDisabled={link.isDisabled}
                  key={link.to}
                  label={link.label}
                  onClick={() => handleGoTo(link)}
                  to={link.to}
                />
              );
            })}
          </Flex>
          {renderRightContent && renderRightContent()}
        </Flex>
      </Padded>
      <ModalSection>
        <Hr />
      </ModalSection>
      {children(to)}
    </Wrapper>
  );
};

ModalNavWrapper.defaultProps = {
  initialTab: null,
  links: [],
  renderRightContent: null,
  to: '',
};

ModalNavWrapper.propTypes = {
  children: PropTypes.func.isRequired,
  initialTab: PropTypes.string,
  links: PropTypes.array,
  renderRightContent: PropTypes.func,
  to: PropTypes.string,
};

export default ModalNavWrapper;
