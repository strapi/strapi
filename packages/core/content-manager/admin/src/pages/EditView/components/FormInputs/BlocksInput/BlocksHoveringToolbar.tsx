import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
import { useIsMobile } from '@strapi/admin/strapi-admin';
import { Box, Flex } from '@strapi/design-system';
import { Editor, Range, Element as SlateElement, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';

import { useBlocksEditorContext } from './BlocksEditor';
import { ToolbarButton } from './BlocksToolbar';

type BlocksHoveringToolbarProps = {
  containerRef: React.RefObject<HTMLElement>;
};

const BlocksHoveringToolbar = ({ containerRef }: BlocksHoveringToolbarProps) => {
  const isMobile = useIsMobile();
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const { editor, modifiers, disabled } = useBlocksEditorContext('BlocksHoveringToolbar');
  const toolbarRef = React.useRef<HTMLDivElement | null>(null);
  const lastSelectionRef = React.useRef<Editor['selection']>(null);

  const isSelectionValid = React.useCallback(() => {
    const { selection } = editor;
    if (!selection) return false;
    if (!ReactEditor.isFocused(editor)) return false;
    if (Range.isCollapsed(selection)) return false;

    const selectedText = Editor.string(editor, selection);
    if (selectedText.trim().length === 0) return false;

    return true;
  }, [editor]);

  // Snapshot the last non-collapsed selection so toolbar taps can re-apply it.
  React.useEffect(() => {
    if (editor.selection && !Range.isCollapsed(editor.selection)) {
      lastSelectionRef.current = editor.selection;
    }
  }, [editor.selection]);

  const isInlineToolbarDisabled = React.useCallback(() => {
    if (disabled) return true;
    if (!editor.selection) return false;

    const selectedNode = editor.children[editor.selection.anchor.path[0]];
    if (!selectedNode) return true;

    if (['image', 'code'].includes((selectedNode as any).type)) {
      return true;
    }

    return false;
  }, [disabled, editor]);

  const isLinkActive = React.useCallback(() => {
    const { selection } = editor;
    if (!selection) return false;

    const [match] = Array.from(
      Editor.nodes(editor, {
        at: Editor.unhangRange(editor, selection),
        match: (node) => SlateElement.isElement(node) && node.type === 'link',
      })
    );

    return Boolean(match);
  }, [editor]);

  const isLinkDisabled = React.useCallback(() => {
    // Always disabled when the whole editor is disabled
    if (disabled) {
      return true;
    }

    // Always enabled when there's no selection
    if (!editor.selection) {
      return false;
    }

    // Get the block node closest to the anchor and focus
    const anchorNodeEntry = Editor.above(editor, {
      at: editor.selection.anchor,
      match: (node) => !Editor.isEditor(node) && (node as any).type !== 'text',
    });
    const focusNodeEntry = Editor.above(editor, {
      at: editor.selection.focus,
      match: (node) => !Editor.isEditor(node) && (node as any).type !== 'text',
    });

    if (!anchorNodeEntry || !focusNodeEntry) {
      return false;
    }

    // Disabled if the anchor and focus are not in the same block
    return anchorNodeEntry[0] !== focusNodeEntry[0];
  }, [disabled, editor]);

  /**
   * Slate's example relies on preventing the toolbar from taking focus, so the editor stays focused
   * and the selection stays expanded. On mobile, selections can still be transient, so we keep a
   * snapshot of the last expanded selection and re-apply it if needed.
   */
  const ensureExpandedSelection = React.useCallback(() => {
    if (editor.selection && !Range.isCollapsed(editor.selection)) {
      return true;
    }

    if (lastSelectionRef.current) {
      Transforms.select(editor, lastSelectionRef.current);
      return true;
    }

    return false;
  }, [editor]);

  const updatePosition = React.useCallback(() => {
    const containerEl = containerRef.current;
    const toolbarEl = toolbarRef.current;

    if (!containerEl || !toolbarEl) return;

    if (!isMobile || !isSelectionValid() || isInlineToolbarDisabled()) {
      toolbarEl.style.pointerEvents = 'none';
      toolbarEl.style.visibility = 'hidden';
      return;
    }

    try {
      const selection = Editor.unhangRange(editor, editor.selection!);
      const domRange = ReactEditor.toDOMRange(editor, selection);
      /**
       * Prefer a single client rect when available.
       * Range#getBoundingClientRect can be "jumpy" with multi-rect selections and on some mobile browsers.
       */
      const rects = Array.from(domRange.getClientRects());
      const rect =
        rects.find((r) => r.width > 0 && r.height > 0) ?? domRange.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();

      const x = rect.left - containerRect.left + containerEl.scrollLeft + rect.width / 2;
      const selectionTopY = rect.top - containerRect.top + containerEl.scrollTop;
      const selectionBottomY = rect.bottom - containerRect.top + containerEl.scrollTop;

      /**
       * Clamp X so the toolbar stays fully visible within the scroll container.
       * Without this, centering near the edges can make the toolbar half-hidden.
       */
      const toolbarWidth = toolbarEl.offsetWidth || 0;
      const horizontalPadding = 8; // px
      const minLeft = containerEl.scrollLeft + horizontalPadding;
      const maxLeft =
        containerEl.scrollLeft + containerEl.clientWidth - toolbarWidth - horizontalPadding;
      const idealLeft = x - toolbarWidth / 2;
      const clampedLeft =
        toolbarWidth > 0 ? Math.min(maxLeft, Math.max(minLeft, idealLeft)) : idealLeft;

      const gap = 8; // px
      const verticalPadding = 8; // px
      const toolbarHeight = toolbarEl.offsetHeight || 0;
      const viewportTop = containerEl.scrollTop;
      const viewportBottom = containerEl.scrollTop + containerEl.clientHeight;

      const topAbove = selectionTopY - gap - toolbarHeight;
      const topBelow = selectionBottomY + gap;

      // On Android Chrome, the native "Copy/Paste" selection toolbar tends to overlap content above
      // the selection; prefer placing our toolbar below when possible.
      const fitsBelow =
        toolbarHeight > 0 ? topBelow + toolbarHeight <= viewportBottom - verticalPadding : true;
      const fitsAbove = toolbarHeight > 0 ? topAbove >= viewportTop + verticalPadding : true;
      const placeBelow = isAndroid ? fitsBelow || !fitsAbove : false;

      toolbarEl.style.left = `${clampedLeft}px`;
      toolbarEl.style.top = `${placeBelow ? topBelow : topAbove}px`;
      toolbarEl.style.visibility = 'visible';
      toolbarEl.style.pointerEvents = 'auto';
    } catch {
      // When Slate can't map selection to DOM (transient states), hide.
      toolbarEl.style.pointerEvents = 'none';
      toolbarEl.style.visibility = 'hidden';
    }
  }, [containerRef, editor, isAndroid, isInlineToolbarDisabled, isMobile, isSelectionValid]);

  React.useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const onScroll = () => updatePosition();
    containerEl.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      containerEl.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [containerRef, updatePosition]);

  React.useLayoutEffect(() => {
    /**
     * On mobile browsers, the DOM selection rect can lag behind Slate's selection update by a frame.
     * Measuring only synchronously can place the toolbar incorrectly (notably for the first word in a line),
     * and then "snap" into place on the next interaction.
     */
    updatePosition();
    const animationFrame = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(animationFrame);
  }, [updatePosition, editor.selection]);

  return (
    <Toolbar.Root aria-label="Formatting toolbar" asChild>
      <Box
        ref={toolbarRef as unknown as React.Ref<HTMLDivElement>}
        position="absolute"
        top={0}
        left={0}
        zIndex={2}
        padding={2}
        borderRadius={2}
        background="neutral0"
        borderColor="neutral150"
        borderStyle="solid"
        borderWidth="1px"
        shadow="filterShadow"
        style={{
          display: 'inline-flex',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
        // Prevent the toolbar from stealing focus.
        onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
        onPointerDown={(e: React.PointerEvent) => e.preventDefault()}
      >
        <Toolbar.ToggleGroup type="multiple" asChild>
          <Flex gap={1} alignItems="center">
            {Object.entries(modifiers).map(([name, modifier]) => {
              const active = modifier.checkIsActive(editor);
              const buttonDisabled = isInlineToolbarDisabled();

              return (
                <ToolbarButton
                  key={name}
                  name={name}
                  icon={modifier.icon}
                  label={modifier.label}
                  isActive={active}
                  disabled={buttonDisabled}
                  handleClick={() => {
                    if (!ensureExpandedSelection()) {
                      return;
                    }
                    modifier.handleToggle(editor);
                    ReactEditor.focus(editor);
                    requestAnimationFrame(updatePosition);
                  }}
                />
              );
            })}
          </Flex>
        </Toolbar.ToggleGroup>
      </Box>
    </Toolbar.Root>
  );
};

export { BlocksHoveringToolbar };
