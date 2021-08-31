import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import Content from './Content';
import Overlay from './Overlay';
import Wrapper from './Wrapper';

const overlayContainer = document.createElement('div');
const ID = 'autoReloadOverlayBlocker';
overlayContainer.setAttribute('id', ID);

const Blocker = ({ className, displayedIcon, description, title, elapsed, isOpen }) => {
  useEffect(() => {
    document.body.appendChild(overlayContainer);

    return () => {
      document.body.removeChild(overlayContainer);
    };
  }, []);

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

Blocker.propTypes = {
  className: PropTypes.string.isRequired,
  displayedIcon: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  description: PropTypes.object.isRequired,
  elapsed: PropTypes.number.isRequired,
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.object.isRequired,
};

export default Blocker;
