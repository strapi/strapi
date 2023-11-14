import * as React from 'react';

import {
  BaseLink,
  Button,
  Field,
  FieldInput,
  FieldLabel,
  Flex,
  Icon,
  Popover,
  Tooltip,
  Typography,
} from '@strapi/design-system';
import { Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Editor, Path, Range, Transforms } from 'slate';
import { type RenderElementProps, ReactEditor } from 'slate-react';
import styled from 'styled-components';

// @ts-expect-error TODO migrate this file
import { composeRefs } from '../../../utils';
import { type BlocksStore, useBlocksEditorContext } from '../BlocksEditor';
import { editLink, removeLink } from '../utils/links';
import { type Block } from '../utils/types';

const StyledBaseLink = styled(BaseLink)`
  text-decoration: none;
`;

// Make sure the tooltip is above the popover
const TooltipCustom = styled(Tooltip)`
  z-index: 6;
`;

// Used for the Edit and Cancel buttons in the link popover
const CustomButton = styled(Button)`
  & > span {
    line-height: normal;
  }
`;

const Link = React.forwardRef<HTMLAnchorElement, RenderElementProps>(
  ({ element, children, attributes }, forwardedRef) => {
    const { formatMessage } = useIntl();
    const { editor } = useBlocksEditorContext('Link');
    const path = ReactEditor.findPath(editor, element);
    const [popoverOpen, setPopoverOpen] = React.useState(
      editor.lastInsertedLinkPath ? Path.equals(path, editor.lastInsertedLinkPath) : false
    );

    const elementAsLink = element as Block<'link'>;

    const [isEditing, setIsEditing] = React.useState(elementAsLink.url === '');
    const linkRef = React.useRef<HTMLAnchorElement>(null!);
    const elementText = elementAsLink.children.map((child) => child.text).join('');
    const [linkText, setLinkText] = React.useState(elementText);
    const [linkUrl, setLinkUrl] = React.useState(elementAsLink.url);

    const handleOpenEditPopover: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
      e.preventDefault();
      setPopoverOpen(true);
    };

    const handleSave: React.FormEventHandler = (e) => {
      e.stopPropagation();

      // If the selection is collapsed, we select the parent node because we want all the link to be replaced)
      if (editor.selection && Range.isCollapsed(editor.selection)) {
        const [, parentPath] = Editor.parent(editor, editor.selection.focus?.path);
        Transforms.select(editor, parentPath);
      }

      editLink(editor, { url: linkUrl, text: linkText });
      setIsEditing(false);
    };

    const handleCancel = () => {
      setIsEditing(false);

      if (elementAsLink.url === '') {
        removeLink(editor);
      }
    };

    const handleDismiss = () => {
      setPopoverOpen(false);

      if (elementAsLink.url === '') {
        removeLink(editor);
      }

      ReactEditor.focus(editor);
    };

    const composedRefs = composeRefs(linkRef, forwardedRef);

    return (
      <>
        <StyledBaseLink
          {...attributes}
          ref={composedRefs}
          href={elementAsLink.url}
          onClick={handleOpenEditPopover}
          color="primary600"
        >
          {children}
        </StyledBaseLink>
        {popoverOpen && (
          <Popover source={linkRef} onDismiss={handleDismiss} padding={4} contentEditable={false}>
            {isEditing ? (
              <Flex as="form" onSubmit={handleSave} direction="column" gap={4}>
                <Field width="300px">
                  <FieldLabel>
                    {formatMessage({
                      id: 'components.Blocks.popover.text',
                      defaultMessage: 'Text',
                    })}
                  </FieldLabel>
                  <FieldInput
                    name="text"
                    placeholder={formatMessage({
                      id: 'components.Blocks.popover.text.placeholder',
                      defaultMessage: 'Enter link text',
                    })}
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                  />
                </Field>
                <Field width="300px">
                  <FieldLabel>
                    {formatMessage({
                      id: 'components.Blocks.popover.link',
                      defaultMessage: 'Link',
                    })}
                  </FieldLabel>
                  <FieldInput
                    name="url"
                    placeholder="https://strapi.io"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </Field>
                <Flex justifyContent="end" width="100%" gap={2}>
                  <Button variant="tertiary" onClick={handleCancel}>
                    {formatMessage({
                      id: 'components.Blocks.popover.cancel',
                      defaultMessage: 'Cancel',
                    })}
                  </Button>
                  <Button type="submit" disabled={!linkText || !linkUrl}>
                    {formatMessage({
                      id: 'components.Blocks.popover.save',
                      defaultMessage: 'Save',
                    })}
                  </Button>
                </Flex>
              </Flex>
            ) : (
              <Flex direction="column" gap={4} alignItems="start" width="400px">
                <Typography>{elementText}</Typography>
                <Typography>
                  <StyledBaseLink href={elementAsLink.url} target="_blank" color="primary600">
                    {elementAsLink.url}
                  </StyledBaseLink>
                </Typography>
                <Flex justifyContent="end" width="100%" gap={2}>
                  <TooltipCustom
                    description={formatMessage({
                      id: 'components.Blocks.popover.delete',
                      defaultMessage: 'Delete',
                    })}
                  >
                    <CustomButton
                      size="S"
                      width="2rem"
                      variant="danger-light"
                      onClick={() => removeLink(editor)}
                      aria-label={formatMessage({
                        id: 'components.Blocks.popover.delete',
                        defaultMessage: 'Delete',
                      })}
                      type="button"
                      justifyContent="center"
                    >
                      <Icon width={3} height={3} as={Trash} />
                    </CustomButton>
                  </TooltipCustom>

                  <TooltipCustom
                    description={formatMessage({
                      id: 'components.Blocks.popover.edit',
                      defaultMessage: 'Edit',
                    })}
                  >
                    <CustomButton
                      size="S"
                      width="2rem"
                      variant="tertiary"
                      onClick={() => setIsEditing(true)}
                      aria-label={formatMessage({
                        id: 'components.Blocks.popover.edit',
                        defaultMessage: 'Edit',
                      })}
                      type="button"
                      justifyContent="center"
                    >
                      <Icon width={3} height={3} as={Pencil} />
                    </CustomButton>
                  </TooltipCustom>
                </Flex>
              </Flex>
            )}
          </Popover>
        )}
      </>
    );
  }
);

const linkBlocks: Pick<BlocksStore, 'link'> = {
  link: {
    renderElement: (props) => (
      <Link element={props.element} attributes={props.attributes}>
        {props.children}
      </Link>
    ),
    value: {
      type: 'link',
    },
    matchNode: (node) => node.type === 'link',
    isInBlocksSelector: false,
  },
};

export { linkBlocks };
