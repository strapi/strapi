import React, { useRef, useState } from 'react';

import { Button, Flex, IconButtonGroup, Option, Popover, Select } from '@strapi/design-system';
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
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import {
  CustomIconButton,
  CustomLinkIconButton,
  IconButtonGroupMargin,
  MainButtons,
  MoreButton,
} from './WysiwygStyles';

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
}) => {
  const [visiblePopover, setVisiblePopover] = useState(false);
  const { formatMessage } = useIntl();
  const selectPlaceholder = formatMessage({
    id: 'components.Wysiwyg.selectOptions.title',
    defaultMessage: 'Add a title',
  });
  const buttonMoreRef = useRef();

  const handleTogglePopover = () => {
    setVisiblePopover((prev) => !prev);
  };

  if (disabled || isPreviewMode) {
    return (
      <Flex padding={2} background="neutral100" justifyContent="space-between">
        <StyledFlex>
          <Select disabled placeholder={selectPlaceholder} size="S" label={selectPlaceholder}>
            <Option value="h1">h1</Option>
            <Option value="h2">h2</Option>
            <Option value="h3">h3</Option>
            <Option value="h4">h4</Option>
            <Option value="h5">h5</Option>
            <Option value="h6">h6</Option>
          </Select>

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
    <Flex padding={2} background="neutral100" justifyContent="space-between">
      <StyledFlex>
        <Select
          placeholder={selectPlaceholder}
          label={selectPlaceholder}
          size="S"
          onChange={(value) => onActionClick(value, editorRef)}
        >
          <Option value="h1">h1</Option>
          <Option value="h2">h2</Option>
          <Option value="h3">h3</Option>
          <Option value="h4">h4</Option>
          <Option value="h5">h5</Option>
          <Option value="h6">h6</Option>
        </Select>

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

WysiwygNav.defaultProps = {
  isPreviewMode: false,
  onActionClick() {},
  onToggleMediaLib() {},
  onTogglePreviewMode: undefined,
};

WysiwygNav.propTypes = {
  disabled: PropTypes.bool.isRequired,
  editorRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  isExpandMode: PropTypes.bool.isRequired,
  isPreviewMode: PropTypes.bool,
  onActionClick: PropTypes.func,
  onToggleMediaLib: PropTypes.func,
  onTogglePreviewMode: PropTypes.func,
};

export default WysiwygNav;

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
