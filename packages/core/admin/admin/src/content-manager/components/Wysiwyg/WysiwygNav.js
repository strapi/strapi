import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { IconButtonGroup } from '@strapi/design-system/IconButton';
import { Option, Select } from '@strapi/design-system/Select';
import { Popover } from '@strapi/design-system/Popover';
import { Flex } from '@strapi/design-system/Flex';
import Bold from '@strapi/icons/Bold';
import Italic from '@strapi/icons/Italic';
import Underline from '@strapi/icons/Underline';
import Strikethrough from '@strapi/icons/Strikethrough';
import BulletList from '@strapi/icons/BulletList';
import NumberList from '@strapi/icons/NumberList';
import Code from '@strapi/icons/Code';
import Image from '@strapi/icons/Picture';
import Link from '@strapi/icons/Link';
import Quote from '@strapi/icons/Quote';
import More from '@strapi/icons/More';
import {
  MainButtons,
  CustomIconButton,
  MoreButton,
  IconButtonGroupMargin,
  CustomLinkIconButton,
} from './WysiwygStyles';

const WysiwygNav = ({
  editorRef,
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
    setVisiblePopover(prev => !prev);
  };

  if (isPreviewMode) {
    return (
      <Box padding={2} background="neutral100">
        <Flex justifyContent="space-between">
          <Flex>
            <Select
              disabled
              id="selectTitle"
              placeholder={selectPlaceholder}
              size="S"
              aria-label={selectPlaceholder}
            >
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

            <MoreButton disabled id="more" label="More" icon={<More />} />
          </Flex>

          <Button onClick={onTogglePreviewMode} variant="tertiary" id="preview">
            {formatMessage({
              id: 'components.Wysiwyg.ToggleMode.markdown-mode',
              defaultMessage: 'Markdown mode',
            })}
          </Button>
        </Flex>
      </Box>
    );
  }

  return (
    <Box padding={2} background="neutral100">
      <Flex justifyContent="space-between">
        <Flex>
          <Select
            id="selectTitle"
            placeholder={selectPlaceholder}
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
            onClick={handleTogglePopover}
            id="more"
            label="More"
            icon={<More />}
          />
          {visiblePopover && (
            <Popover centered source={buttonMoreRef} spacing={4} id="popover">
              <FocusTrap onEscape={handleTogglePopover}>
                <Flex>
                  <IconButtonGroupMargin>
                    <CustomIconButton
                      onClick={() => onActionClick('Strikethrough', editorRef, handleTogglePopover)}
                      id="Strikethrough"
                      label="Strikethrough"
                      name="Strikethrough"
                      icon={<Strikethrough />}
                    />
                    <CustomIconButton
                      onClick={() => onActionClick('BulletList', editorRef, handleTogglePopover)}
                      id="BulletList"
                      label="BulletList"
                      name="BulletList"
                      icon={<BulletList />}
                    />
                    <CustomIconButton
                      onClick={() => onActionClick('NumberList', editorRef, handleTogglePopover)}
                      id="NumberList"
                      label="NumberList"
                      name="NumberList"
                      icon={<NumberList />}
                    />
                  </IconButtonGroupMargin>
                  <IconButtonGroup>
                    <CustomIconButton
                      onClick={() => onActionClick('Code', editorRef, handleTogglePopover)}
                      id="Code"
                      label="Code"
                      name="Code"
                      icon={<Code />}
                    />
                    <CustomIconButton
                      onClick={() => {
                        handleTogglePopover();
                        onToggleMediaLib();
                      }}
                      id="Image"
                      label="Image"
                      name="Image"
                      icon={<Image />}
                    />
                    <CustomLinkIconButton
                      onClick={() => onActionClick('Link', editorRef, handleTogglePopover)}
                      id="Link"
                      label="Link"
                      name="Link"
                      // eslint-disable-next-line jsx-a11y/anchor-is-valid
                      icon={<Link />}
                    />
                    <CustomIconButton
                      onClick={() => onActionClick('Quote', editorRef, handleTogglePopover)}
                      id="Quote"
                      label="Quote"
                      name="Quote"
                      icon={<Quote />}
                    />
                  </IconButtonGroup>
                </Flex>
              </FocusTrap>
            </Popover>
          )}
        </Flex>

        {onTogglePreviewMode && (
          <Button onClick={onTogglePreviewMode} variant="tertiary" id="preview">
            {formatMessage({
              id: 'components.Wysiwyg.ToggleMode.preview-mode',
              defaultMessage: 'Preview mode',
            })}
          </Button>
        )}
      </Flex>
    </Box>
  );
};

WysiwygNav.defaultProps = {
  isPreviewMode: false,
  onActionClick: () => {},
  onToggleMediaLib: () => {},
  onTogglePreviewMode: undefined,
};

WysiwygNav.propTypes = {
  editorRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  isPreviewMode: PropTypes.bool,
  onActionClick: PropTypes.func,
  onToggleMediaLib: PropTypes.func,
  onTogglePreviewMode: PropTypes.func,
};

export default WysiwygNav;
