import { useEffect, useRef, createContext, useContext, useState, ReactNode } from 'react';

import { createPortal } from 'react-dom';
import { styled } from 'styled-components';

import { ANIMATIONS } from './animations';
import { Base64Img } from './Base64Image';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

interface FullScreenImageContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  src: string;
  alt: string;
}

const FullScreenImageContext = createContext<FullScreenImageContextType | undefined>(undefined);

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface FullScreenImageProps {
  src: string;
  alt: string;
  onClose?: () => void;
}

interface FullScreenImageRootProps extends FullScreenImageProps {
  children: ReactNode;
  defaultOpen?: boolean;
}

interface FullScreenImageTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

/* -------------------------------------------------------------------------------------------------
 * Styles
 * -----------------------------------------------------------------------------------------------*/
export const setOpacity = (hex: string, alpha: number) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  pointer-events: auto; /* Explicitly enable pointer events */
  background: ${(props) => setOpacity(props.theme.colors.neutral800, 0.2)};
`;

const ImageWrapper = styled.div`
  max-width: 80vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto; /* Explicitly enable pointer events */
  position: relative;
  animation: ${ANIMATIONS.scaleIn} 0.3s ease;
`;

const StyledImg = styled(Base64Img)`
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  pointer-events: auto; /* Explicitly enable pointer events */
`;

/* -------------------------------------------------------------------------------------------------
 * Modal
 * -----------------------------------------------------------------------------------------------*/

// Use the existing FullScreenImage as our modal component
const ImageModal = ({ src, alt, onClose }: FullScreenImageProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Stop propagation to prevent closing parent modals
        e.preventDefault();
        e.stopPropagation();
        onClose?.();

        // The next 3 lines are critical: they completely stop the event
        e.stopImmediatePropagation();
        e.cancelBubble = true; // For older browsers
        return false;
      }
    };

    // Use capture phase to intercept event before it reaches other components
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // Setup click handlers
  useEffect(() => {
    const handleOverlayClick = (e: MouseEvent) => {
      // Only close if clicking directly on the overlay (not its children)
      if (e.target === overlayRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    };

    const handleWrapperClick = (e: MouseEvent) => {
      // Stop propagation for clicks on the image wrapper
      e.stopPropagation();
    };

    const overlay = overlayRef.current;
    const wrapper = wrapperRef.current;

    if (overlay) {
      overlay.addEventListener('click', handleOverlayClick);
    }

    if (wrapper) {
      wrapper.addEventListener('click', handleWrapperClick);
    }

    return () => {
      if (overlay) {
        overlay.removeEventListener('click', handleOverlayClick);
      }

      if (wrapper) {
        wrapper.removeEventListener('click', handleWrapperClick);
      }
    };
  }, [onClose]);

  // Using createPortal to render directly at document body level
  return createPortal(
    <Overlay ref={overlayRef}>
      <ImageWrapper ref={wrapperRef}>
        <StyledImg src={src} alt={alt} />
      </ImageWrapper>
    </Overlay>,
    document.body
  );
};

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

// Root component that provides context
const Root = ({ children, src, alt, onClose, defaultOpen = false }: FullScreenImageRootProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const open = () => setIsOpen(true);
  const close = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <FullScreenImageContext.Provider value={{ isOpen, open, close, src, alt }}>
      {children}
      {isOpen && <ImageModal src={src} alt={alt} onClose={close} />}
    </FullScreenImageContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Hooks
 * -----------------------------------------------------------------------------------------------*/

// Hook to use the context
const useFullScreenImage = () => {
  const context = useContext(FullScreenImageContext);
  if (!context) {
    throw new Error('useFullScreenImage must be used within a FullScreenImage.Root');
  }
  return context;
};

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

// Trigger component that opens the full screen image
const Trigger = ({ children, asChild = false }: FullScreenImageTriggerProps) => {
  const { open } = useFullScreenImage();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    open();
  };

  if (asChild) {
    return (
      <div onClick={handleClick} style={{ cursor: 'pointer', display: 'contents' }}>
        {children}
      </div>
    );
  }

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer' }}>
      {children}
    </div>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Export
 * -----------------------------------------------------------------------------------------------*/

export const FullScreenImage = {
  Root,
  Trigger,
};
