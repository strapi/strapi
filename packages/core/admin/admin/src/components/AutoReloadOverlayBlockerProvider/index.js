import React, { useEffect, useRef, useState } from 'react';
import { AutoReloadOverlayBockerContext } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import Blocker from './Blocker';

const AutoReloadOverlayBlockerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [{ elapsed }, setState] = useState({ elapsed: 0, start: 0 });
  const [config, setConfig] = useState(undefined);

  const lockAppWithAutoreload = (config = undefined) => {
    setIsOpen(true);
    setConfig(config);
    setState(prev => ({ ...prev, start: Date.now() }));
  };

  const unlockAppWithAutoreload = () => {
    setIsOpen(false);
    setState({ start: 0, elapsed: 0 });
    setConfig(undefined);
  };

  const lockApp = useRef(lockAppWithAutoreload);
  const unlockApp = useRef(unlockAppWithAutoreload);

  useEffect(() => {
    let timer = null;

    if (isOpen) {
      timer = setInterval(() => {
        // if (elapsed > 15) {
        if (elapsed > 30) {
          clearInterval(timer);

          return null;
        }

        setState(prev => ({ ...prev, elapsed: Math.round(Date.now() - prev.start) / 1000 }));

        return null;
      }, 1000);
    } else {
      clearInterval(timer);
    }

    return () => {
      clearInterval(timer);
    };
  }, [isOpen, elapsed]);

  let displayedIcon = config?.icon || 'reload';

  let description = {
    id: config?.description || 'components.OverlayBlocker.description',
    defaultMessage:
      "You're using a feature that needs the server to restart. Please wait until the server is up.",
  };
  let title = {
    id: config?.title || 'components.OverlayBlocker.title',
    defaultMessage: 'Waiting for restart',
  };

  if (elapsed > 15) {
    displayedIcon = 'time';

    description = {
      id: 'components.OverlayBlocker.description.serverError',
      defaultMessage: 'The server should have restarted, please check your logs in the terminal.',
    };

    title = {
      id: 'components.OverlayBlocker.title.serverError',
      defaultMessage: 'The restart is taking longer than expected',
    };
  }

  return (
    <AutoReloadOverlayBockerContext.Provider
      value={{ lockApp: lockApp.current, unlockApp: unlockApp.current }}
    >
      <Blocker
        displayedIcon={displayedIcon}
        isOpen={isOpen}
        elapsed={elapsed}
        description={description}
        title={title}
      />
      {children}
    </AutoReloadOverlayBockerContext.Provider>
  );
};

AutoReloadOverlayBlockerProvider.propTypes = {
  children: PropTypes.element.isRequired,
};

export default AutoReloadOverlayBlockerProvider;
