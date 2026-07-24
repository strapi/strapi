import * as React from 'react';

import { Range } from 'slate';
import { ReactEditor, useSlate } from 'slate-react';

import { TOOLBAR_HEIGHT, TOOLBAR_WIDTH } from '../utils/constants';

interface ToolbarPosition {
  top: number;
  left: number;
  visible: boolean;
  flipBelow: boolean;
}

export function useFloatingToolbarPosition(
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
): ToolbarPosition {
  const editor = useSlate();
  const [position, setPosition] = React.useState<ToolbarPosition>({
    top: 0,
    left: 0,
    visible: false,
    flipBelow: false,
  });

  React.useEffect(() => {
    const { selection } = editor;

    if (!selection || Range.isCollapsed(selection)) {
      setPosition((prev) => ({ ...prev, visible: false }));
      return;
    }

    try {
      const domRange = ReactEditor.toDOMRange(editor, selection);
      const rect = domRange.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) {
        setPosition((prev) => ({ ...prev, visible: false }));
        return;
      }

      const OFFSET = 8;

      // Flip below when there is not enough room above the selection within the iframe's
      // visible area. Without iframeRef the threshold is relative to the viewport top.
      const iframeTop = iframeRef?.current?.getBoundingClientRect().top ?? 0;
      const flipBelow = rect.top - iframeTop < TOOLBAR_HEIGHT + OFFSET;

      const top = flipBelow ? rect.bottom + OFFSET : rect.top - TOOLBAR_HEIGHT - OFFSET;
      const left = Math.max(
        8,
        Math.min(
          rect.left + rect.width / 2 - TOOLBAR_WIDTH / 2,
          window.innerWidth - TOOLBAR_WIDTH - 8
        )
      );

      setPosition({ top, left, visible: true, flipBelow });
    } catch {
      setPosition((prev) => ({ ...prev, visible: false }));
    }
    // editor.selection is intentionally in the dep array - useSlate re-renders on selection change
  }, [editor, editor.selection]); // eslint-disable-line react-hooks/exhaustive-deps

  return position;
}
