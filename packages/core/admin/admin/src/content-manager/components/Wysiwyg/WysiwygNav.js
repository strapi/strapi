import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import {
  Button,
  Flex,
  FocusTrap,
  IconButtonGroup,
  Option,
  Popover,
  Select,
  Stack,
} from '@strapi/design-system';

import {
  Bold,
  BulletList,
  Code,
  Italic,
  Link,
  More,
  NumberList,
  Quote,
  Picture,
  StrikeThrough,
  Underline,
} from '@strapi/icons';

import { CustomIconButton, MoreButton } from './WysiwygStyles';

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

  const INTL_ID_PREFIX = 'components.Wysiwyg.action';

  const PRIMARY_ACTIONS = [
    {
      name: 'Bold',
      label: formatMessage({
        id: `${INTL_ID_PREFIX}.bold`,
        defaultMessage: 'Bold',
      }),
      icon: <Bold />,
    },

    {
      name: 'Italic',
      label: formatMessage({
        id: `${INTL_ID_PREFIX}.italic`,
        defaultMessage: 'Italic',
      }),
      icon: <Italic />,
    },

    {
      name: 'Underline',
      label: formatMessage({
        id: `${INTL_ID_PREFIX}.underline`,
        defaultMessage: 'Underline',
      }),
      icon: <Underline />,
    },
  ];

  const SECONDARY_ACTIONS = [
    {
      name: 'Strikethrough',
      label: formatMessage({
        id: `${INTL_ID_PREFIX}.strikethrough`,
        defaultMessage: 'Strikethrough',
      }),
      icon: <StrikeThrough />,
    },

    {
      name: 'BulletList',
      label: formatMessage({
        id: `${INTL_ID_PREFIX}.bulletlist`,
        defaultMessage: 'Bulletlist',
      }),
      icon: <BulletList />,
    },

    {
      name: 'NumberList',
      label: formatMessage({
        id: `${INTL_ID_PREFIX}.numberlist`,
        defaultMessage: 'Numberlist',
      }),
      icon: <NumberList />,
    },
  ];

  const TERTIARY_ACTIONS = [
    {
      name: 'Code',
      label: formatMessage({
        id: `${INTL_ID_PREFIX}.code`,
        defaultMessage: 'Code',
      }),
      icon: <Code />,
    },

    {
      name: 'Image',
      label: formatMessage({
        id: `${INTL_ID_PREFIX}.image`,
        defaultMessage: 'Image',
      }),
      icon: <Picture />,
      onClick() {
        handleTogglePopover();
        onToggleMediaLib();
      },
    },

    {
      name: 'Link',
      label: formatMessage({
        id: `${INTL_ID_PREFIX}.link`,
        defaultMessage: 'Link',
      }),
      // eslint-disable-next-line jsx-a11y/anchor-is-valid
      icon: <Link />,
    },

    {
      name: 'Quote',
      label: formatMessage({
        id: `${INTL_ID_PREFIX}.quote`,
        defaultMessage: 'Quote',
      }),
      icon: <Quote />,
    },
  ];

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
      <Flex justifyContent="space-between" padding={2} background="neutral100">
        <Flex>
          <Select disabled placeholder={selectPlaceholder} size="S" aria-label={selectPlaceholder}>
            <Option value="h1">h1</Option>
            <Option value="h2">h2</Option>
            <Option value="h3">h3</Option>
            <Option value="h4">h4</Option>
            <Option value="h5">h5</Option>
            <Option value="h6">h6</Option>
          </Select>

          <IconButtonGroup>
            {PRIMARY_ACTIONS.map((action) => (
              <CustomIconButton key={`wysiwyg-action-${action.name}`} {...action} disabled />
            ))}
          </IconButtonGroup>

          <MoreButton
            disabled
            label={formatMessage({
              id: `${INTL_ID_PREFIX}.more`,
              defaultMessage: 'More',
            })}
            icon={<More />}
          />
        </Flex>

        {!isExpandMode && (
          <Button onClick={onTogglePreviewMode} variant="tertiary" id="preview">
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
    <Flex justifyContent="space-between" padding={2} background="neutral100">
      <Stack horizontal spacing={4}>
        <Select
          placeholder={selectPlaceholder}
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

        <IconButtonGroup>
          {PRIMARY_ACTIONS.map((action) => (
            <CustomIconButton
              key={`wysiwyg-action-${action.name}`}
              onClick={() => onActionClick(action.name, editorRef)}
              {...action}
            />
          ))}
        </IconButtonGroup>

        <MoreButton
          ref={buttonMoreRef}
          onClick={handleTogglePopover}
          label={formatMessage({
            id: `${INTL_ID_PREFIX}.more`,
            defaultMessage: 'More',
          })}
          icon={<More />}
        />

        {visiblePopover && (
          <Popover centered source={buttonMoreRef} spacing={4}>
            <FocusTrap onEscape={handleTogglePopover} restoreFocus={false}>
              <Stack horizontal spacing={2}>
                <IconButtonGroup>
                  {SECONDARY_ACTIONS.map((action) => (
                    <CustomIconButton
                      key={`wysiwyg-action-${action.name}`}
                      onClick={() => onActionClick(action.name, editorRef)}
                      {...action}
                    />
                  ))}
                </IconButtonGroup>

                <IconButtonGroup>
                  {TERTIARY_ACTIONS.map((action) => (
                    <CustomIconButton
                      key={`wysiwyg-action-${action.name}`}
                      onClick={() => onActionClick(action.name, editorRef, handleTogglePopover)}
                      {...action}
                    />
                  ))}
                </IconButtonGroup>
              </Stack>
            </FocusTrap>
          </Popover>
        )}
      </Stack>

      {onTogglePreviewMode && (
        <Button onClick={onTogglePreviewMode} variant="tertiary" id="preview">
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
