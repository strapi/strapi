import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Option,
  Button,
  Row,
  Box,
  Select,
  IconButtonGroup,
  Popover,
  FocusTrap,
} from '@strapi/parts';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  BulletList,
  NumberList,
  Code,
  Image,
  Link,
  Quote,
  More,
} from '@strapi/icons';
import { MainButtons, CustomIconButton, MoreButton, IconButtonGroupMargin } from './WysiwygStyles';

const WysiwygNav = ({
  placeholder,
  onActionClick,
  visiblePopover,
  onTogglePopover,
  isPreviewMode,
  onTogglePreviewMode,
  onToggleMediaLib,
  editorRef,
}) => {
  const buttonMoreRef = useRef();
  const handleEscapeMore = () => {
    onTogglePopover();
    buttonMoreRef.current.focus();
  };

  if (isPreviewMode) {
    return (
      <Box padding={2} background="neutral100">
        <Row justifyContent="space-between">
          <Row>
            <Select disabled id="selectTitle" placeholder={placeholder} size="S">
              <Option value="h1">h1</Option>
              <Option value="h2">h2</Option>
              <Option value="h3">h3</Option>
              <Option value="h4">h4</Option>
              <Option value="h5">h5</Option>
              <Option value="h6">h6</Option>
            </Select>

            <MainButtons>
              <CustomIconButton disabled id="Bold" label="Bold" name="Bold" icon={<Bold />} />
              <CustomIconButton
                disabled
                id="Italic"
                label="Italic"
                name="Italic"
                icon={<Italic />}
              />
              <CustomIconButton
                disabled
                id="Underline"
                label="Underline"
                name="Underline"
                icon={<Underline />}
              />
            </MainButtons>

            <MoreButton disabled ref={buttonMoreRef} id="more" label="more" icon={<More />} />
          </Row>

          <Button onClick={onTogglePreviewMode} variant="tertiary" size="L" id="preview">
            {/* to replace with format message */}
            Markdown mode
          </Button>
        </Row>
      </Box>
    );
  }

  return (
    <Box padding={2} background="neutral100">
      <Row justifyContent="space-between">
        <Row>
          <Select
            id="selectTitle"
            placeholder={placeholder}
            size="S"
            onChange={value => onActionClick(value, editorRef)}
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
              id="Bold"
              label="Bold"
              name="Bold"
              icon={<Bold />}
            />
            <CustomIconButton
              onClick={() => onActionClick('Italic', editorRef)}
              id="Italic"
              label="Italic"
              name="Italic"
              icon={<Italic />}
            />
            <CustomIconButton
              onClick={() => onActionClick('Underline', editorRef)}
              id="Underline"
              label="Underline"
              name="Underline"
              icon={<Underline />}
            />
          </MainButtons>

          <MoreButton
            ref={buttonMoreRef}
            onClick={onTogglePopover}
            id="more"
            label="more"
            icon={<More />}
          />
          {visiblePopover && (
            <Popover centered source={buttonMoreRef} spacingTop={1} id="popover">
              <FocusTrap onEscape={handleEscapeMore} restoreFocus={false}>
                <Row>
                  <IconButtonGroupMargin>
                    <CustomIconButton
                      onClick={() => onActionClick('Strikethrough', editorRef, onTogglePopover)}
                      id="Strikethrough"
                      label="Strikethrough"
                      name="Strikethrough"
                      icon={<Strikethrough />}
                    />
                    <CustomIconButton
                      onClick={() => onActionClick('BulletList', editorRef, onTogglePopover)}
                      id="BulletList"
                      label="BulletList"
                      name="BulletList"
                      icon={<BulletList />}
                    />
                    <CustomIconButton
                      onClick={() => onActionClick('NumberList', editorRef, onTogglePopover)}
                      id="NumberList"
                      label="NumberList"
                      name="NumberList"
                      icon={<NumberList />}
                    />
                  </IconButtonGroupMargin>
                  <IconButtonGroup>
                    <CustomIconButton
                      onClick={() => onActionClick('Code', editorRef, onTogglePopover)}
                      id="Code"
                      label="Code"
                      name="Code"
                      icon={<Code />}
                    />
                    <CustomIconButton
                      onClick={onToggleMediaLib}
                      id="Image"
                      label="Image"
                      name="Image"
                      icon={<Image />}
                    />
                    <CustomIconButton
                      onClick={() => onActionClick('Link', editorRef, onTogglePopover)}
                      id="Link"
                      label="Link"
                      name="Link"
                      icon={<Link />}
                    />
                    <CustomIconButton
                      onClick={() => onActionClick('Quote', editorRef, onTogglePopover)}
                      id="Quote"
                      label="Quote"
                      name="Quote"
                      icon={<Quote />}
                    />
                  </IconButtonGroup>
                </Row>
              </FocusTrap>
            </Popover>
          )}
        </Row>

        {onTogglePreviewMode && (
          <Button onClick={onTogglePreviewMode} variant="tertiary" size="L" id="preview">
            {/* to replace with format message */}
            Preview mode
          </Button>
        )}
      </Row>
    </Box>
  );
};

WysiwygNav.defaultProps = {
  placeholder: '',
  onActionClick: () => {},
  visiblePopover: false,
  onTogglePopover: () => {},
  isPreviewMode: false,
  onTogglePreviewMode: () => {},
  onToggleMediaLib: () => {},
};

WysiwygNav.propTypes = {
  placeholder: PropTypes.string,
  onActionClick: PropTypes.func,
  visiblePopover: PropTypes.bool,
  onTogglePopover: PropTypes.func,
  isPreviewMode: PropTypes.bool,
  onTogglePreviewMode: PropTypes.func,
  onToggleMediaLib: PropTypes.func,
  editorRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
};

export default WysiwygNav;
