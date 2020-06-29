import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalFooter } from 'strapi-helper-plugin';
import { Button, Text, Padded, Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import ConditionSelect from './ConditionSelect';

const CustomModal = styled(Modal)`
  .modal-content {
    overflow: visible;
  }
`;

const ConditionsModal = ({ isOpen, toggle, actions }) => {
  const { formatMessage } = useIntl();

  return (
    <CustomModal isOpen={isOpen} toggle={toggle}>
      <ModalHeader
        headerBreadcrumbs={[
          'Settings.permissions.conditions.links',
          'app.components.LeftMenuLinkContainer.settings',
        ]}
      />
      <Padded top left right bottom size="md">
        <Text fontSize="lg" fontWeight="bold">
          {formatMessage({
            id: 'Settings.permissions.conditions.define-conditions',
          })}
        </Text>
        <div style={{ paddingTop: '14px', borderBottom: '1px solid #f0f3f8' }} />
        <div style={{ paddingTop: '28px' }} />
        {actions.map((action, index) => (
          <div
            key={action}
            style={{
              borderRadius: '2px',
              height: '36px',
              backgroundColor: index % 2 === 0 ? '#fafafb' : 'white',
              display: 'flex',
              marginBottom: '18px',
            }}
          >
            <Padded style={{ width: 150 }} top left right bottom size="sm">
              <Flex>
                <Text
                  lineHeight="19px"
                  color="grey"
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                >
                  {formatMessage({
                    id: 'Settings.permissions.conditions.can',
                  })}
                  &nbsp;
                </Text>
                <Text
                  lineHeight="19px"
                  fontWeight="bold"
                  fontSize="xs"
                  textTransform="uppercase"
                  color="mediumBlue"
                >
                  {action.split('.')[action.split('.').length - 1]}
                </Text>
                <Text
                  lineHeight="19px"
                  color="grey"
                  fontSize="xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  style={{ display: 'flex' }}
                >
                  &nbsp;
                  {formatMessage({
                    id: 'Settings.permissions.conditions.when',
                  })}
                </Text>
              </Flex>
            </Padded>
            <ConditionSelect onChange={a => console.log(a)} value="aze" />
          </div>
        ))}
      </Padded>
      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={toggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>

          <Button type="button" color="success" onClick={toggle}>
            {formatMessage({
              id: 'Settings.permissions.conditions.apply',
            })}
          </Button>
        </section>
      </ModalFooter>
    </CustomModal>
  );
};

ConditionsModal.propTypes = {
  actions: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  toggle: PropTypes.func.isRequired,
};
export default ConditionsModal;
