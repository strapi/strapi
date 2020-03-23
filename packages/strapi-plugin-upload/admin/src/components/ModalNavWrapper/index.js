import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Flex from '../Flex';
import Padded from '../Padded';
import ModalSection from '../ModalSection';
import ModalTab from '../ModalTab';
import Hr from './Hr';
import BaselineAlignment from './BaselineAlignment';
import Wrapper from './Wrapper';

const ModalNavWrapper = ({ children, links, renderRightContent, initialTab }) => {
  const [to, setTo] = useState(initialTab || links[0].to);

  const handleGoTo = link => {
    setTo(link.to);
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
                  key={link.to}
                  label={link.label}
                  to={link.to}
                  count={link.count}
                  isActive={isActive}
                  isDisabled={link.isDisabled}
                  onClick={() => handleGoTo(link)}
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
  links: [],
  to: '',
  renderRightContent: null,
  initialTab: null,
};

ModalNavWrapper.propTypes = {
  children: PropTypes.func.isRequired,
  links: PropTypes.array,
  to: PropTypes.string,
  initialTab: PropTypes.string,
  renderRightContent: PropTypes.func,
};

export default ModalNavWrapper;
