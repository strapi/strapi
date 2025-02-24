import * as React from 'react';

import {
  Button,
  Flex,
  IconButton,
  IconButtonGroup,
  SingleSelectOption,
  SingleSelect,
  Field,
  Menu,
} from '@strapi/design-system';
import {
  Bold,
  BulletList,
  Code,
  Italic,
  Link,
  NumberList,
  Image,
  Quotes,
  StrikeThrough,
  Underline,
  HeadingOne,
  HeadingTwo,
  HeadingThree,
  HeadingFour,
  HeadingFive,
  HeadingSix,
} from '@strapi/icons';
import { EditorFromTextArea } from 'codemirror5';
import { useIntl } from 'react-intl';

import { EditorToolbarObserver, type ObservedComponent } from '../../EditorToolbarObserver';

import { listHandler, markdownHandler, quoteAndCodeHandler, titleHandler } from './utils/utils';

interface WysiwygNavProps {
  disabled?: boolean;
  editorRef: React.MutableRefObject<EditorFromTextArea>;
  isExpandMode?: boolean;
  isPreviewMode?: boolean;
  onToggleMediaLib: () => void;
  onTogglePreviewMode?: () => void;
}

/**
 * TODO: refactor this mess.
 */
const WysiwygNav = ({
  disabled,
  editorRef,
  isPreviewMode,
  onToggleMediaLib,
  onTogglePreviewMode,
}: WysiwygNavProps) => {
  const { formatMessage } = useIntl();
  const isDisabled = disabled || isPreviewMode;

  const handleActionClick = (
    value: string,
    currentEditorRef: React.MutableRefObject<EditorFromTextArea>
  ) => {
    switch (value) {
      case 'Link': {
        markdownHandler(currentEditorRef, value);
        break;
      }
      case 'Code':
      case 'Quote': {
        quoteAndCodeHandler(currentEditorRef, value);
        break;
      }
      case 'Bold':
      case 'Italic':
      case 'Underline':
      case 'Strikethrough': {
        markdownHandler(currentEditorRef, value);
        break;
      }
      case 'BulletList':
      case 'NumberList': {
        listHandler(currentEditorRef, value);
        break;
      }
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        titleHandler(currentEditorRef, value);
        break;
      }
      default: {
        // Nothing
      }
    }
  };

  const observedComponents: ObservedComponent[] = [
    {
      toolbar: (
        <IconButtonGroup>
          <IconButton
            disabled={isDisabled}
            onClick={() => handleActionClick('Bold', editorRef)}
            label={formatMessage({
              id: 'components.Blocks.modifiers.bold',
              defaultMessage: 'Bold',
            })}
            name={formatMessage({
              id: 'components.Blocks.modifiers.bold',
              defaultMessage: 'Bold',
            })}
          >
            <Bold />
          </IconButton>
          <IconButton
            disabled={isDisabled}
            onClick={() => handleActionClick('Italic', editorRef)}
            label={formatMessage({
              id: 'components.Blocks.modifiers.italic',
              defaultMessage: 'Italic',
            })}
            name={formatMessage({
              id: 'components.Blocks.modifiers.italic',
              defaultMessage: 'Italic',
            })}
          >
            <Italic />
          </IconButton>
          <IconButton
            disabled={isDisabled}
            onClick={() => handleActionClick('Underline', editorRef)}
            label={formatMessage({
              id: 'components.Blocks.modifiers.underline',
              defaultMessage: 'Underline',
            })}
            name={formatMessage({
              id: 'components.Blocks.modifiers.underline',
              defaultMessage: 'Underline',
            })}
          >
            <Underline />
          </IconButton>
          <IconButton
            disabled={isDisabled}
            onClick={() => handleActionClick('Strikethrough', editorRef)}
            label={formatMessage({
              id: 'components.Blocks.modifiers.strikethrough',
              defaultMessage: 'Strikethrough',
            })}
            name={formatMessage({
              id: 'components.Blocks.modifiers.strikethrough',
              defaultMessage: 'Strikethrough',
            })}
          >
            <StrikeThrough />
          </IconButton>
        </IconButtonGroup>
      ),
      menu: (
        <>
          <Menu.Separator />
          <Menu.Item onSelect={() => handleActionClick('Bold', editorRef)} disabled={isDisabled}>
            <Flex tag="span" gap={2}>
              <Bold aria-hidden fill="neutral600" />
              {formatMessage({
                id: 'components.Blocks.modifiers.bold',
                defaultMessage: 'Bold',
              })}
            </Flex>
          </Menu.Item>
          <Menu.Item onSelect={() => handleActionClick('Italic', editorRef)} disabled={isDisabled}>
            <Flex tag="span" gap={2}>
              <Italic aria-hidden fill="neutral600" />
              {formatMessage({
                id: 'components.Blocks.modifiers.italic',
                defaultMessage: 'Italic',
              })}
            </Flex>
          </Menu.Item>
          <Menu.Item
            onSelect={() => handleActionClick('Underline', editorRef)}
            disabled={isDisabled}
          >
            <Flex tag="span" gap={2}>
              <Underline aria-hidden fill="neutral600" />
              {formatMessage({
                id: 'components.Blocks.modifiers.underline',
                defaultMessage: 'Underline',
              })}
            </Flex>
          </Menu.Item>
          <Menu.Item
            onSelect={() => handleActionClick('Strikethrough', editorRef)}
            disabled={isDisabled}
          >
            <Flex tag="span" gap={2}>
              <StrikeThrough aria-hidden fill="neutral600" />
              {formatMessage({
                id: 'components.Blocks.modifiers.strikethrough',
                defaultMessage: 'Strikethrough',
              })}
            </Flex>
          </Menu.Item>
        </>
      ),
      key: 'formatting-group-1',
    },
    {
      toolbar: (
        <IconButtonGroup>
          <IconButton
            disabled={isDisabled}
            onClick={() => handleActionClick('BulletList', editorRef)}
            label={formatMessage({
              id: 'components.Blocks.blocks.bulletList',
              defaultMessage: 'Bulleted list',
            })}
            name={formatMessage({
              id: 'components.Blocks.blocks.bulletList',
              defaultMessage: 'Bulleted list',
            })}
          >
            <BulletList />
          </IconButton>
          <IconButton
            disabled={isDisabled}
            onClick={() => handleActionClick('NumberList', editorRef)}
            label={formatMessage({
              id: 'components.Blocks.blocks.numberList',
              defaultMessage: 'Numbered list',
            })}
            name={formatMessage({
              id: 'components.Blocks.blocks.numberList',
              defaultMessage: 'Numbered list',
            })}
          >
            <NumberList />
          </IconButton>
        </IconButtonGroup>
      ),
      menu: (
        <>
          <Menu.Separator />
          <Menu.Item
            onSelect={() => handleActionClick('BulletList', editorRef)}
            disabled={isDisabled}
          >
            <Flex tag="span" gap={2}>
              <BulletList aria-hidden fill="neutral600" />
              {formatMessage({
                id: 'components.Blocks.blocks.unorderedList',
                defaultMessage: 'Bulleted list',
              })}
            </Flex>
          </Menu.Item>
          <Menu.Item
            onSelect={() => handleActionClick('NumberList', editorRef)}
            disabled={isDisabled}
          >
            <Flex tag="span" gap={2}>
              <NumberList aria-hidden fill="neutral600" />
              {formatMessage({
                id: 'components.Blocks.blocks.orderedList',
                defaultMessage: 'Numbered list',
              })}
            </Flex>
          </Menu.Item>
        </>
      ),
      key: 'formatting-group-2',
    },
    {
      toolbar: (
        <IconButtonGroup>
          <IconButton
            disabled={isDisabled}
            onClick={() => handleActionClick('Code', editorRef)}
            label={formatMessage({
              id: 'components.Wysiwyg.blocks.code',
              defaultMessage: 'Code',
            })}
            name={formatMessage({
              id: 'components.Wysiwyg.blocks.code',
              defaultMessage: 'Code',
            })}
          >
            <Code />
          </IconButton>
          <IconButton
            disabled={isDisabled}
            onClick={() => {
              onToggleMediaLib();
            }}
            label={formatMessage({
              id: 'components.Blocks.blocks.image',
              defaultMessage: 'Image',
            })}
            name={formatMessage({
              id: 'components.Blocks.blocks.image',
              defaultMessage: 'Image',
            })}
          >
            <Image />
          </IconButton>
          <IconButton
            disabled={isDisabled}
            onClick={() => handleActionClick('Link', editorRef)}
            label={formatMessage({
              id: 'components.Blocks.popover.link',
              defaultMessage: 'Link',
            })}
            name={formatMessage({
              id: 'components.Blocks.popover.link',
              defaultMessage: 'Link',
            })}
          >
            <Link />
          </IconButton>
          <IconButton
            disabled={isDisabled}
            onClick={() => handleActionClick('Quote', editorRef)}
            label={formatMessage({
              id: 'components.Blocks.blocks.quote',
              defaultMessage: 'Quote',
            })}
            name={formatMessage({
              id: 'components.Blocks.blocks.quote',
              defaultMessage: 'Quote',
            })}
          >
            <Quotes />
          </IconButton>
        </IconButtonGroup>
      ),
      menu: (
        <>
          <Menu.Separator />
          <Menu.Item onSelect={() => handleActionClick('Code', editorRef)} disabled={isDisabled}>
            <Flex tag="span" gap={2}>
              <Code aria-hidden fill="neutral600" />
              {formatMessage({
                id: 'components.Wysiwyg.blocks.code',
                defaultMessage: 'Code',
              })}
            </Flex>
          </Menu.Item>
          <Menu.Item
            startIcon={<Image />}
            onSelect={() => {
              onToggleMediaLib();
            }}
            disabled={isDisabled}
          >
            <Flex tag="span" gap={2}>
              <Image aria-hidden fill="neutral600" />
              {formatMessage({
                id: 'components.Blocks.blocks.image',
                defaultMessage: 'Image',
              })}
            </Flex>
          </Menu.Item>
          <Menu.Item
            startIcon={<Link />}
            onSelect={() => handleActionClick('Link', editorRef)}
            disabled={isDisabled}
          >
            <Flex tag="span" gap={2}>
              <Link aria-hidden fill="neutral600" />
              {formatMessage({
                id: 'components.Blocks.popover.link',
                defaultMessage: 'Link',
              })}
            </Flex>
          </Menu.Item>
          <Menu.Item onSelect={() => handleActionClick('Quote', editorRef)} disabled={isDisabled}>
            <Flex tag="span" gap={2}>
              <Quotes aria-hidden fill="neutral600" />
              {formatMessage({
                id: 'components.Blocks.blocks.quote',
                defaultMessage: 'Quote',
              })}
            </Flex>
          </Menu.Item>
        </>
      ),
      key: 'formatting-group-3',
    },
  ];

  return (
    <Flex
      padding={2}
      background="neutral100"
      justifyContent="space-between"
      borderRadius="0.4rem 0.4rem 0 0"
      width="100%"
      gap={4}
    >
      <Field.Root>
        <SingleSelect
          disabled={isDisabled}
          placeholder={formatMessage({
            id: 'components.Wysiwyg.selectOptions.title',
            defaultMessage: 'Headings',
          })}
          aria-label={formatMessage({
            id: 'components.Wysiwyg.selectOptions.title',
            defaultMessage: 'Headings',
          })}
          // @ts-expect-error – DS v2 will only allow strings.
          onChange={(value) => handleActionClick(value, editorRef)}
          size="S"
        >
          <SingleSelectOption value="h1" startIcon={<HeadingOne fill="neutral600" />}>
            {formatMessage({
              id: 'components.Wysiwyg.selectOptions.H1',
              defaultMessage: 'Heading 1',
            })}
          </SingleSelectOption>
          <SingleSelectOption value="h2" startIcon={<HeadingTwo fill="neutral600" />}>
            {formatMessage({
              id: 'components.Wysiwyg.selectOptions.H2',
              defaultMessage: 'Heading 2',
            })}
          </SingleSelectOption>
          <SingleSelectOption value="h3" startIcon={<HeadingThree fill="neutral600" />}>
            {formatMessage({
              id: 'components.Wysiwyg.selectOptions.H3',
              defaultMessage: 'Heading 3',
            })}
          </SingleSelectOption>
          <SingleSelectOption value="h4" startIcon={<HeadingFour fill="neutral600" />}>
            {formatMessage({
              id: 'components.Wysiwyg.selectOptions.H4',
              defaultMessage: 'Heading 4',
            })}
          </SingleSelectOption>
          <SingleSelectOption value="h5" startIcon={<HeadingFive fill="neutral600" />}>
            {formatMessage({
              id: 'components.Wysiwyg.selectOptions.H5',
              defaultMessage: 'Heading 5',
            })}
          </SingleSelectOption>
          <SingleSelectOption value="h6" startIcon={<HeadingSix fill="neutral600" />}>
            {formatMessage({
              id: 'components.Wysiwyg.selectOptions.H6',
              defaultMessage: 'Heading 6',
            })}
          </SingleSelectOption>
        </SingleSelect>
      </Field.Root>
      <Flex width="100%" justifyContent="space-between" overflow="hidden">
        <Flex gap={2} overflow="hidden" width="100%">
          <EditorToolbarObserver
            menuTriggerVariant="tertiary"
            observedComponents={observedComponents}
          />
        </Flex>

        {onTogglePreviewMode && (
          <Button onClick={onTogglePreviewMode} variant="tertiary" minWidth="132px">
            {isPreviewMode
              ? formatMessage({
                  id: 'components.Wysiwyg.ToggleMode.markdown-mode',
                  defaultMessage: 'Markdown mode',
                })
              : formatMessage({
                  id: 'components.Wysiwyg.ToggleMode.preview-mode',
                  defaultMessage: 'Preview mode',
                })}
          </Button>
        )}
      </Flex>
    </Flex>
  );
};

export { WysiwygNav };
export type { WysiwygNavProps };
