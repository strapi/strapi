import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ReactDOM from 'react-dom';
import Content from './Content';
import Overlay from './Overlay';
import Wrapper from './Wrapper';

const overlayContainer = document.createElement('div');
const ID = 'autoReloadOverlayBlocker';
overlayContainer.setAttribute('id', ID);

const AutoReloadOverlayBlocker = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [{ elapsed }, setState] = useState({ elapsed: 0, start: 0 });
  const [config, setConfig] = useState(undefined);

  const lockAppWithAutoreload = (config = undefined) => {
    document.body.appendChild(overlayContainer);

    setIsOpen(true);
    setConfig(config);
    setState(prev => ({ ...prev, start: Date.now() }));
  };

  const unlockAppWithAutoreload = () => {
    setIsOpen(false);
    setState({ start: 0, elapsed: 0 });
    setConfig(undefined);

    if (document.getElementById(ID)) {
      document.body.removeChild(overlayContainer);
    }
  };

  useEffect(() => {
    window.strapi = Object.assign(window.strapi || {}, {
      lockAppWithAutoreload,
      unlockAppWithAutoreload,
    });
  }, []);

  useEffect(() => {
    let timer = null;

    if (isOpen) {
      timer = setInterval(() => {
        if (elapsed > 15) {
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

  let displayedIcon = config?.icon || 'sync-alt';
  let className = 'icoContainer spinner';
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
    displayedIcon = ['far', 'clock'];
    className = 'icoContainer';
    description = {
      id: 'components.OverlayBlocker.description.serverError',
      defaultMessage: 'The server should have restarted, please check your logs in the terminal.',
    };

    title = {
      id: 'components.OverlayBlocker.title.serverError',
      defaultMessage: 'The restart is taking longer than expected',
    };
  }

  if (isOpen) {
    return ReactDOM.createPortal(
      <Overlay>
        <Wrapper>
          <div className={className}>
            <FontAwesomeIcon icon={displayedIcon} />
          </div>
          <div>
            <Content description={description} title={title} />
            {elapsed < 15 && (
              <div className="buttonContainer">
                <a
                  className="primary btn"
                  href="https://strapi.io/documentation"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read the documentation
                </a>
              </div>
            )}
          </div>
        </Wrapper>
      </Overlay>,
      overlayContainer
    );
  }

  return null;
};

export default AutoReloadOverlayBlocker;
