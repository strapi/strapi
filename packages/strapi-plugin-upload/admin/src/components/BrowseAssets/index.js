import React from 'react';

import { PageFooter } from 'strapi-helper-plugin';
import ListEmpty from '../ListEmpty';
import List from '../List';
import useModalContext from '../../hooks/useModalContext';
import Filters from '../Filters';
import SortPicker from '../SortPicker';
import Padded from '../Padded';
import Flex from '../Flex';
import SelectAll from '../SelectAll';
import Wrapper from './Wrapper';
import { generatePageFromStart, generateStartFromPage } from '../../containers/HomePage/utils';

const BrowseAssets = () => {
  const {
    handleFileSelection,
    handleAllFileSelection,
    setParam,
    removeFilter,
    files,
    params,
    count,
    multiple,
    sort,
    selectedFiles,
    goTo,
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

  const areAllCheckboxesSelected = files.length === selectedFiles.length;
  const hasSomeCheckboxSelected = selectedFiles.length > 0;
  const canSelectFile = multiple === true || (selectedFiles.length < 1 && !multiple);

  return (
    <Wrapper top size="sm">
      <Padded top bottom>
        <Flex flexWrap="wrap">
          {multiple && (
            <Padded right size="sm">
              <SelectAll
                onChange={handleAllFileSelection}
                checked={areAllCheckboxesSelected}
                someChecked={hasSomeCheckboxSelected && !areAllCheckboxesSelected}
              />
            </Padded>
          )}
          <SortPicker onChange={handleChangeParams} value={sort} />
          <Padded left size="sm" />
          <Filters
            onChange={handleChangeParams}
            onClick={handleDeleteFilter}
            filters={params.filters}
          />
        </Flex>
      </Padded>
      {!files || files.length === 0 ? (
        <ListEmpty numberOfRows={2} onClick={handleGoToUpload} />
      ) : (
        <>
          <List
            data={files}
            canSelect={canSelectFile}
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
