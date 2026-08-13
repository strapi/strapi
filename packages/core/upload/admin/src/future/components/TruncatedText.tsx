import { useLayoutEffect, useRef, useState } from 'react';

import { Tooltip, Typography, type TypographyProps } from '@strapi/design-system';

interface TruncatedTextProps extends Omit<TypographyProps, 'children' | 'ellipsis'> {
  /** The full text. Doubles as the tooltip content once it no longer fits. */
  children: string;
}

/**
 * Text that ellipsizes, with a tooltip carrying the full value once it actually
 * does. Used for folder and asset names, which are user-supplied and routinely
 * longer than the column, card or rail holding them.
 *
 * The tooltip is conditional rather than always-on: a permanent tooltip would
 * make every short name hoverable for no reason, and would announce a
 * description that merely repeats the visible text.
 *
 * Whether the text is truncated can't be derived from the string — it depends on
 * the rendered width — so it is measured, and re-measured on resize. That is
 * what keeps it correct as a card reflows, a column resizes, or the sidebar rail
 * changes width.
 */
export const TruncatedText = ({ children, ...props }: TruncatedTextProps) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) {
      return;
    }

    const checkTruncation = () => {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    };

    checkTruncation();

    const observer = new ResizeObserver(checkTruncation);
    observer.observe(el);

    return () => observer.disconnect();
  }, [children]);

  const text = (
    <Typography ref={textRef} ellipsis {...props}>
      {children}
    </Typography>
  );

  if (isTruncated) {
    // The DS Tooltip renders as its child, so this adds no DOM node — the
    // Typography stays the same flex/grid item it was and layout is untouched.
    return <Tooltip label={children}>{text}</Tooltip>;
  }

  return text;
};
