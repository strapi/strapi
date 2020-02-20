import React from 'react';
import PropTypes from 'prop-types';
import Flex from '../Flex';
import ModalSection from '../ModalSection';
import ModalTab from '../ModalTab';
import Hr from './Hr';

const ModalNavWrapper = ({ children, links, onClickGoTo, to }) => {
  return (
    <>
      <ModalSection justifyContent="space-between">
        <Flex>
          {links.map(link => {
            const isActive = link.to === to;

            return (
              <ModalTab
                key={link.to}
                label={link.label}
                to={link.to}
                isActive={isActive}
                isDisabled={link.isDisabled}
                onClick={onClickGoTo}
              />
            );
          })}
        </Flex>
        {children}
      </ModalSection>
      <ModalSection>
        <Hr />
      </ModalSection>
    </>
  );
};

ModalNavWrapper.defaultProps = {
  children: null,
  links: [],
  onClickGoTo: () => {},
  to: '',
};

ModalNavWrapper.propTypes = {
  children: PropTypes.node,
  links: PropTypes.array,
  onClickGoTo: PropTypes.func,
  to: PropTypes.string,
};

export default ModalNavWrapper;
