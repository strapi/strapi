import React from 'react';
import { Button } from '@buffetjs/core';
import { CheckPermissions } from 'strapi-helper-plugin';
import useModalContext from '../../hooks/useModalContext';
import { getTrad } from '../../utils';
import pluginPermissions from '../../permissions';
import BrowseAssets from '../BrowseAssets';
import ModalNavWrapper from '../ModalNavWrapper';
import ModalSection from '../ModalSection';
import SelectedAssets from '../SelectedAssets';
import IntlText from '../IntlText';
import BaselineAlignmentWrapper from './BaselineAlignmentWrapper';

const ListModal = () => {
  const { currentTab, goTo, handleModalTabChange, selectedFiles } = useModalContext();

  const handleClick = to => {
    handleModalTabChange(to);
  };

  const handleGoToUpload = () => {
    goTo('browse');
  };

  const renderUploadModalButton = () => (
    <BaselineAlignmentWrapper>
      <CheckPermissions permissions={pluginPermissions.create}>
        <Button type="button" color="primary" onClick={handleGoToUpload}>
          <IntlText
            id={getTrad('modal.upload-list.sub-header.button')}
            fontWeight="bold"
            color="white"
          />
        </Button>
      </CheckPermissions>
    </BaselineAlignmentWrapper>
  );

  const links = [
    { to: 'browse', label: 'browse', isDisabled: false, onClick: handleClick },
    {
      to: 'selected',
      label: 'selected',
      count: selectedFiles.length,
      isDisabled: false,
      onClick: handleClick,
    },
  ];

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
