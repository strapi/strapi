import React from 'react';
import { isEmpty } from 'lodash';
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
import CardControl from '../CardControl';

const BrowseAssets = () => {
  const {
    count,
    files,
    goTo,
    handleAllFilesSelection,
    handleFileSelection,
    handleGoToEditFile,
    multiple,
    params,
    removeFilter,
    selectedFiles,
    setParam,
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

  const handleListCardClick = id => {
    handleFileSelection({
      target: {
        name: id,
      },
    });
  };

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

  const hasFilters = !isEmpty(params.filters.filter(filter => !filter.isDisabled));
  const hasSearch = !isEmpty(params._q);
  const areResultsEmptyWithSearchOrFilters = isEmpty(files) && (hasSearch || hasFilters);

  return (
    <Wrapper>
      <Padded top>
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
          <SortPicker onChange={handleChangeParams} value={params._sort} />
          <Padded left size="sm" />
          <Filters
            filters={params.filters}
            onChange={handleChangeParams}
            onClick={handleDeleteFilter}
          />
        </Flex>
      </Padded>
      {!files || files.length === 0 ? (
        <ListEmpty
          numberOfRows={2}
          onClick={handleGoToUpload}
          hasSearchApplied={areResultsEmptyWithSearchOrFilters}
        />
      ) : (
        <>
          <List
            canSelect={canSelectFile}
            data={files}
            onChange={handleFileSelection}
            selectedItems={selectedFiles}
            onCardClick={handleListCardClick}
            renderCardControl={id => (
              <CardControl
                small
                title="edit"
                color="#9EA7B8"
                type="pencil"
                onClick={() => handleGoToEditFile(id)}
              />
            )}
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
