import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/parts/Box';
import { Button } from '@strapi/parts/Button';
import { IconButtonGroup } from '@strapi/parts/IconButton';
import { Option, Select } from '@strapi/parts/Select';
import { Popover } from '@strapi/parts/Popover';
import { Row } from '@strapi/parts/Row';
import Bold from '@strapi/icons/Bold';
import Italic from '@strapi/icons/Italic';
import Underline from '@strapi/icons/Underline';
import Strikethrough from '@strapi/icons/Strikethrough';
import BulletList from '@strapi/icons/BulletList';
import NumberList from '@strapi/icons/NumberList';
import Code from '@strapi/icons/Code';
import Image from '@strapi/icons/Image';
import Link from '@strapi/icons/Link';
import Quote from '@strapi/icons/Quote';
import More from '@strapi/icons/More';
import { MainButtons, CustomIconButton, MoreButton, IconButtonGroupMargin } from './WysiwygStyles';

const WysiwygNav = ({
  editorRef,
  isPreviewMode,
  onActionClick,
  onToggleMediaLib,
  onTogglePopover,
  onTogglePreviewMode,
  noPreviewMode,
  visiblePopover,
}) => {
  const { formatMessage } = useIntl();
  const selectPlaceholder = formatMessage({
    id: 'components.Wysiwyg.selectOptions.title',
    defaultMessage: 'Add a title',
  });
  const buttonMoreRef = useRef();

  if (isPreviewMode) {
    return (
      <Box padding={2} background="neutral100">
        <Row justifyContent="space-between">
          <Row>
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

            <MoreButton disabled ref={buttonMoreRef} id="more" label="more" icon={<More />} />
          </Row>

          <Button onClick={onTogglePreviewMode} variant="tertiary" size="L" id="preview">
            {formatMessage({
              id: 'components.Wysiwyg.ToggleMode.markdown-mode',
              defaultMessage: 'Markdown mode',
            })}
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
            onClick={onTogglePopover}
            id="more"
            label="more"
            icon={<More />}
          />
          {visiblePopover && (
            <Popover centered source={buttonMoreRef} spacing={4} id="popover">
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
                    // eslint-disable-next-line jsx-a11y/anchor-is-valid
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
            </Popover>
          )}
        </Row>

        {!noPreviewMode && onTogglePreviewMode && (
          <Button onClick={onTogglePreviewMode} variant="tertiary" size="L" id="preview">
            {formatMessage({
              id: 'components.Wysiwyg.ToggleMode.preview-mode',
              defaultMessage: 'Preview mode',
            })}
          </Button>
        )}
      </Row>
    </Box>
  );
};

WysiwygNav.defaultProps = {
  isPreviewMode: false,
  onActionClick: () => {},
  onToggleMediaLib: () => {},
  onTogglePopover: () => {},
  onTogglePreviewMode: () => {},
  noPreviewMode: false,
  visiblePopover: false,
};

WysiwygNav.propTypes = {
  editorRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  isPreviewMode: PropTypes.bool,
  onActionClick: PropTypes.func,
  onToggleMediaLib: PropTypes.func,
  onTogglePopover: PropTypes.func,
  onTogglePreviewMode: PropTypes.func,
  visiblePopover: PropTypes.bool,
  noPreviewMode: PropTypes.bool,
};

export default WysiwygNav;
