import * as React from 'react';

import { Button } from '@strapi/design-system';
import { ArrowUp } from '@strapi/icons';
import { styled } from 'styled-components';

const BackToTopButton = styled(Button)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
  border-radius: 50%;
  width: 3rem;
  height: 3rem;
  padding: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  opacity: ${({ $visible }: { $visible: boolean }) => ($visible ? 1 : 0)};
  visibility: ${({ $visible }: { $visible: boolean }) => ($visible ? 'visible' : 'hidden')};
  transform: ${({ $visible }: { $visible: boolean }) => ($visible ? 'translateY(0)' : 'translateY(10px)')};

  &:hover {
    transform: ${({ $visible }: { $visible: boolean }) => ($visible ? 'translateY(-2px)' : 'translateY(10px)')};
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
`;

interface BackToTopProps {
  /**
   * The scroll threshold in pixels after which the button becomes visible
   * @default 300
   */
  threshold?: number;
  /**
   * The target element to scroll to top. If not provided, scrolls to window top
   */
  target?: HTMLElement | null;
}

export const BackToTop = ({ threshold = 300, target }: BackToTopProps) => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const toggleVisibility = () => {
      const scrollElement = target || window;
      const scrollTop = target ? target.scrollTop : window.pageYOffset;
      
      setIsVisible(scrollTop > threshold);
    };

    const scrollElement = target || window;
    scrollElement.addEventListener('scroll', toggleVisibility);

    return () => {
      scrollElement.removeEventListener('scroll', toggleVisibility);
    };
  }, [threshold, target]);

  const scrollToTop = () => {
    if (target) {
      target.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  return (
    <BackToTopButton
      $visible={isVisible}
      onClick={scrollToTop}
      variant="default"
      size="M"
      aria-label="Scroll to top"
      title="Back to top"
    >
      <ArrowUp />
    </BackToTopButton>
  );
};