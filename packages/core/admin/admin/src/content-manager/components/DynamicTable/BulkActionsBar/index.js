import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { Button } from '@strapi/design-system';
import { useTracking, getYupInnerErrors } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import ConfirmDialogDeleteAll from '../ConfirmDialogDeleteAll';
import { createYupSchema } from '../../../utils';
import { listViewDomain } from '../../../pages/ListView/selectors';

const BulkActionsBar = ({
  showPublish,
  showDelete,
  onConfirmDeleteAll,
  selectedEntries,
  clearSelectedEntries,
}) => {
  const { data, contentType, components } = useSelector(listViewDomain());
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  const handleToggleShowDeleteAllModal = () => {
    if (!showConfirmDeleteAll) {
      trackUsage('willBulkDeleteEntries');
    }

    setShowConfirmDeleteAll((prev) => !prev);
  };

  const handleConfirmDeleteAll = async () => {
    try {
      setIsConfirmButtonLoading(true);
      await onConfirmDeleteAll(selectedEntries);
      handleToggleShowDeleteAllModal();
      clearSelectedEntries();
      setIsConfirmButtonLoading(false);
    } catch (err) {
      setIsConfirmButtonLoading(false);
      handleToggleShowDeleteAllModal();
    }
  };
  /**
   * @param {number[]} selectedIds - Array of ids to publish
   * @returns {{validIds: number[], errors: Object.<number, string>}} - Returns an object with the valid ids and the errors
   */
  const validateEntriesToPublish = async () => {
    const validations = { validIds: [], errors: {} };
    // Create the validation schema based on the contentType
    const schema = createYupSchema(contentType, { components }, { isDraft: false });
    // Get the selected entries
    const entries = data.filter((entry) => {
      return selectedEntries.includes(entry.id);
    });
    // Validate each entry and map the unresolved promises
    const validationPromises = entries.map((entry) =>
      schema.validate(entry, { abortEarly: false })
    );
    // Resolve all the promises in one go
    const resolvedPromises = await Promise.allSettled(validationPromises);
    // Set the validations
    resolvedPromises.forEach((promise) => {
      if (promise.status === 'rejected') {
        const entityId = promise.reason.value.id;
        validations.errors[entityId] = getYupInnerErrors(promise.reason);
      }

      if (promise.status === 'fulfilled') {
        validations.validIds.push(promise.value.id);
      }
    });

    return validations;
  };

  const handleBulkPublish = async () => {
    const validations = await validateEntriesToPublish();
    // TODO: Remove log when we actually do something with the validations
    console.log(validations);
  };

  return (
    <>
      {showPublish && (
        <>
          <Button variant="tertiary" onClick={handleBulkPublish}>
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
          <Button variant="tertiary">
            {formatMessage({ id: 'app.utils.unpublish', defaultMessage: 'Unpublish' })}
          </Button>
        </>
      )}
      {showDelete && (
        <>
          <Button variant="danger-light" onClick={handleToggleShowDeleteAllModal}>
            {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
          </Button>
          <ConfirmDialogDeleteAll
            isOpen={showConfirmDeleteAll}
            onToggleDialog={handleToggleShowDeleteAllModal}
            isConfirmButtonLoading={isConfirmButtonLoading}
            onConfirm={handleConfirmDeleteAll}
          />
        </>
      )}
    </>
  );
};

BulkActionsBar.defaultProps = {
  showPublish: false,
  showDelete: false,
  onConfirmDeleteAll() {},
};

BulkActionsBar.propTypes = {
  showPublish: PropTypes.bool,
  showDelete: PropTypes.bool,
  onConfirmDeleteAll: PropTypes.func,
  selectedEntries: PropTypes.array.isRequired,
  clearSelectedEntries: PropTypes.func.isRequired,
};

export default BulkActionsBar;
