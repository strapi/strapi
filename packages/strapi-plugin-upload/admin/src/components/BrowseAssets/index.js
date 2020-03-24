import React from 'react';

import { PageFooter } from 'strapi-helper-plugin';

import { generatePageFromStart, generateStartFromPage } from '../../utils';
import Filters from '../Filters';
import Flex from '../Flex';
import List from '../List';
import ListEmpty from '../ListEmpty';
import Padded from '../Padded';
import SelectAll from '../SelectAll';
import SortPicker from '../SortPicker';
import useModalContext from '../../hooks/useModalContext';
import Wrapper from './Wrapper';

const BrowseAssets = () => {
  const {
    count,
    files,
    goTo,
    handleAllFilesSelection,
    handleFileSelection,
    multiple,
    params,
    removeFilter,
    selectedFiles,
    setParam,
    sort,
  } = useModalContext();

  const handleChangeParams = ({ target: { name, value } }) => {
    setParam({ name, value });
  };

  const handleChangeListParams = ({ target: { name, value } }) => {
    if (name.includes('_page')) {
      handleChangeParams({
        target: { name: '_start', value: generateStartFromPage(value, params._limit) },
      });
    } else {
      handleChangeParams({ target: { name: '_limit', value } });
    }
  };

  const handleDeleteFilter = index => {
    removeFilter(index);
  };

  const handleGoToUpload = () => {
    goTo('browse');
  };

  const limit = parseInt(params._limit, 10) || 10;
  const start = parseInt(params._start, 10) || 0;

  const paginationParams = {
    _limit: parseInt(params._limit, 10) || 10,
    _page: generatePageFromStart(start, limit),
  };

  const hasSomeCheckboxSelected = files.some(file =>
    selectedFiles.find(selectedFile => file.id === selectedFile.id)
  );
  const areAllCheckboxesSelected =
    files.every(file => selectedFiles.find(selectedFile => file.id === selectedFile.id)) &&
    hasSomeCheckboxSelected;
  const canSelectFile = multiple === true || (selectedFiles.length < 1 && !multiple);

  return (
    <Wrapper top size="sm">
      <Padded top bottom>
        <Flex flexWrap="wrap">
          {multiple && (
            <Padded right size="sm">
              <SelectAll
                checked={areAllCheckboxesSelected}
                onChange={handleAllFilesSelection}
                someChecked={hasSomeCheckboxSelected && !areAllCheckboxesSelected}
              />
            </Padded>
          )}
          <SortPicker onChange={handleChangeParams} value={sort} />
          <Padded left size="sm" />
          <Filters
            filters={params.filters}
            onChange={handleChangeParams}
            onClick={handleDeleteFilter}
          />
        </Flex>
      </Padded>
      {!files || files.length === 0 ? (
        <ListEmpty numberOfRows={2} onClick={handleGoToUpload} />
      ) : (
        <>
          <List
            canSelect={canSelectFile}
            data={files}
            onChange={handleFileSelection}
            selectedItems={selectedFiles}
          />
          <Padded left right>
            <PageFooter
              context={{ emitEvent: () => {} }}
              count={count}
              onChangeParams={handleChangeListParams}
              params={paginationParams}
            />
          </Padded>
        </>
      )}
    </Wrapper>
  );
};

export default BrowseAssets;
