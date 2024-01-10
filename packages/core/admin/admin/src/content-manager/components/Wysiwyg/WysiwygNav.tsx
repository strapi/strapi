import * as React from 'react';

import {
  Button,
  Flex,
  IconButtonGroup,
  SingleSelectOption,
  Popover,
  SingleSelect,
} from '@strapi/design-system';
import {
  Bold,
  BulletList,
  Code,
  Italic,
  Link,
  More,
  NumberList,
  Picture as Image,
  Quote,
  StrikeThrough,
  Underline,
} from '@strapi/icons';
import { EditorFromTextArea } from 'codemirror5';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

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
        borderRadius={`${4 / 16}rem ${4 / 16}rem 0 0`}
      >
        <StyledFlex>
          <SingleSelect disabled placeholder={selectPlaceholder} size="S" label={selectPlaceholder}>
            <SingleSelectOption value="h1">h1</SingleSelectOption>
            <SingleSelectOption value="h2">h2</SingleSelectOption>
            <SingleSelectOption value="h3">h3</SingleSelectOption>
            <SingleSelectOption value="h4">h4</SingleSelectOption>
            <SingleSelectOption value="h5">h5</SingleSelectOption>
            <SingleSelectOption value="h6">h6</SingleSelectOption>
          </SingleSelect>

          <MainButtons>
            <CustomIconButton disabled label="Bold" name="Bold" icon={<Bold />} />
            <CustomIconButton disabled label="Italic" name="Italic" icon={<Italic />} />
            <CustomIconButton disabled label="Underline" name="Underline" icon={<Underline />} />
          </MainButtons>

          <MoreButton disabled label="More" icon={<More />} />
        </StyledFlex>

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
      borderRadius={`${4 / 16}rem ${4 / 16}rem 0 0`}
    >
      <StyledFlex>
        <SingleSelect
          placeholder={selectPlaceholder}
          label={selectPlaceholder}
          size="S"
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

        <MainButtons>
          <CustomIconButton
            onClick={() => onActionClick('Bold', editorRef)}
            label="Bold"
            name="Bold"
            icon={<Bold />}
          />
          <CustomIconButton
            onClick={() => onActionClick('Italic', editorRef)}
            label="Italic"
            name="Italic"
            icon={<Italic />}
          />
          <CustomIconButton
            onClick={() => onActionClick('Underline', editorRef)}
            label="Underline"
            name="Underline"
            icon={<Underline />}
          />
        </MainButtons>

        <MoreButton
          ref={buttonMoreRef}
          onClick={handleTogglePopover}
          label="More"
          icon={<More />}
        />
        {visiblePopover && (
          <Popover onDismiss={handleTogglePopover} centered source={buttonMoreRef} spacing={4}>
            <Flex>
              <IconButtonGroupMargin>
                <CustomIconButton
                  onClick={() => onActionClick('Strikethrough', editorRef, handleTogglePopover)}
                  label="Strikethrough"
                  name="Strikethrough"
                  icon={<StrikeThrough />}
                />
                <CustomIconButton
                  onClick={() => onActionClick('BulletList', editorRef, handleTogglePopover)}
                  label="BulletList"
                  name="BulletList"
                  icon={<BulletList />}
                />
                <CustomIconButton
                  onClick={() => onActionClick('NumberList', editorRef, handleTogglePopover)}
                  label="NumberList"
                  name="NumberList"
                  icon={<NumberList />}
                />
              </IconButtonGroupMargin>
              <IconButtonGroup>
                <CustomIconButton
                  onClick={() => onActionClick('Code', editorRef, handleTogglePopover)}
                  label="Code"
                  name="Code"
                  icon={<Code />}
                />
                <CustomIconButton
                  onClick={() => {
                    handleTogglePopover();
                    onToggleMediaLib();
                  }}
                  label="Image"
                  name="Image"
                  icon={<Image />}
                />
                <CustomLinkIconButton
                  onClick={() => onActionClick('Link', editorRef, handleTogglePopover)}
                  label="Link"
                  name="Link"
                  // eslint-disable-next-line jsx-a11y/anchor-is-valid
                  icon={<Link />}
                />
                <CustomIconButton
                  onClick={() => onActionClick('Quote', editorRef, handleTogglePopover)}
                  label="Quote"
                  name="Quote"
                  icon={<Quote />}
                />
              </IconButtonGroup>
            </Flex>
          </Popover>
        )}
      </StyledFlex>

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

const StyledFlex = styled(Flex)`
  /* Hide the label, every input needs a label. */
  label {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
`;
