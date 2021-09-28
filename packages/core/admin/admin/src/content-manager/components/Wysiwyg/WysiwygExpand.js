import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { FocusTrap } from '@strapi/parts/FocusTrap';
import { Portal } from '@strapi/parts/Portal';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import Collapse from '@strapi/icons/Collapse';
import PreviewWysiwyg from '../PreviewWysiwyg';
import Editor from './Editor';
import WysiwygNav from './WysiwygNav';
import MediaLibrary from './MediaLibrary';
import {
  ExpandButton,
  ExpandWrapper,
  ExpandContainer,
  PreviewWrapper,
  WysiwygContainer,
  PreviewHeader,
  PreviewContainer,
} from './WysiwygStyles';

const WysiwygExpand = ({
  disabled,
  editorRef,
  name,
  onActionClick,
  onChange,
  onSubmitImage,
  onToggleExpand,
  placeholder,
  textareaRef,
  value,
}) => {
  const { formatMessage } = useIntl();
  const [visiblePopover, setVisiblePopover] = useState(false);
  const [mediaLibVisible, setMediaLibVisible] = useState(false);

  useEffect(() => {
    const body = document.body;
    body.classList.add('lock-body-scroll');

    return () => {
      body.classList.remove('lock-body-scroll');
    };
  }, []);

  const handleTogglePopover = () => setVisiblePopover(prev => !prev);
  const handleToggleMediaLib = () => setMediaLibVisible(prev => !prev);

  return (
    <>
      <Portal role="dialog" aria-modal={false}>
        <FocusTrap onEscape={() => onToggleExpand('collapse')}>
          <ExpandWrapper id="wysiwyg-expand">
            <ExpandContainer background="neutral0" hasRadius shadow="popupShadow">
              <WysiwygContainer>
                <WysiwygNav
                  noPreviewMode
                  editorRef={editorRef}
                  onActionClick={onActionClick}
                  onToggleMediaLib={handleToggleMediaLib}
                  onTogglePopover={handleTogglePopover}
                  visiblePopover={visiblePopover}
                />
                <Editor
                  disabled={disabled}
                  editorRef={editorRef}
                  name={name}
                  onChange={onChange}
                  placeholder={placeholder}
                  textareaRef={textareaRef}
                  value={value}
                />
              </WysiwygContainer>
              <PreviewWrapper>
                <PreviewHeader padding={2} background="neutral100">
                  <Row justifyContent="flex-end" alignItems="flex-end">
                    <ExpandButton id="collapse" onClick={() => onToggleExpand('collapse')}>
                      <Text>
                        {formatMessage({
                          id: 'components.Wysiwyg.collapse',
                          defaultMessage: 'Collapse',
                        })}
                      </Text>
                      <Collapse />
                    </ExpandButton>
                  </Row>
                </PreviewHeader>
                <PreviewContainer>
                  <PreviewWysiwyg data={value} />
                </PreviewContainer>
              </PreviewWrapper>
            </ExpandContainer>
          </ExpandWrapper>
        </FocusTrap>
      </Portal>
      {mediaLibVisible && (
        <MediaLibrary
          editorRef={editorRef}
          onSubmitImage={onSubmitImage}
          onToggle={handleToggleMediaLib}
          onToggleMediaLib={handleToggleMediaLib}
          onTogglePopover={handleTogglePopover}
        />
      )}
    </>
  );
};

WysiwygExpand.defaultProps = {
  disabled: false,
  onChange: () => {},
  onToggleExpand: () => {},
  onActionClick: () => {},
  onSubmitImage: () => {},
  value: '',
  placeholder: '',
};

WysiwygExpand.propTypes = {
  disabled: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  onToggleExpand: PropTypes.func,
  onActionClick: PropTypes.func,
  onSubmitImage: PropTypes.func,
  textareaRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  editorRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
  value: PropTypes.string,
  placeholder: PropTypes.string,
};

export default WysiwygExpand;
