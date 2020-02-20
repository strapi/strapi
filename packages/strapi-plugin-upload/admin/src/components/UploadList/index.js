import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Button } from '@buffetjs/core';
import createMatrix from '../../utils/createMatrix';
import getTrad from '../../utils/getTrad';
import ContainerFluid from '../ContainerFluid';
import ModalSection from '../ModalSection';
import Text from '../Text';
import ButtonWrapper from './ButtonWrapper';
import TextWrapper from './TextWrapper';
import RowItem from './RowItem';
import ListWrapper from './ListWrapper';

const UploadList = ({
  filesToUpload,
  onClickCancelUpload,
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
          <Text fontSize="md" fontWeight="bold">
            <FormattedMessage
              id={getTrad(titleId)}
              values={{ number: filesToUploadLength }}
            />
          </Text>

          <Text fontSize="sm" color="grey">
            <FormattedMessage
              id={getTrad('modal.upload-list.sub-header-subtitle')}
              values={{ number: filesToUploadLength }}
            />
          </Text>
        </TextWrapper>
        <ButtonWrapper>
          <FormattedMessage id={getTrad('modal.upload-list.sub-header.button')}>
            {label => (
              <Button
                type="button"
                color="primary"
                label={label}
                onClick={onGoToAddBrowseFiles}
              />
            )}
          </FormattedMessage>
        </ButtonWrapper>
      </ModalSection>

      <ModalSection>
        <ContainerFluid>
          <ListWrapper>
            {matrix.map(({ key, rowContent }) => {
              return (
                <div className="row" key={key}>
                  {rowContent.map(data => (
                    <RowItem
                      {...data}
                      onClick={onClickCancelUpload}
                      key={data.originalIndex}
                    />
                  ))}
                </div>
              );
            })}
          </ListWrapper>
        </ContainerFluid>
      </ModalSection>
    </>
  );
};

UploadList.defaultProps = {
  filesToUpload: [],
  onClickCancelUpload: () => {},
  onGoToAddBrowseFiles: () => {},
};

UploadList.propTypes = {
  filesToUpload: PropTypes.array,
  onClickCancelUpload: PropTypes.func,
  onGoToAddBrowseFiles: PropTypes.func,
};

export default UploadList;
