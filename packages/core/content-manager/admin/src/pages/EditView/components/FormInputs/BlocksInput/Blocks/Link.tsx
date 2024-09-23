import * as React from 'react';

import { BaseLink, Button, Field, Flex, Popover, useComposedRefs } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Editor, Path, Range, Transforms } from 'slate';
import { type RenderElementProps, ReactEditor } from 'slate-react';
import { styled } from 'styled-components';

import { type BlocksStore, useBlocksEditorContext } from '../BlocksEditor';
import { editLink, removeLink } from '../utils/links';
import { isLinkNode, type Block } from '../utils/types';

const StyledBaseLink = styled(BaseLink)`
  text-decoration: none;
`;

const RemoveButton = styled(Button)<{ $visible: boolean }>`
  visibility: ${(props) => (props.$visible ? 'visible' : 'hidden')};
`;

interface LinkContentProps extends RenderElementProps {
  link: Block<'link'>;
}

const LinkContent = React.forwardRef<HTMLAnchorElement, LinkContentProps>(
  ({ link, children, attributes }, forwardedRef) => {
    const { formatMessage } = useIntl();
    const { editor } = useBlocksEditorContext('Link');
    const path = ReactEditor.findPath(editor, link);
    const [popoverOpen, setPopoverOpen] = React.useState(
      editor.lastInsertedLinkPath ? Path.equals(path, editor.lastInsertedLinkPath) : false
    );
    const elementText = link.children.map((child) => child.text).join('');
    const [linkText, setLinkText] = React.useState(elementText);
    const [linkUrl, setLinkUrl] = React.useState(link.url);
    const linkInputRef = React.useRef<HTMLInputElement>(null);
    const isLastInsertedLink = editor.lastInsertedLinkPath
      ? !Path.equals(path, editor.lastInsertedLinkPath)
      : true;
    const [isSaveDisabled, setIsSaveDisabled] = React.useState(false);

    const onLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsSaveDisabled(false);
      setLinkUrl(e.target.value);

      try {
        // eslint-disable-next-line no-new
        new URL(
          e.target.value?.startsWith('/') ? `https://strapi.io${e.target.value}` : e.target.value
        );
      } catch (error) {
        setIsSaveDisabled(true);
      }
    };

    const handleSave: React.FormEventHandler = (e) => {
      e.stopPropagation();

      // If the selection is collapsed, we select the parent node because we want all the link to be replaced)
      if (editor.selection && Range.isCollapsed(editor.selection)) {
        const [, parentPath] = Editor.parent(editor, editor.selection.focus?.path);
        Transforms.select(editor, parentPath);
      }

      editLink(editor, { url: linkUrl, text: linkText });
      setPopoverOpen(false);
      editor.lastInsertedLinkPath = null;
      ReactEditor.focus(editor);
    };

    const handleClose = () => {
      if (link.url === '') {
        removeLink(editor);
      }

      setPopoverOpen(false);
      ReactEditor.focus(editor);
    };

    React.useEffect(() => {
      // Focus on the link input element when the popover opens
      if (popoverOpen) linkInputRef.current?.focus();
    }, [popoverOpen]);

    const inputNotDirty =
      !linkText ||
      !linkUrl ||
      (link.url && link.url === linkUrl && elementText && elementText === linkText);

    return (
      <Popover.Root open={popoverOpen}>
        <Popover.Trigger>
          <StyledBaseLink
            {...attributes}
            ref={forwardedRef}
            href={link.url}
            onClick={() => setPopoverOpen(true)}
            color="primary600"
          >
            {children}
          </StyledBaseLink>
        </Popover.Trigger>
        <Popover.Content onPointerDownOutside={handleClose}>
          <Flex padding={4} direction="column" gap={4}>
            <Field.Root width="368px">
              <Flex direction="column" gap={1} alignItems="stretch">
                <Field.Label>
                  {formatMessage({
                    id: 'components.Blocks.popover.text',
                    defaultMessage: 'Text',
                  })}
                </Field.Label>
                <Field.Input
                  name="text"
                  placeholder={formatMessage({
                    id: 'components.Blocks.popover.text.placeholder',
                    defaultMessage: 'Enter link text',
                  })}
                  value={linkText}
                  onChange={(e) => {
                    setLinkText(e.target.value);
                  }}
                />
              </Flex>
            </Field.Root>
            <Field.Root width="368px">
              <Flex direction="column" gap={1} alignItems="stretch">
                <Field.Label>
                  {formatMessage({
                    id: 'components.Blocks.popover.link',
                    defaultMessage: 'Link',
                  })}
                </Field.Label>
                <Field.Input
                  ref={linkInputRef}
                  name="url"
                  placeholder={formatMessage({
                    id: 'components.Blocks.popover.link.placeholder',
                    defaultMessage: 'Paste link',
                  })}
                  value={linkUrl}
                  onChange={onLinkChange}
                />
              </Flex>
            </Field.Root>
            <Flex justifyContent="space-between" width="100%">
              <RemoveButton
                variant="danger-light"
                onClick={() => removeLink(editor)}
                $visible={isLastInsertedLink}
              >
                {formatMessage({
                  id: 'components.Blocks.popover.remove',
                  defaultMessage: 'Remove',
                })}
              </RemoveButton>
              <Flex gap={2}>
                <Button variant="tertiary" onClick={handleClose}>
                  {formatMessage({
                    id: 'components.Blocks.popover.cancel',
                    defaultMessage: 'Cancel',
                  })}
                </Button>
                <Button disabled={Boolean(inputNotDirty) || isSaveDisabled} onClick={handleSave}>
                  {formatMessage({
                    id: 'components.Blocks.popover.save',
                    defaultMessage: 'Save',
                  })}
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Popover.Content>
      </Popover.Root>
    );
  }
);

const Link = React.forwardRef<HTMLAnchorElement, RenderElementProps>((props, forwardedRef) => {
  if (!isLinkNode(props.element)) {
    return null;
  }

  // LinkContent uses React hooks that rely on props.element being a link. If the type guard above
  // doesn't pass, those hooks would be called conditionnally, which is not allowed.
  // Hence the need for a separate component.
  return <LinkContent {...props} link={props.element} ref={forwardedRef} />;
});

const linkBlocks: Pick<BlocksStore, 'link'> = {
  link: {
    renderElement: (props) => (
      <Link element={props.element} attributes={props.attributes}>
        {props.children}
      </Link>
    ),
    // No handleConvert here, links are created via the link button in the toolbar
    matchNode: (node) => node.type === 'link',
    isInBlocksSelector: false,
  },
};

export { linkBlocks };
