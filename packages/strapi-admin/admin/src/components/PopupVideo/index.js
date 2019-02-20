/**
 *
 * PopUpWarning
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

// modal
import { Button, Modal, ModalHeader, ModalBody } from 'reactstrap';
import { Player } from 'video-react';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

function PopUpVideo({
  content,
  isOpen,
  onConfirm,
  onlyConfirmButton,
  popUpWarningType,
  toggleModal,
  video,
}) {
  return (
    <div className={styles.popUpWarningHelper}>
      <Player playsInline poster="/assets/poster.png" src={video} />

      {/* <Modal
        isOpen={isOpen}
        toggle={toggleModal}
        className={styles.modalPosition}
      >
        <ModalHeader toggle={toggleModal} className={styles.popUpWarningHeader}>
          <FormattedMessage
            id={content.title || 'components.popUpWarning.title'}
          />
        </ModalHeader>
        <ModalBody className={styles.modalBodyHelper}>
          <div>
            <video controls autoPlay src={src} />
          </div>
        </ModalBody>
      </Modal> */}
    </div>
  );
}

PopUpVideo.propTypes = {
  content: PropTypes.shape({
    cancel: PropTypes.string,
    confirm: PropTypes.string,
    message: PropTypes.string,
    title: PropTypes.string,
  }),
};

PopUpVideo.defaultProps = {
  content: {
    cancel: 'components.popUpWarning.button.cancel',
    confirm: 'components.popUpWarning.button.confirm',
    message: 'components.popUpWarning.message',
    title: 'components.popUpWarning.title',
  },
};

export default PopUpVideo;
