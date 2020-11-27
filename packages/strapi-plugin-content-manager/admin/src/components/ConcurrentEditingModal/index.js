import React, { memo, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Button, Flex, Padded, Text } from '@buffetjs/core';
import { get } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { ModalConfirm, OverlayBlocker } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import { getTrad } from '../../utils';
import Spinner from './Spinner';

const title = {
  id: getTrad('notification.concurrent-editing.read-only.title'),
  defaultMessage: 'Read mode only',
};

const cancelButtonLabel = {
  id: getTrad('components.ConcurrentEditingModal.button.go-back'),
  defaultMessage: 'No, cancel',
};

const confirmButtonLabel = {
  id: getTrad('components.ConcurrentEditingModal.button.confirm'),
  defaultMessage: 'Take over',
};

const overlayBlockerParams = {
  children: <div />,
  noGradient: true,
};

const ConcurrentEditingModal = ({
  isOpen,
  lockInfo,
  onConfirm,
  showButtonLoader,
  toggle,
  waitForLock,
}) => {
  const [counter, setCounter] = useState(30);
  const [shouldGoBack, setShouldGoBack] = useState(false);

  useEffect(() => {
    let timer = null;

    const tick = () => {
      setCounter(prev => {
        if (prev === 0) {
          return 30;
        }

        return prev - 1;
      });
    };

    if (isOpen) {
      timer = setInterval(() => tick(), 1000);
    }

    return () => {
      clearInterval(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (counter === 0) {
      waitForLock();
    }
  }, [counter, waitForLock]);

  const { firstname, lastname } = get(lockInfo, ['metadata', 'lockedBy'], {
    firstname: 'Kai',
    lastname: 'Doe',
  });

  const { goBack } = useHistory();

  const handleCancel = () => {
    toggle();
    setShouldGoBack(true);
  };

  const handleClosed = () => {
    if (shouldGoBack) {
      goBack();
    }
  };

  return (
    <>
      <OverlayBlocker key="overlayBlocker" isOpen={showButtonLoader} {...overlayBlockerParams} />
      <ModalConfirm
        buttons={[
          <Button color="cancel" type="button" key="cancel" onClick={handleCancel}>
            <FormattedMessage {...cancelButtonLabel} />
          </Button>,
          <Button
            color="primary"
            type="button"
            key="confirm"
            onClick={onConfirm}
            isLoading={showButtonLoader}
          >
            <FormattedMessage {...confirmButtonLabel} />
          </Button>,
        ]}
        content={{
          id: getTrad('components.ConcurrentEditingModal.body.content'),
          values: {
            br: () => <br />,
            name: `${firstname} ${lastname}`,
          },
        }}
        isOpen={isOpen}
        onConfirm={onConfirm}
        onClosed={handleClosed}
        title={title}
        toggle={toggle}
        type="xwarning"
      >
        <Flex justifyContent="center">
          <Text color="grey" style={{ fontStyle: 'italic' }}>
            Refreshing in {counter}
          </Text>
          <Padded left size="md">
            <Spinner />
          </Padded>
        </Flex>
      </ModalConfirm>
    </>
  );
};

ConcurrentEditingModal.defaultProps = {
  lockInfo: null,
};

ConcurrentEditingModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  lockInfo: PropTypes.object,
  showButtonLoader: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired,
  waitForLock: PropTypes.func.isRequired,
};

export default memo(ConcurrentEditingModal);
