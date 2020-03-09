import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Button } from '@buffetjs/core';
import createMatrix from '../../utils/createMatrix';
import getTrad from '../../utils/getTrad';
import ModalSection from '../ModalSection';
import IntlText from '../IntlText';
import Container from './Container';
import ButtonWrapper from './ButtonWrapper';
import TextWrapper from './TextWrapper';
import RowItem from './RowItem';

const UploadList = ({
  filesToUpload,
  onClickCancelUpload,
  onClickEditNewFile,
  onGoToAddBrowseFiles,
}) => {
  const matrix = createMatrix(filesToUpload);
  const filesToUploadLength = filesToUpload.length;
  const titleId = `modal.upload-list.sub-header-title.${
    filesToUploadLength > 1 ? 'plural' : 'singular'
  }`;

  return (
    <>
      <ModalSection justifyContent="space-between">
        <TextWrapper>
          <IntlText
            id={getTrad(titleId)}
            values={{ number: filesToUploadLength }}
            fontSize="md"
            fontWeight="bold"
            lineHeight="19px"
          />
          <IntlText
            id={getTrad('modal.upload-list.sub-header-subtitle')}
            values={{ number: filesToUploadLength }}
            fontSize="sm"
            color="grey"
          />
        </TextWrapper>
        <ButtonWrapper>
          <Button type="button" color="primary" onClick={onGoToAddBrowseFiles}>
            <IntlText
              id={getTrad('modal.upload-list.sub-header.button')}
              fontWeight="bold"
              color="white"
            />
          </Button>
        </ButtonWrapper>
      </ModalSection>
      <ModalSection>
        <Container>
          {matrix.map(({ key, rowContent }) => {
            return (
              <div className="row" key={key}>
                {rowContent.map(data => {
                  return (
                    <RowItem
                      {...data}
                      onClick={onClickCancelUpload}
                      onClickEdit={onClickEditNewFile}
                      key={data.originalIndex}
                    />
                  );
                })}
              </div>
            );
          })}
        </Container>
      </ModalSection>
    </>
  );
};

UploadList.defaultProps = {
  filesToUpload: [],
  onClickCancelUpload: () => {},
  onClickEditNewFile: () => {},
  onGoToAddBrowseFiles: () => {},
};

UploadList.propTypes = {
  filesToUpload: PropTypes.array,
  onClickCancelUpload: PropTypes.func,
  onClickEditNewFile: PropTypes.func,
  onGoToAddBrowseFiles: PropTypes.func,
};

export default UploadList;
