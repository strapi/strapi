/* eslint-disable jsx-a11y/anchor-has-content */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Padded, Text } from '@buffetjs/core';
import { Modal } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import { Arrow, Download, Option, Wrapper } from './components';

const UpgradePlanModal = ({ isOpen, onToggle }) => {
  const ref = useRef();
  const { formatMessage } = useIntl();

  const handleClick = () => {
    ref.current.click();
  };

  return (
    <Modal isOpen={isOpen} onToggle={onToggle} closeButtonColor="#fff">
      <Wrapper>
        <Padded>
          <Option />
          <Padded top size="smd">
            <Padded top size="xs">
              <Text fontSize="xl" fontWeight="bold" lineHeight="24px">
                {formatMessage({ id: 'app.components.UpgradePlanModal.limit-reached' })}
              </Text>
            </Padded>
          </Padded>
          <Padded style={{ maxWidth: 405 }} top size="smd">
            <Text color="black" lineHeight="18px">
              <Text as="span" fontSize="md" fontWeight="semiBold">
                {formatMessage({ id: 'app.components.UpgradePlanModal.text-power' })}
              </Text>
              &nbsp;
              <Text as="span" fontSize="md">
                {formatMessage({ id: 'app.components.UpgradePlanModal.text-strapi' })}
              </Text>
              <br />
              <Text as="span" fontSize="md" fontWeight="semiBold">
                {formatMessage({ id: 'app.components.UpgradePlanModal.text-ee' })}
              </Text>
            </Text>
          </Padded>
          <Padded top size="md">
            <Button color="primary" onClick={handleClick} style={{ paddingRight: 0 }}>
              {formatMessage({ id: 'app.components.UpgradePlanModal.button' })}
              <Download />
            </Button>
          </Padded>
        </Padded>
        <Arrow />
      </Wrapper>

      <a
        href="https://strapi.io/pricing"
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
