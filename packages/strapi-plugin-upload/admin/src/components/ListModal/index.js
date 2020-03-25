import React from 'react';
import { Button } from '@buffetjs/core';

import useModalContext from '../../hooks/useModalContext';
import { getTrad } from '../../utils';
import BrowseAssets from '../BrowseAssets';
import ModalNavWrapper from '../ModalNavWrapper';
import ModalSection from '../ModalSection';
import SelectedAssets from '../SelectedAssets';
import IntlText from '../IntlText';
import BaselineAlignmentWrapper from './BaselineAlignmentWrapper';

const ListModal = () => {
  const { selectedFiles, goTo, currentTab } = useModalContext();
  const links = [
    { to: 'browse', label: 'browse', isDisabled: false },
    { to: 'selected', label: 'selected', count: selectedFiles.length, isDisabled: false },
  ];

  const handleGoToUpload = () => {
    goTo('browse');
  };

  const renderUploadModalButton = () => (
    <BaselineAlignmentWrapper>
      <Button type="button" color="primary" onClick={handleGoToUpload}>
        <IntlText
          id={getTrad('modal.upload-list.sub-header.button')}
          fontWeight="bold"
          color="white"
        />
      </Button>
    </BaselineAlignmentWrapper>
  );

  return (
    <ModalNavWrapper
      initialTab={currentTab}
      links={links}
      renderRightContent={renderUploadModalButton}
    >
      {to => (
        <ModalSection>
          {to === 'browse' && <BrowseAssets />}
          {to === 'selected' && <SelectedAssets />}
        </ModalSection>
      )}
    </ModalNavWrapper>
  );
};

export default ListModal;
