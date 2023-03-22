import React from 'react';
import PropTypes from 'prop-types';
import { useQuery } from 'react-query';
import { ModalLayout, ModalHeader, ModalBody, Breadcrumbs, Crumb } from '@strapi/design-system';
import { useNotification, useFetchClient } from '@strapi/helper-plugin';
import useFormatTimeStamp from '../hooks/useFormatTimeStamp';
import ActionBody from './ActionBody';

const Modal = ({ handleClose, logId }) => {
  const { get } = useFetchClient();
  const toggleNotification = useNotification();

  const fetchAuditLog = async (id) => {
    const { data } = await get(`/admin/audit-logs/${id}`);

    if (!data) {
      throw new Error('Audit log not found');
    }

    return data;
  };

  const { data, status } = useQuery(['audit-log', logId], () => fetchAuditLog(logId), {
    onError() {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
      handleClose();
    },
  });

  const formatTimeStamp = useFormatTimeStamp();
  const formattedDate = data ? formatTimeStamp(data.date) : '';

  return (
    <ModalLayout onClose={handleClose} labelledBy="title">
      <ModalHeader>
        <Breadcrumbs label={formattedDate} id="title">
          <Crumb>{formattedDate}</Crumb>
        </Breadcrumbs>
      </ModalHeader>
      <ModalBody>
        <ActionBody status={status} data={data} formattedDate={formattedDate} />
      </ModalBody>
    </ModalLayout>
  );
};

Modal.propTypes = {
  handleClose: PropTypes.func.isRequired,
  logId: PropTypes.string.isRequired,
};

export default Modal;
