import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestion, faTimes } from '@fortawesome/free-solid-svg-icons';
import cn from 'classnames';
import { useConfigurations } from '../../../hooks';
import StaticLinks from './StaticLinks';
import Wrapper from './Wrapper';

const Onboarding = () => {
  const { showTutorials } = useConfigurations();

  if (!showTutorials) {
    return null;
  }

  return <OnboardingVideos />;
};

const OnboardingVideos = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <Wrapper className="visible" isOpen={isOpen}>
      <div className={cn('videosContent', isOpen ? 'shown' : 'hide')}>
        <StaticLinks />
      </div>
      <div className="openBtn">
        <button onClick={handleClick} className={isOpen ? 'active' : ''} type="button">
          <FontAwesomeIcon icon={faQuestion} />
          <FontAwesomeIcon icon={faTimes} />
          <span />
        </button>
      </div>
    </Wrapper>
  );
};

export default Onboarding;
