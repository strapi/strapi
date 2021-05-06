import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Button from './Button';
import Content from './Content';
import Icon from './Icon';
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

  if (isOpen) {
    return ReactDOM.createPortal(
      <Overlay>
        <Wrapper>
          <Icon {...config} elapsed={elapsed} />
          <div>
            <Content {...config} elapsed={elapsed} />
            <Button elapsed={elapsed} />
          </div>
        </Wrapper>
      </Overlay>,
      overlayContainer
    );
  }

  return null;
};

export default AutoReloadOverlayBlocker;
