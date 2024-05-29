import * as React from 'react';

import {
  Button,
  Flex,
  IconButtonGroup,
  SingleSelectOption,
  Popover,
  SingleSelect,
  Field,
} from '@strapi/design-system';
import {
  Bold,
  BulletList,
  Code,
  Italic,
  Link,
  More,
  NumberList,
  Image,
  Quotes,
  StrikeThrough,
  Underline,
} from '@strapi/icons';
import { EditorFromTextArea } from 'codemirror5';
import { useIntl } from 'react-intl';

import {
  CustomIconButton,
  CustomLinkIconButton,
  IconButtonGroupMargin,
  MainButtons,
  MoreButton,
} from './WysiwygStyles';

interface WysiwygNavProps {
  disabled?: boolean;
  editorRef: React.MutableRefObject<EditorFromTextArea>;
  isExpandMode?: boolean;
  isPreviewMode?: boolean;
  onActionClick: (
    action: string,
    editorRef: React.MutableRefObject<EditorFromTextArea>,
    callback?: () => void
  ) => void;
  onToggleMediaLib: () => void;
  onTogglePreviewMode?: () => void;
}

/**
 * TODO: refactor this mess.
 */
const WysiwygNav = ({
  disabled,
  editorRef,
  isExpandMode,
  isPreviewMode,
  onActionClick,
  onToggleMediaLib,
  onTogglePreviewMode,
}: WysiwygNavProps) => {
  const [visiblePopover, setVisiblePopover] = React.useState(false);
  const { formatMessage } = useIntl();
  const selectPlaceholder = formatMessage({
    id: 'components.Wysiwyg.selectOptions.title',
    defaultMessage: 'Add a title',
  });
  const buttonMoreRef = React.useRef<HTMLButtonElement>(null!);

  const handleTogglePopover = () => {
    setVisiblePopover((prev) => !prev);
  };

  if (disabled || isPreviewMode) {
    return (
      <Flex
        padding={2}
        background="neutral100"
        justifyContent="space-between"
        borderRadius={`0.4rem 0.4rem 0 0`}
      >
        <Flex>
          <Field.Root>
            <SingleSelect disabled placeholder={selectPlaceholder} aria-label={selectPlaceholder}>
              <SingleSelectOption value="h1">h1</SingleSelectOption>
              <SingleSelectOption value="h2">h2</SingleSelectOption>
              <SingleSelectOption value="h3">h3</SingleSelectOption>
              <SingleSelectOption value="h4">h4</SingleSelectOption>
              <SingleSelectOption value="h5">h5</SingleSelectOption>
              <SingleSelectOption value="h6">h6</SingleSelectOption>
            </SingleSelect>
          </Field.Root>

          <MainButtons>
            <CustomIconButton disabled label="Bold" name="Bold">
              <Bold />
            </CustomIconButton>
            <CustomIconButton disabled label="Italic" name="Italic">
              <Italic />
            </CustomIconButton>
            <CustomIconButton disabled label="Underline" name="Underline">
              <Underline />
            </CustomIconButton>
          </MainButtons>

          <MoreButton disabled label="More">
            <More />
          </MoreButton>
        </Flex>

        {!isExpandMode && (
          <Button onClick={onTogglePreviewMode} variant="tertiary">
            {formatMessage({
              id: 'components.Wysiwyg.ToggleMode.markdown-mode',
              defaultMessage: 'Markdown mode',
            })}
          </Button>
        )}
      </Flex>
    );
  }

  return (
    <Flex
      padding={2}
      background="neutral100"
      justifyContent="space-between"
      borderRadius={`0.4rem 0.4rem 0 0`}
    >
      <Flex>
        <Field.Root>
          <SingleSelect
            placeholder={selectPlaceholder}
            aria-label={selectPlaceholder}
            // @ts-expect-error – DS v2 will only allow strings.
            onChange={(value) => onActionClick(value, editorRef)}
          >
            <SingleSelectOption value="h1">h1</SingleSelectOption>
            <SingleSelectOption value="h2">h2</SingleSelectOption>
            <SingleSelectOption value="h3">h3</SingleSelectOption>
            <SingleSelectOption value="h4">h4</SingleSelectOption>
            <SingleSelectOption value="h5">h5</SingleSelectOption>
            <SingleSelectOption value="h6">h6</SingleSelectOption>
          </SingleSelect>
        </Field.Root>

        <MainButtons>
          <CustomIconButton
            onClick={() => onActionClick('Bold', editorRef)}
            label="Bold"
            name="Bold"
          >
            <Bold />
          </CustomIconButton>
          <CustomIconButton
            onClick={() => onActionClick('Italic', editorRef)}
            label="Italic"
            name="Italic"
          >
            <Italic />
          </CustomIconButton>
          <CustomIconButton
            onClick={() => onActionClick('Underline', editorRef)}
            label="Underline"
            name="Underline"
          >
            <Underline />
          </CustomIconButton>
        </MainButtons>

        <MoreButton ref={buttonMoreRef} onClick={handleTogglePopover} label="More">
          <More />
        </MoreButton>
        {visiblePopover && (
          <Popover onDismiss={handleTogglePopover} centered source={buttonMoreRef} spacing={4}>
            <Flex>
              <IconButtonGroupMargin>
                <CustomIconButton
                  onClick={() => onActionClick('Strikethrough', editorRef, handleTogglePopover)}
                  label="Strikethrough"
                  name="Strikethrough"
                >
                  <StrikeThrough />
                </CustomIconButton>
                <CustomIconButton
                  onClick={() => onActionClick('BulletList', editorRef, handleTogglePopover)}
                  label="BulletList"
                  name="BulletList"
                >
                  <BulletList />
                </CustomIconButton>
                <CustomIconButton
                  onClick={() => onActionClick('NumberList', editorRef, handleTogglePopover)}
                  label="NumberList"
                  name="NumberList"
                >
                  <NumberList />
                </CustomIconButton>
              </IconButtonGroupMargin>
              <IconButtonGroup>
                <CustomIconButton
                  onClick={() => onActionClick('Code', editorRef, handleTogglePopover)}
                  label="Code"
                  name="Code"
                >
                  <Code />
                </CustomIconButton>
                <CustomIconButton
                  onClick={() => {
                    handleTogglePopover();
                    onToggleMediaLib();
                  }}
                  label="Image"
                  name="Image"
                >
                  <Image />
                </CustomIconButton>
                <CustomLinkIconButton
                  onClick={() => onActionClick('Link', editorRef, handleTogglePopover)}
                  label="Link"
                  name="Link"
                >
                  <Link />
                </CustomLinkIconButton>
                <CustomIconButton
                  onClick={() => onActionClick('Quote', editorRef, handleTogglePopover)}
                  label="Quote"
                  name="Quote"
                >
                  <Quotes />
                </CustomIconButton>
              </IconButtonGroup>
            </Flex>
          </Popover>
        )}
      </Flex>

      {onTogglePreviewMode && (
        <Button onClick={onTogglePreviewMode} variant="tertiary">
          {formatMessage({
            id: 'components.Wysiwyg.ToggleMode.preview-mode',
            defaultMessage: 'Preview mode',
          })}
        </Button>
      )}
    </Flex>
  );
};

export { WysiwygNav };
export type { WysiwygNavProps };
