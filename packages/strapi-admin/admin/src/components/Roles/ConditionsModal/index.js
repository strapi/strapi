import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalFooter } from 'strapi-helper-plugin';
import { Button, Text, Padded } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import Separator from './Separator';
import ActionRow from './ActionRow';

const ConditionsModal = ({
  actions,
  headerBreadCrumbs,
  initialConditions,
  isOpen,
  onClosed,
  onSubmit,
  onToggle,
}) => {
  const { formatMessage } = useIntl();
  const [conditions, setConditions] = useState(initialConditions);

  const handleSelectChange = (action, conditions) => {
    setConditions(prev => ({
      ...prev,
      [action]: conditions,
    }));
  };

  const handleSubmit = () => {
    onSubmit(conditions);
    onToggle();
  };

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
        {actions.length === 0 && (
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
        ))}
      </Padded>
      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onToggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>

          <Button type="button" color="success" onClick={handleSubmit}>
            {formatMessage({
              id: 'Settings.permissions.conditions.apply',
            })}
          </Button>
        </section>
      </ModalFooter>
    </Modal>
  );
};

ConditionsModal.defaultProps = {
  initialConditions: {},
};

ConditionsModal.propTypes = {
  actions: PropTypes.array.isRequired,
  headerBreadCrumbs: PropTypes.arrayOf(PropTypes.string).isRequired,
  initialConditions: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClosed: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};
export default ConditionsModal;
