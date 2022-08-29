import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { Icon } from '@strapi/design-system/Icon';
import { Typography } from '@strapi/design-system/Typography';
import { ModalFooter } from '@strapi/design-system/ModalLayout';
import { Button } from '@strapi/design-system/Button';
import { Field, FieldError, FieldInput } from '@strapi/design-system/Field';
import PicturePlus from '@strapi/icons/PicturePlus';
import { parseFileMetadatas } from '../../utils/parseFileMetadatas';
import { ACCEPTED_FORMAT, SIZE, DIMENSION } from '../../utils/constants';

const FileInput = styled(FieldInput)`
  opacity: 0;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
`;

const FromComputerForm = ({ setLocalImage, goTo, next, onClose }) => {
  const { formatMessage } = useIntl();
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState(undefined);
  const inputRef = useRef(null);

  const handleDragEnter = () => setDragOver(true);
  const handleDragLeave = () => setDragOver(false);

  const handleClick = (e) => {
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
        setFileError(formatMessage(err.displayMessage, { size: SIZE, dimension: DIMENSION }));
        inputRef.current.focus();
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
    <>
      <form>
        <Box paddingLeft={8} paddingRight={8} paddingTop={6} paddingBottom={6}>
          <Field name="logo-upload" error={fileError}>
            <label htmlFor="logo-upload">
              <Stack spacing={2}>
                <Flex
                  paddingTop={9}
                  paddingBottom={7}
                  hasRadius
                  justifyContent="center"
                  direction="column"
                  background={dragOver ? 'primary100' : 'neutral100'}
                  borderColor={getBorderColor()}
                  borderStyle="dashed"
                  borderWidth="1px"
                  position="relative"
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                >
                  <Icon
                    color="primary600"
                    width={`${60 / 16}rem`}
                    height={`${60 / 16}rem`}
                    as={PicturePlus}
                    aria-hidden
                  />

                  <Box paddingTop={3} paddingBottom={5}>
                    <Typography variant="delta" as="span">
                      {formatMessage({
                        id: 'Settings.application.customization.modal.upload.drag-drop',
                        defaultMessage: 'Drag and Drop here or',
                      })}
                    </Typography>
                  </Box>

                  <FileInput
                    accept={ACCEPTED_FORMAT}
                    cursor="pointer"
                    as="input"
                    type="file"
                    name="files"
                    tabIndex={-1}
                    zIndex={1}
                    onChange={handleChange}
                    ref={inputRef}
                    id="logo-upload"
                  />

                  <Button type="button" onClick={handleClick}>
                    {formatMessage({
                      id: 'Settings.application.customization.modal.upload.cta.browse',
                      defaultMessage: 'Browse files',
                    })}
                  </Button>

                  <Box paddingTop={6}>
                    <Typography variant="pi" textColor="neutral600">
                      {formatMessage(
                        {
                          id: 'Settings.application.customization.modal.upload.file-validation',
                          defaultMessage:
                            'Max dimension: {dimension}x{dimension}, Max size: {size}KB',
                        },
                        { size: SIZE, dimension: DIMENSION }
                      )}
                    </Typography>
                  </Box>
                </Flex>
                <FieldError />
              </Stack>
            </label>
          </Field>
        </Box>
      </form>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({
              id: 'Settings.application.customization.modal.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
      />
    </>
  );
};

FromComputerForm.defaultProps = {
  next: null,
};

FromComputerForm.propTypes = {
  goTo: PropTypes.func.isRequired,
  next: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  setLocalImage: PropTypes.func.isRequired,
};

export default FromComputerForm;
