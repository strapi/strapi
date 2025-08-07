import * as React from 'react';
import { useParams, useLoaderData, useRevalidator } from 'react-router-dom';

// @ts-ignore
import { Page, Layouts } from '@strapi/admin/strapi-admin';
import { Grid, Flex, Typography, JSONInput, Box } from '@strapi/design-system';

const filterAttributes = (item) => {
  const excludedKeys = ['documentId', 'id', 'createdAt', 'updatedAt', 'publishedAt'];
  return Object.entries(item).filter(([key]) => !excludedKeys.includes(key));
};

const PreviewComponent = () => {
  const { apiName, documentId, locale, status: documentStatus } = useParams();
  const data = useLoaderData();
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

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  React.useEffect(() => {
    if (data) {
      window.parent?.postMessage({ type: 'previewReady' }, '*');
    }
  }, [data]);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={100}
      background="neutral100"
      overflow="auto"
    >
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
                <Grid.Item col={6} s={12} direction="column" alignItems="start">
                  <Typography variant="sigma" textColor="neutral600" tag="dt">
                    Content Type
                  </Typography>
                  <Flex gap={3} direction="column" alignItems="start" tag="dd">
                    <Typography>{apiName}</Typography>
                  </Flex>
                </Grid.Item>
                <Grid.Item col={6} s={12} direction="column" alignItems="start">
                  <Typography variant="sigma" textColor="neutral600" tag="dt">
                    Document Id
                  </Typography>
                  <Flex gap={3} direction="column" alignItems="start" tag="dd">
                    <Typography>{documentId}</Typography>
                  </Flex>
                </Grid.Item>
                <Grid.Item col={6} s={12} direction="column" alignItems="start">
                  <Typography variant="sigma" textColor="neutral600" tag="dt">
                    Status
                  </Typography>
                  <Flex gap={3} direction="column" alignItems="start" tag="dd">
                    <Typography>{documentStatus}</Typography>
                  </Flex>
                </Grid.Item>
                <Grid.Item col={6} s={12} direction="column" alignItems="start">
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
              {data ? (
                <>
                  <Grid.Root gap={5} tag="dl">
                    {filterAttributes(data).map(([key, value]) => (
                      <Grid.Item key={key} col={6} s={12} direction="column" alignItems="start">
                        <Typography variant="sigma" textColor="neutral600" tag="dt">
                          {key}
                        </Typography>
                        <Flex gap={3} direction="column" alignItems="start" tag="dd">
                          <Typography>
                            {typeof value === 'object' && value !== null
                              ? JSON.stringify(value, null, 2)
                              : String(value)}
                          </Typography>
                        </Flex>
                      </Grid.Item>
                    ))}
                  </Grid.Root>
                  <JSONInput value={JSON.stringify(data, null, 2)} disabled />
                </>
              ) : (
                <Typography textColor="neutral600">No data found</Typography>
              )}
            </Flex>
          </Layouts.Content>
        </Page.Main>
      </Layouts.Root>
    </Box>
  );
};

export { PreviewComponent };
