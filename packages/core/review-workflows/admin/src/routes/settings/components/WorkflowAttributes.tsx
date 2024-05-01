import { InputRenderer, useField, useForm } from '@strapi/admin/strapi-admin';
import {
  Grid,
  GridItem,
  MultiSelect,
  MultiSelectGroup,
  MultiSelectOption,
  Typography,
  useCollator,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetContentTypesQuery } from '../../../services/content-manager';
import { useReviewWorkflows } from '../hooks/useReviewWorkflows';

/* -------------------------------------------------------------------------------------------------
 * WorkflowAttributes
 * -----------------------------------------------------------------------------------------------*/
interface WorkflowAttributesProps {
  canUpdate?: boolean;
}

const WorkflowAttributes = ({ canUpdate = true }: WorkflowAttributesProps) => {
  const { formatMessage } = useIntl();

  return (
    <Grid background="neutral0" hasRadius gap={4} padding={6} shadow="tableShadow">
      <GridItem col={6}>
        <InputRenderer
          disabled={!canUpdate}
          label={formatMessage({
            id: 'Settings.review-workflows.workflow.name.label',
            defaultMessage: 'Workflow Name',
          })}
          name="name"
          required
          type="string"
        />
      </GridItem>
      <GridItem col={6}>
        <ContentTypesSelector disabled={!canUpdate} />
      </GridItem>
    </Grid>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ContentTypesSelector
 * -----------------------------------------------------------------------------------------------*/
interface ContentTypesSelectorProps {
  disabled?: boolean;
}

const ContentTypesSelector = ({ disabled }: ContentTypesSelectorProps) => {
  const { formatMessage, locale } = useIntl();
  const { data: contentTypes, isLoading } = useGetContentTypesQuery();
  const { workflows } = useReviewWorkflows();
  const currentWorkflow = useForm('ContentTypesSelector', (state) => state.values);

  const { error, value, onChange } = useField('contentTypes');

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const isDisabled =
    disabled ||
    isLoading ||
    !contentTypes ||
    (contentTypes.collectionType.length === 0 && contentTypes.singleType.length === 0);

  const collectionTypes = (contentTypes?.collectionType ?? [])
    .toSorted((a, b) => formatter.compare(a.info.displayName, b.info.displayName))
    .map((contentType) => ({
      label: contentType.info.displayName,
      value: contentType.uid,
    }));
  const singleTypes = (contentTypes?.singleType ?? []).map((contentType) => ({
    label: contentType.info.displayName,
    value: contentType.uid,
  }));

  return (
    <MultiSelect
      customizeContent={(value) =>
        formatMessage(
          {
            id: 'Settings.review-workflows.workflow.contentTypes.displayValue',
            defaultMessage:
              '{count} {count, plural, one {content type} other {content types}} selected',
          },
          { count: value?.length }
        )
      }
      disabled={isDisabled}
      error={error}
      label={formatMessage({
        id: 'Settings.review-workflows.workflow.contentTypes.label',
        defaultMessage: 'Associated to',
      })}
      onChange={(values) => {
        onChange('contentTypes', values);
      }}
      value={value}
      placeholder={formatMessage({
        id: 'Settings.review-workflows.workflow.contentTypes.placeholder',
        defaultMessage: 'Select',
      })}
    >
      {[
        ...(collectionTypes.length > 0
          ? [
              {
                label: formatMessage({
                  id: 'Settings.review-workflows.workflow.contentTypes.collectionTypes.label',
                  defaultMessage: 'Collection Types',
                }),
                children: collectionTypes,
              },
            ]
          : []),

        ...(singleTypes.length > 0
          ? [
              {
                label: formatMessage({
                  id: 'Settings.review-workflows.workflow.contentTypes.singleTypes.label',
                  defaultMessage: 'Single Types',
                }),
                children: singleTypes,
              },
            ]
          : []),
      ].map((opt) => {
        return (
          <MultiSelectGroup
            key={opt.label}
            label={opt.label}
            values={opt.children.map((child) => child.value.toString())}
          >
            {opt.children.map((child) => {
              const { name: assignedWorkflowName } =
                workflows?.find(
                  (workflow) =>
                    ((currentWorkflow && workflow.id !== currentWorkflow.id) || !currentWorkflow) &&
                    workflow.contentTypes.includes(child.value)
                ) ?? {};

              return (
                <NestedOption key={child.value} value={child.value}>
                  <Typography>
                    {
                      // @ts-expect-error - formatMessage options doesn't expect to be a React component but that's what we need actually for the <i> and <em> components
                      formatMessage(
                        {
                          id: 'Settings.review-workflows.workflow.contentTypes.assigned.notice',
                          defaultMessage:
                            '{label} {name, select, undefined {} other {<i>(assigned to <em>{name}</em> workflow)</i>}}',
                        },
                        {
                          label: child.label,
                          name: assignedWorkflowName,
                          em: (...children) => (
                            <Typography tag="em" fontWeight="bold">
                              {children}
                            </Typography>
                          ),
                          i: (...children) => (
                            <ContentTypeTakeNotice>{children}</ContentTypeTakeNotice>
                          ),
                        }
                      )
                    }
                  </Typography>
                </NestedOption>
              );
            })}
          </MultiSelectGroup>
        );
      })}
    </MultiSelect>
  );
};

const NestedOption = styled(MultiSelectOption)`
  padding-left: ${({ theme }) => theme.spaces[7]};
`;

const ContentTypeTakeNotice = styled(Typography)`
  font-style: italic;
`;

export { WorkflowAttributes };
export type { WorkflowAttributesProps };
