import * as React from 'react';
import { useParams, useLoaderData, useRevalidator } from 'react-router-dom';
import { BlocksRenderer } from '@strapi/blocks-react-renderer';

import { Page, Layouts } from '@strapi/admin/strapi-admin';
import { Grid, Flex, Typography, JSONInput, Box, Button } from '@strapi/design-system';
import { ChevronDown, ChevronRight } from '@strapi/icons';

const isMedia = (value) => {
  return typeof value === 'object' && value !== null && 'url' in value;
};

const filterAttributes = (item) => {
  const excludedKeys = ['documentId', 'id', 'createdAt', 'updatedAt', 'publishedAt'];
  return Object.entries(item).filter(([key]) => !excludedKeys.includes(key));
};

const ToggleableContainer = ({ headerText, children, isEmpty = false }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Flex direction="column" alignItems="flex-start" gap={1}>
      <Flex
        tag="button"
        alignItems="center"
        gap={1}
        onClick={() => setIsExpanded(!isExpanded)}
        paddingTop={1}
        paddingBottom={1}
        marginLeft={-1}
        disabled={isEmpty}
        color="neutral600"
      >
        {isExpanded ? <ChevronDown /> : <ChevronRight />}
        <Typography variant="omega">{headerText}</Typography>
      </Flex>
      {isExpanded && (
        <Box
          borderWidth="0 0 0 2px"
          borderColor="neutral200"
          paddingLeft={3}
          paddingTop={1}
          paddingBottom={1}
        >
          {children}
        </Box>
      )}
    </Flex>
  );
};

const NestedValue = ({
  value,
  level = 0,
  arrayIndex = undefined,
  fieldName = undefined,
  path,
  model,
  documentId,
}) => {
  if (fieldName === 'blocks') {
    return (
      <Flex
        direction="column"
        alignItems="flex-start"
        fontSize="1.4rem"
        gap={2}
        data-strapi-source={`path=${path}&type=blocks&model=${model}&documentId=${documentId}`}
        width="100%"
      >
        {value ? <BlocksRenderer content={value} /> : 'null'}
      </Flex>
    );
  }

  // Use the email type to test clickable preview elements
  if (fieldName === 'email') {
    return (
      <Button
        variant="tertiary"
        onClick={() => window.alert('Sending email!')}
        data-strapi-source={`path=${path}&type=email&model=${model}&documentId=${documentId}`}
      >
        {value}
      </Button>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <Box
        data-strapi-source={`path=${path}&type=boolean&model=${model}&documentId=${documentId}`}
        padding={1}
        background={value ? 'success100' : 'danger100'}
        borderColor={value ? 'success200' : 'danger200'}
        borderWidth="1px"
        hasRadius
      >
        <Typography variant="sigma" textColor={value ? 'success600' : 'danger600'}>
          {String(value).toUpperCase()}
        </Typography>
      </Box>
    );
  }

  if (isMedia(value)) {
    // Check for video mime type if available, otherwise assume image for preview if url exists
    const isVideo = value.mime?.startsWith('video/');
    const sourceString = `path=${path}&type=media&model=${model}&documentId=${documentId}`;

    return (
      <Box style={{ maxWidth: '300px' }}>
        {isVideo ? (
          <video
            src={value.url}
            controls
            style={{ maxWidth: '100%' }}
            data-strapi-source={sourceString}
          />
        ) : (
          <img
            src={value.url}
            alt={value.alternativeText || ''}
            style={{ maxWidth: '100%' }}
            data-strapi-source={sourceString}
          />
        )}
      </Box>
    );
  }

  if (Array.isArray(value)) {
    return (
      <ToggleableContainer
        headerText={`Array (${value.length} items)`}
        isEmpty={value.length === 0}
      >
        <Flex direction="column" gap={2}>
          {value.map((item, index) => (
            <Box key={index}>
              {typeof item === 'object' && item !== null ? (
                <NestedValue
                  value={item}
                  level={level + 1}
                  arrayIndex={index}
                  fieldName={fieldName}
                  path={`${path}.${index}`}
                  model={model}
                  documentId={documentId}
                />
              ) : (
                <Flex direction="column" gap={1}>
                  <Typography variant="pi" textColor="neutral500">
                    [{index}]
                  </Typography>
                  <NestedValue
                    value={item}
                    level={level + 1}
                    arrayIndex={index}
                    fieldName={fieldName}
                    path={`${path}.${index}`}
                    model={model}
                    documentId={documentId}
                  />
                </Flex>
              )}
            </Box>
          ))}
        </Flex>
      </ToggleableContainer>
    );
  }

  if (typeof value === 'object' && value !== null) {
    const entries = filterAttributes(value);

    return (
      <ToggleableContainer
        headerText={`${arrayIndex !== undefined ? `[${arrayIndex}] ` : ''}Object (${entries.length} properties)`}
        isEmpty={entries.length === 0}
      >
        <Flex direction="column" alignItems="flex-start" gap={2}>
          {entries.map(([key, val]) => (
            <Flex key={key} direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="sigma" textColor="neutral600">
                {key}
              </Typography>
              <NestedValue
                value={val}
                level={level + 1}
                fieldName={key}
                path={`${path}.${key}`}
                model={model}
                documentId={documentId}
              />
            </Flex>
          ))}
        </Flex>
      </ToggleableContainer>
    );
  }

  return (
    <Box>
      <Typography
        data-strapi-source={`path=${path}&type=text&model=${model}&documentId=${documentId}`}
      >
        {value === null || value === undefined || String(value) === '' ? '\u00A0' : String(value)}
      </Typography>
    </Box>
  );
};

const Entry = ({ data, model, documentId }) => {
  return (
    <Grid.Root gap={5} tag="dl">
      {filterAttributes(data).map(([key, value]) => (
        <Grid.Item key={key} col={6} s={12} direction="column" alignItems="start">
          <Typography variant="sigma" textColor="neutral600" tag="dt">
            {key}
          </Typography>
          <Flex gap={3} direction="column" alignItems="start" tag="dd">
            <NestedValue
              value={value}
              fieldName={key}
              path={key}
              model={model}
              documentId={documentId}
            />
          </Flex>
        </Grid.Item>
      ))}
    </Grid.Root>
  );
};

const PreviewComponent = () => {
  const { apiName, documentId, locale, status: documentStatus } = useParams();
  const { main, unrelated } = useLoaderData();
  const revalidator = useRevalidator();

  React.useEffect(() => {
    const handleMessage = (event) => {
      const { origin, data } = event;

      /**
       * This is a special case because this is an admin page that's meant to be embedded within
       * the admin itself. For real user websites, this will likely be something like this instead:
       * `if (origin !== process.env.API_URL) return`
       */
      if (origin !== window.origin) {
        return;
      }

      if (data?.type === 'strapiUpdate') {
        // The data is stale, force a refetch
        revalidator.revalidate();
      } else if (data?.type === 'strapiScript') {
        const script = window.document.createElement('script');
        script.textContent = data.payload.script;
        window.document.head.appendChild(script);
      }
    };

    window.addEventListener('message', handleMessage);

    window.parent?.postMessage({ type: 'previewReady' }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <Box height="100vh" background="neutral100" overflow="auto">
      <Layouts.Root>
        <Page.Main>
          <Page.Title>{`Previewing ${apiName}`}</Page.Title>
          <Layouts.Header
            title="Static Preview"
            subtitle="Dummy frontend so we can test Preview in getstarted"
          />
          <Layouts.Content>
            <Flex
              direction="column"
              alignItems="stretch"
              gap={4}
              hasRadius
              background="neutral0"
              shadow="tableShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingRight={7}
              paddingLeft={7}
            >
              <Typography variant="delta" tag="h3">
                URL metadata
              </Typography>
              <Grid.Root gap={5} tag="dl">
                <Grid.Item col={12} s={6} direction="column" alignItems="start">
                  <Typography variant="sigma" textColor="neutral600" tag="dt">
                    Content Type
                  </Typography>
                  <Flex gap={3} direction="column" alignItems="start" tag="dd">
                    <Typography>{apiName}</Typography>
                  </Flex>
                </Grid.Item>
                <Grid.Item col={12} s={6} direction="column" alignItems="start">
                  <Typography variant="sigma" textColor="neutral600" tag="dt">
                    Document Id
                  </Typography>
                  <Flex gap={3} direction="column" alignItems="start" tag="dd">
                    <Typography>{documentId}</Typography>
                  </Flex>
                </Grid.Item>
                <Grid.Item col={12} s={6} direction="column" alignItems="start">
                  <Typography variant="sigma" textColor="neutral600" tag="dt">
                    Status
                  </Typography>
                  <Flex gap={3} direction="column" alignItems="start" tag="dd">
                    <Typography>{documentStatus}</Typography>
                  </Flex>
                </Grid.Item>
                <Grid.Item col={12} s={6} direction="column" alignItems="start">
                  <Typography variant="sigma" textColor="neutral600" tag="dt">
                    Locale
                  </Typography>
                  <Typography tag="dd">{locale}</Typography>
                </Grid.Item>
              </Grid.Root>
              <Typography variant="delta" tag="h3">
                Rest API data
              </Typography>
              {revalidator.state === 'loading' && <Typography>Refreshing data...</Typography>}
              {main ? (
                <>
                  <Entry data={main} model={apiName} documentId={documentId} />
                  <JSONInput value={JSON.stringify(main, null, 2)} disabled />
                </>
              ) : (
                <Typography textColor="neutral600">No data found</Typography>
              )}
              {unrelated && (
                <>
                  <Typography variant="delta" tag="h3">
                    Unrelated API data
                  </Typography>
                  <Entry data={unrelated} model={apiName} documentId={documentId} />
                </>
              )}
            </Flex>
          </Layouts.Content>
        </Page.Main>
      </Layouts.Root>
    </Box>
  );
};

export { PreviewComponent };
