import { useRef, useState } from 'react';

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
 * the rendered width — so it has to be measured. That measurement happens when
 * the pointer or focus arrives, not at mount.
 *
 * Measuring at mount is the obvious approach and it does not work here. The
 * reading is only correct once the row's width constraint has reached this span,
 * and the tree remounts its rows during first render: the instance that survives
 * can take its one measurement while still unconstrained, conclude it fits, and
 * be stuck there. Nothing corrects it afterwards, because a ResizeObserver on
 * this span never fires again — an ancestor clamps the row, so the text
 * overflows inside a box whose own size stops changing.
 *
 * Reading on hover sidesteps all of that. It is the only moment the answer is
 * needed, the layout is settled by then, and nothing is cached across remounts
 * or resizes that could go stale.
 */
export const TruncatedText = ({ children, ...props }: TruncatedTextProps) => {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = () => {
    const el = textRef.current;

    if (el) {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  };

  // A ref callback rather than useRef alone, so the first measurement happens
  // when the node attaches and again whenever it is replaced. The tree remounts
  // its rows during first render, and a value measured against the discarded
  // node would never be revisited — this re-runs against the node that survives.
  const attachRef = (el: HTMLSpanElement | null) => {
    textRef.current = el;

    if (el) {
      checkTruncation();
    }
  };

  // The Tooltip stays mounted and the *label* is what's conditional, rather than
  // swapping between a wrapped and unwrapped span. Swapping loses the first
  // hover: the measurement that decides to show a tooltip is itself triggered by
  // the pointer arriving, so the trigger would mount underneath a pointer that
  // has already entered, and Radix — which starts watching at mount — sees no
  // enter event and stays closed until the pointer leaves and returns.
  //
  // With `label` empty the DS Tooltip renders its child as-is and attaches
  // nothing, so untruncated text still costs no DOM node and announces no
  // description duplicating what is already on screen.
  return (
    <Tooltip label={isTruncated ? children : undefined}>
      <Typography
        ref={attachRef}
        ellipsis
        // Focus is covered as well as hover: the tooltip has to be reachable by
        // keyboard, and these rows are buttons.
        onPointerEnter={checkTruncation}
        onFocus={checkTruncation}
        {...props}
      >
        {children}
      </Typography>
    </Tooltip>
  );
};
