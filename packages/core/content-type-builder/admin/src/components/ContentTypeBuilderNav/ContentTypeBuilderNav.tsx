import { Fragment } from 'react';

import { SubNav } from '@strapi/admin/strapi-admin';
import { Box, Searchbar, Divider, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { pluginId } from '../../pluginId';
import { getTrad } from '../../utils/getTrad';
import { Status } from '../Status';

import { useContentTypeBuilderMenu } from './useContentTypeBuilderMenu';

export const ContentTypeBuilderNav = () => {
  const { menu, search } = useContentTypeBuilderMenu();
  const { formatMessage } = useIntl();

  const pluginName = formatMessage({
    id: getTrad('plugin.name'),
    defaultMessage: 'Content-Type Builder',
  });

  return (
    <SubNav.Main aria-label={pluginName}>
      <SubNav.Header label={pluginName} />
      <Divider background="neutral150" />
      {/* Save and its history menu live in the page header now, where every
          other page of the admin keeps its actions. What is left here is a
          list of names and a way to filter it. */}
      <Flex padding={5} gap={3} direction={'column'} alignItems={'stretch'}>
        <Searchbar
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          onClear={() => search.onChange('')}
          placeholder={formatMessage({
            id: getTrad('search.placeholder'),
            defaultMessage: 'Search',
          })}
          size="S"
          // eslint-disable-next-line react/no-children-prop
          children={undefined}
          name={'search_contentType'}
          clearLabel={formatMessage({ id: 'clearLabel', defaultMessage: 'Clear' })}
          aria-label={formatMessage({
            id: getTrad('search.placeholder'),
            defaultMessage: 'Search',
          })}
        />
      </Flex>
      <Box paddingLeft={5} paddingRight={5} paddingBottom={2}>
        <SubNav.Link
          to={`/plugins/${pluginId}`}
          end
          label={formatMessage({
            id: getTrad('index.title'),
            defaultMessage: 'All content types',
          })}
        />
      </Box>
      <SubNav.Content>
        <SubNav.Sections>
          {menu.map((section) => (
            <Fragment key={section.name}>
              <SubNav.Section
                label={formatMessage({
                  id: section.title.id,
                  defaultMessage: section.title.defaultMessage,
                })}
                link={
                  section.customLink && {
                    label: formatMessage({
                      id: section.customLink?.id,
                      defaultMessage: section.customLink?.defaultMessage,
                    }),
                    onClick: section.customLink?.onClick,
                  }
                }
                sectionId={section.name}
              >
                {section.links.map((link) => {
                  const linkLabel = formatMessage({ id: link.name, defaultMessage: link.title });

                  if ('links' in link) {
                    return (
                      <SubNav.SubSection key={link.name} label={link.title}>
                        {link.links.map((subLink) => {
                          const label = formatMessage({
                            id: subLink.name,
                            defaultMessage: subLink.title,
                          });

                          return (
                            <SubNav.Link
                              to={subLink.to}
                              key={subLink.name}
                              label={label}
                              endAction={
                                <Box tag="span" textAlign="center" width={'24px'}>
                                  <Status status={subLink.status} />
                                </Box>
                              }
                            />
                          );
                        })}
                      </SubNav.SubSection>
                    );
                  }

                  return (
                    <SubNav.Link
                      to={link.to}
                      key={link.name}
                      label={linkLabel}
                      endAction={
                        <Box tag="span" textAlign="center" width={'24px'}>
                          <Status status={link.status} />
                        </Box>
                      }
                    />
                  );
                })}
              </SubNav.Section>
            </Fragment>
          ))}
        </SubNav.Sections>
      </SubNav.Content>
    </SubNav.Main>
  );
};
