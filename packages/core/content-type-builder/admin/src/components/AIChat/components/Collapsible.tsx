import { useState, createContext, useContext, useRef, useLayoutEffect } from 'react';

import { Box } from '@strapi/design-system';
import { styled } from 'styled-components';

interface CollapsibleContextValue {
  open: boolean;
  toggle: () => void;
}

const CollapsibleContext = createContext<CollapsibleContextValue | undefined>(undefined);

export const useCollapsible = () => {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error('Collapsible components must be wrapped in <Collapsible />');
  }
  return context;
};

const AnimatedContent = styled(Box)`
  overflow: hidden;
  transition: height ${({ theme }) => theme.motion.timings['200']}
    ${({ theme }) => theme.motion.easings.easeOutQuad};
`;

export const Collapsible = ({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <CollapsibleContext.Provider value={{ open, toggle: () => setOpen((prev) => !prev) }}>
      {children}
    </CollapsibleContext.Provider>
  );
};

export const CollapsibleTrigger = ({
  children,
}: {
  children: React.ReactNode | ((props: { open: boolean }) => React.ReactNode);
}) => {
  const { toggle, open } = useCollapsible();
  return (
    <Box onClick={toggle} style={{ cursor: 'pointer' }}>
      {typeof children === 'function' ? children({ open }) : children}
    </Box>
  );
};

export const CollapsibleContent = ({ children }: { children: React.ReactNode }) => {
  const { open } = useCollapsible();
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useLayoutEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);
    }
  }, [children]);

  return (
    <AnimatedContent
      ref={contentRef}
      role="region"
      aria-hidden={!open}
      style={{
        height: open ? `${height}px` : 0,
        visibility: height === 0 ? 'hidden' : 'visible',
      }}
    >
      {children}
    </AnimatedContent>
  );
};
