import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Portal, Row, Text, FocusTrap } from '@strapi/parts';
import { Collapse } from '@strapi/icons';
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
  onToggleExpand,
  value,
  placeholder,
  onActionClick,
  onChange,
  textareaRef,
  editorRef,
  onSubmitImage,
}) => {
  const [visiblePopover, setVisiblePopover] = useState(false);
  const [mediaLibVisible, setMediaLibVisible] = useState(false);

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
                  placeholder={placeholder}
                  onActionClick={onActionClick}
                  visiblePopover={visiblePopover}
                  onTogglePopover={handleTogglePopover}
                  onToggleMediaLib={handleToggleMediaLib}
                  editorRef={editorRef}
                />
                <Editor
                  onChange={onChange}
                  textareaRef={textareaRef}
                  editorRef={editorRef}
                  value={value}
                />
              </WysiwygContainer>
              <PreviewWrapper>
                <PreviewHeader padding={2} background="neutral100">
                  <Row justifyContent="flex-end" alignItems="flex-end">
                    <ExpandButton id="collapse" onClick={() => onToggleExpand('collapse')}>
                      {/* to replace with format message */}
                      <Text>Collapse</Text>
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
          onToggle={handleToggleMediaLib}
          onSubmitImage={onSubmitImage}
          editorRef={editorRef}
          onToggleMediaLib={handleToggleMediaLib}
          onTogglePopover={handleTogglePopover}
        />
      )}
    </>
  );
};

WysiwygExpand.defaultProps = {
  onChange: () => {},
  onToggleExpand: () => {},
  onActionClick: () => {},
  onSubmitImage: () => {},
  value: '',
  placeholder: '',
};

WysiwygExpand.propTypes = {
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
