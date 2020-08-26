import React from 'react';

import { getTrad } from '../../utils';

import Flex from '../Flex';
import IntlText from '../IntlText';
import ListTitle from '../UploadList/ListTitle';
import useModalContext from '../../hooks/useModalContext';
import SortableList from './SortableList';
import Wrapper from './Wrapper';
import ListTitleWrapper from './ListTitleWrapper';
import ListWrapper from './ListWrapper';

const SelectedAssets = () => {
  const {
    allowedActions,
    selectedFiles,
    handleFileSelection,
    handleGoToEditFile,
    moveAsset,
    noNavigation,
  } = useModalContext();
  const filesToUploadLength = selectedFiles.length;
  const titleId = `modal.upload-list.sub-header-title.${
    filesToUploadLength > 1 ? 'plural' : 'singular'
  }`;

  return (
    <Wrapper>
      <Flex justifyContent="space-between">
        <ListTitleWrapper>
          <ListTitle id={getTrad(titleId)} values={{ number: filesToUploadLength }} />
          <IntlText
            id={getTrad('modal.upload-list.sub-header-subtitle')}
            values={{ number: filesToUploadLength }}
            fontSize="sm"
            color="grey"
          />
        </ListTitleWrapper>
      </Flex>
      <ListWrapper>
        <SortableList
          allowedActions={allowedActions}
          data={selectedFiles}
          moveAsset={moveAsset}
          noNavigation={noNavigation}
          onChange={handleFileSelection}
          onClickEditFile={handleGoToEditFile}
          selectedItems={selectedFiles}
        />
      </ListWrapper>
    </Wrapper>
  );
};

export default SelectedAssets;
