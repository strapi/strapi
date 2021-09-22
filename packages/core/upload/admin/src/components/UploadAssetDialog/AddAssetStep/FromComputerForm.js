/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { VisuallyHidden } from '@strapi/parts/VisuallyHidden';
import { H3 } from '@strapi/parts/Text';
import { ModalFooter } from '@strapi/parts/ModalLayout';
import { Button } from '@strapi/parts/Button';
import AddAssetIcon from '@strapi/icons/AddAsset';
import { useIntl } from 'react-intl';
import { getTrad } from '../../../utils';
import { typeFromMime } from '../../../utils/typeFromMime';
import { AssetSource } from '../../../constants';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const IconWrapper = styled.div`
  font-size: ${60 / 16}rem;

  svg path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

const MediaBox = styled(Box)`
  border-style: dashed;
`;

export const FromComputerForm = ({ onClose, onAddAssets }) => {
  const { formatMessage } = useIntl();
  const inputRef = useRef(null);

  const handleClick = e => {
    e.preventDefault();
    inputRef.current.click();
  };

  const handleChange = () => {
    const files = inputRef.current.files;
    const assets = [];

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);

      assets.push({
        name: file.name,
        source: AssetSource.Computer,
        type: typeFromMime(file.type),
        url: URL.createObjectURL(file),
        ext: file.name.split('.').pop(),
        mime: file.type,
        rawFile: file,
      });
    }

    onAddAssets(assets);
  };

  return (
    <form>
      <Box paddingLeft={8} paddingRight={8} paddingTop={6} paddingBottom={6}>
        <label>
          <MediaBox
            paddingTop={11}
            paddingBottom={11}
            hasRadius
            justifyContent="center"
            borderColor="neutral300"
            background="neutral100"
          >
            <Row justifyContent="center">
              <Wrapper>
                <IconWrapper>
                  <AddAssetIcon aria-hidden />
                </IconWrapper>

                <Box paddingTop={3} paddingBottom={5}>
                  <H3 textColor="neutral600" as="span">
                    {formatMessage({
                      id: getTrad('input.label'),
                      defaultMessage: 'Drag & Drop here or',
                    })}
                  </H3>
                </Box>

                <Button type="button" onClick={handleClick}>
                  {formatMessage({
                    id: getTrad('input.button.label'),
                    defaultMessage: 'Browse files',
                  })}
                </Button>

                <VisuallyHidden>
                  <input
                    type="file"
                    multiple
                    name="files"
                    tabIndex={-1}
                    ref={inputRef}
                    onChange={handleChange}
                  />
                </VisuallyHidden>
              </Wrapper>
            </Row>
          </MediaBox>
        </label>
      </Box>

      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({
              id: 'app.components.Button.cancel',
              defaultMessage: 'cancel',
            })}
          </Button>
        }
      />
    </form>
  );
};

FromComputerForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onAddAssets: PropTypes.func.isRequired,
};
