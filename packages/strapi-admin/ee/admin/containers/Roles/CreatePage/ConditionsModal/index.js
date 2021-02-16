import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalFooter } from 'strapi-helper-plugin';
import { Button, Text, Padded } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import Separator from './Separator';

const ConditionsModal = ({ headerBreadCrumbs, isOpen, onClosed, onToggle }) => {
  const { formatMessage } = useIntl();

  return (
    <Modal withoverflow="true" onClosed={onClosed} isOpen={isOpen} onToggle={onToggle}>
      <ModalHeader headerBreadcrumbs={headerBreadCrumbs} />
      <Padded top left right bottom size="md">
        <Text fontSize="lg" fontWeight="bold">
          {formatMessage({
            id: 'Settings.permissions.conditions.define-conditions',
          })}
        </Text>
        <Separator />
        {/* {actions.length === 0 && (
          <Text fontSize="md" color="grey">
            {formatMessage({ id: 'Settings.permissions.conditions.no-actions' })}
          </Text>
        )}
        {actions.map((action, index) => (
          <ActionRow
            key={action.id}
            action={action}
            isGrey={index % 2 === 0}
            value={conditions[action.id]}
            onChange={val => handleSelectChange(action.id, val)}
          />
        ))} */}
      </Padded>
      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onToggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>

          <Button type="button" color="success" onClick={() => console.log('todo')}>
            {formatMessage({
              id: 'Settings.permissions.conditions.apply',
            })}
          </Button>
        </section>
      </ModalFooter>
    </Modal>
  );
};

ConditionsModal.propTypes = {
  headerBreadCrumbs: PropTypes.arrayOf(PropTypes.string).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClosed: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ConditionsModal;
