import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Icon } from '@strapi/design-system/Icon';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import PicturePlus from '@strapi/icons/PicturePlus';

const FileInput = styled(Box)`
  opacity: 0;
`;

const FromComputerForm = () => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDragEnter = () => setDragOver(true);
  const handleDragLeave = () => setDragOver(false);

  const handleClick = e => {
    e.preventDefault();
    inputRef.current.click();
  };

  const handleDrop = e => {
    const files = e?.dataTransfer?.files;
    console.log(files);
    handleDragLeave();
  };

  const handleChange = () => {
    const files = inputRef.current.files;
    console.log(files);
    handleDragLeave();
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
            borderColor={dragOver ? 'primary500' : 'neutral300'}
            borderStyle="dashed"
            borderWidth="1px"
            position="relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Flex justifyContent="center">
              <Flex direction="column">
                <Icon
                  color="primary600"
                  width={`${60 / 16}rem`}
                  height={`${60 / 16}rem`}
                  as={PicturePlus}
                />

                <Box paddingTop={3} paddingBottom={5}>
                  <Typography variant="delta">Drag & Drop here or</Typography>
                </Box>

                <FileInput
                  accept=".jpg,.png,.svg"
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
                  Browse files
                </Button>

                <Box paddingTop={6}>
                  <Typography variant="pi" textColor="neutral600">
                    Max dimension: 750*750, Max size: TBC
                  </Typography>
                </Box>
              </Flex>
            </Flex>
          </Box>
        </label>
      </Box>
    </form>
  );
};

export default FromComputerForm;
