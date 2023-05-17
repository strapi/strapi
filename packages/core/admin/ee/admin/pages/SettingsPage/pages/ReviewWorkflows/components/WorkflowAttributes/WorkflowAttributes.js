import * as React from 'react';
import PropTypes from 'prop-types';
import { useField } from 'formik';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Grid, GridItem, MultiSelect, MultiSelectOption, TextInput } from '@strapi/design-system';

import { updateWorkflow } from '../../actions';

export function WorkflowAttributes({ contentTypes: { collectionTypes, singleTypes } }) {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const [nameField, nameMeta] = useField('name');
  const [contentTypesField, contentTypesMeta] = useField('contentTypes');

  return (
    <Grid background="neutral0" hasRadius gap={4} padding={6} shadow="tableShadow">
      <GridItem col={6}>
        <TextInput
          {...nameField}
          id={nameField.name}
          label={formatMessage({
            id: 'Settings.review-workflows.workflow.name.label',
            defaultMessage: 'Workflow Name',
          })}
          error={nameMeta.error ?? false}
          onChange={(event) => {
            dispatch(updateWorkflow({ name: event.target.value }));
            nameField.onChange(event);
          }}
          required
        />
      </GridItem>

      <GridItem col={6}>
        <MultiSelect
          {...contentTypesField}
          customizeContent={() =>
            formatMessage(
              {
                id: 'Settings.review-workflows.workflow.mappedContentTypes.displayValue',
                defaultMessage:
                  '{count} {count, plural, one {content type} other {content types}} selected',
              },
              { count: contentTypesField.value.length }
            )
          }
          error={contentTypesMeta.error ?? false}
          id={contentTypesField.name}
          label={formatMessage({
            id: 'Settings.review-workflows.workflow.mappedContentTypes.label',
            defaultMessage: 'Associated to',
          })}
          onChange={(values) => {
            dispatch(updateWorkflow({ mappedContentTypes: values }));
            contentTypesField.onChange({ target: { value: values } });
          }}
          required
        >
          {[...collectionTypes, ...singleTypes].map((contentType) => (
            <MultiSelectOption key={contentType.uid} value={contentType.uid}>
              {contentType.info.displayName}
            </MultiSelectOption>
          ))}
        </MultiSelect>
      </GridItem>
    </Grid>
  );
}

const ContentTypeType = PropTypes.shape({
  uid: PropTypes.string.isRequired,
  info: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
  }).isRequired,
});

WorkflowAttributes.propTypes = {
  contentTypes: PropTypes.shape({
    collectionTypes: PropTypes.arrayOf(ContentTypeType).isRequired,
    singleTypes: PropTypes.arrayOf(ContentTypeType).isRequired,
  }).isRequired,
};
