import React from 'react';

import { Flex, IconButton, Popover } from '@strapi/design-system';
import { CheckPermissions, LinkButton } from '@strapi/helper-plugin';
import { Cog, Layer } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { selectAdminPermissions } from '../../../../../pages/App/selectors';
import { FieldPicker } from '../FieldPicker';

export const ViewSettingsMenu = ({ slug, layout }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const cogButtonRef = React.useRef();
  const permissions = useSelector(selectAdminPermissions);
  const { formatMessage } = useIntl();

  const handleToggle = () => {
    setIsVisible((prev) => !prev);
  };

  return (
    <>
      <IconButton
        icon={<Cog />}
        label={formatMessage({
          id: 'components.ViewSettings.tooltip',
          defaultMessage: 'View Settings',
        })}
        ref={cogButtonRef}
        onClick={handleToggle}
      />
      {isVisible && (
        <Popover
          placement="bottom-end"
          source={cogButtonRef}
          onDismiss={handleToggle}
          spacing={4}
          padding={3}
        >
          <Flex alignItems="stretch" direction="column" gap={3}>
            <CheckPermissions
              permissions={permissions.contentManager.collectionTypesConfigurations}
            >
              <LinkButton
                size="S"
                startIcon={<Layer />}
                to={`${slug}/configurations/list`}
                variant="secondary"
              >
                {formatMessage({
                  id: 'app.links.configure-view',
                  defaultMessage: 'Configure the view',
                })}
              </LinkButton>
            </CheckPermissions>

            <FieldPicker layout={layout} />
          </Flex>
        </Popover>
      )}
    </>
  );
};

ViewSettingsMenu.propTypes = {
  slug: PropTypes.string.isRequired,
  layout: PropTypes.shape({
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
};
