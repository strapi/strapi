import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Icon } from '@strapi/design-system/Icon';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import PicturePlus from '@strapi/icons/PicturePlus';
import { parseFileMetadatas } from '../../utils/parseFileMetadatas';
import { ACCEPTED_FORMAT } from '../../utils/constants';

const FileInput = styled(Box)`
  opacity: 0;
`;

const FromComputerForm = ({ setLocalImage, goTo, next }) => {
  const { formatMessage } = useIntl();
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState(false);
  const inputRef = useRef(null);

  const handleDragEnter = () => setDragOver(true);
  const handleDragLeave = () => setDragOver(false);

  const handleClick = e => {
    e.preventDefault();
    inputRef.current.click();
  };

  const handleChange = async () => {
    handleDragLeave();
    const file = inputRef.current.files[0];

    if (!file) {
      return;
    }

    try {
      const asset = await parseFileMetadatas(file);
      setLocalImage(asset);
      goTo(next);
    } catch (err) {
      if (err.displayMessage) {
        setFileError(formatMessage(err.displayMessage));
      } else {
        throw err;
      }
    }
  };

  const getBorderColor = () => {
    if (dragOver) {
      return 'primary500';
    }
    if (fileError) {
      return 'danger600';
    }

    return 'neutral300';
  };

  return (
    <form>
      <Box paddingLeft={2} paddingRight={2} paddingTop={6} paddingBottom={6}>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label>
          <Box
            paddingTop={9}
            paddingBottom={7}
            hasRadius
            justifyContent="center"
            background={dragOver ? 'primary100' : 'neutral100'}
            borderColor={getBorderColor()}
            borderStyle="dashed"
            borderWidth="1px"
            position="relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          >
            <Flex justifyContent="center" direction="column">
              <Icon
                color="primary600"
                width={`${60 / 16}rem`}
                height={`${60 / 16}rem`}
                as={PicturePlus}
                aria-hidden
              />

              <Box paddingTop={3} paddingBottom={5}>
                <Typography variant="delta" as="span">
                  Drag and Drop here or
                </Typography>
              </Box>

              <FileInput
                accept={ACCEPTED_FORMAT}
                cursor="pointer"
                as="input"
                position="absolute"
                left={0}
                right={0}
                bottom={0}
                top={0}
                width="100%"
                type="file"
                name="files"
                tabIndex={-1}
                zIndex={1}
                onChange={handleChange}
                ref={inputRef}
              />

              <Button type="button" onClick={handleClick}>
                {formatMessage({
                  id: 'Settings.application.customization.modal.upload.cta.browse',
                  defaultMessage: 'Browse files',
                })}
              </Button>

              <Box paddingTop={6}>
                <Typography variant="pi" textColor="neutral600">
                  {/* Add translation once we know more about max size */}
                  Max dimension: 750*750, Max size: TBC
                </Typography>
              </Box>
            </Flex>
          </Box>
          {fileError && (
            <Box paddingTop={2}>
              <Typography textColor="danger600" variant="pi" as="p">
                {fileError}
              </Typography>
            </Box>
          )}
        </label>
      </Box>
    </form>
  );
};

FromComputerForm.defaultProps = {
  next: null,
};

FromComputerForm.propTypes = {
  setLocalImage: PropTypes.func.isRequired,
  goTo: PropTypes.func.isRequired,
  next: PropTypes.string,
};

export default FromComputerForm;
