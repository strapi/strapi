/* eslint-disable jsx-a11y/anchor-has-content */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Padded, Text } from '@buffetjs/core';
import { Modal } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Arrow from './components/Arrow';
import Option from './components/Option';
import Wrapper from './components/Wrapper';

const UpgradePlanModal = ({ isOpen, onToggle }) => {
  const ref = useRef();

  const handleClick = () => {
    ref.current.click();
  };

  return (
    <Modal isOpen={isOpen} onToggle={onToggle} shouldDisplayCloseButton={false}>
      <Wrapper>
        <Padded>
          <Option />
          <Padded top size="smd">
            <Padded top size="xs">
              <Text fontSize="xl" fontWeight="bold" lineHeight="24px">
                You have reached the limit
              </Text>
            </Padded>
          </Padded>
          <Padded style={{ maxWidth: 360 }} top size="smd">
            <Text color="black" lineHeight="18px">
              <Text as="span" fontSize="md" fontWeight="semiBold">
                Unlock the full power
              </Text>
              &nbsp;
              <Text as="span" fontSize="md">
                of Strapi by upgrading your plan to the
              </Text>
              &nbsp;
              <Text as="span" fontSize="md" fontWeight="semiBold">
                Entreprise Edition
              </Text>
            </Text>
          </Padded>
          <Padded top size="md">
            <Button color="primary" onClick={handleClick}>
              LEARN MORE
              <FontAwesomeIcon icon="arrow-right" />
            </Button>
          </Padded>
        </Padded>
        <Arrow />
      </Wrapper>

      <a
        href="https://strapi.io/enterprise#contact"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'none' }}
        ref={ref}
      />
    </Modal>
  );
};

UpgradePlanModal.defaultProps = {
  isOpen: false,
  onToggle: () => {},
};

UpgradePlanModal.propTypes = {
  isOpen: PropTypes.bool,
  onToggle: PropTypes.func,
};

export default UpgradePlanModal;
