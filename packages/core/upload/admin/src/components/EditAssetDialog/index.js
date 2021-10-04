/**
 *
 * EditAssetDialog
 *
 */

import PropTypes from 'prop-types';
import React from 'react';
import { useIntl } from 'react-intl';
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from '@strapi/parts/ModalLayout';
import { ButtonText } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Button } from '@strapi/parts/Button';
import { TextInput } from '@strapi/parts/TextInput';
import { getFileExtension, prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';
import { PreviewBox } from './PreviewBox';
import { AssetMeta } from './AssetMeta';
import { getTrad } from '../../utils';
import formatBytes from '../../utils/formatBytes';

export const EditAssetDialog = ({ onClose, asset }) => {
  const { formatMessage } = useIntl();
  const formatter = new Intl.DateTimeFormat();

  // TODO implement when the code is ready
  const handleSubmit = () => {};

  return (
    <ModalLayout onClose={onClose} labelledBy="title">
      <ModalHeader>
        <ButtonText textColor="neutral800" as="h2" id="title">
          {formatMessage({ id: getTrad('modal.edit.title'), defaultMessage: 'Details' })}
        </ButtonText>
      </ModalHeader>
      <ModalBody>
        <Grid gap={4}>
          <GridItem xs={12} col={6}>
            <PreviewBox>
              <img src={prefixFileUrlWithBackendUrl(asset.url)} alt={asset.name} />
            </PreviewBox>
          </GridItem>
          <GridItem xs={12} col={6}>
            <Stack size={3}>
              <AssetMeta
                size={formatBytes(asset.size)}
                dimension={asset.height && asset.width ? `${asset.height}✕${asset.width}` : ''}
                date={formatter.format(new Date(asset.createdAt))}
                extension={getFileExtension(asset.ext)}
              />

              <TextInput
                size="S"
                label={formatMessage({
                  id: getTrad('form.input.label.file-name'),
                  defaultMessage: 'File name',
                })}
                name="filename"
              />
              <TextInput
                size="S"
                label={formatMessage({
                  id: getTrad('form.input.label.file-alt'),
                  defaultMessage: 'Alternative text',
                })}
                name="altText"
                hint={formatMessage({
                  id: getTrad({ id: getTrad('form.input.decription.file-alt') }),
                  defaultMessage: 'This text will be displayed if the asset can’t be shown.',
                })}
              />
              <TextInput
                size="S"
                label={formatMessage({
                  id: getTrad('form.input.label.file-caption'),
                  defaultMessage: 'Caption',
                })}
                name="caption"
              />
            </Stack>
          </GridItem>
        </Grid>
      </ModalBody>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endActions={
          <>
            <Button variant="secondary">
              {formatMessage({
                id: getTrad('control-card.replace-media'),
                defaultMessage: 'Replace media',
              })}
            </Button>
            <Button onClick={handleSubmit}>
              {formatMessage({ id: 'form.button.finish', defaultMessage: 'Finish' })}
            </Button>
          </>
        }
      />
    </ModalLayout>
  );
};

EditAssetDialog.propTypes = {
  asset: PropTypes.shape({
    height: PropTypes.number,
    width: PropTypes.number,
    size: PropTypes.number,
    createdAt: PropTypes.string,
    ext: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};
