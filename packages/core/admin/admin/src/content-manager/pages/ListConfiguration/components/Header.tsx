import { Button, HeaderLayout } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { useQueryParams } from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { capitalise } from '../../../../utils/strings';
import { useForm } from '../../../components/Form';
import { getTranslation } from '../../../utils/translations';

interface HeaderProps {
  collectionType: string;
  name: string;
  model: string;
}

const Header = ({ collectionType, name, model }: HeaderProps) => {
  const [{ rawQuery }] = useQueryParams();
  const { formatMessage } = useIntl();

  const modified = useForm('Header', (state) => state.modified);
  const isSubmitting = useForm('Header', (state) => state.isSubmitting);

  return (
    <HeaderLayout
      navigationAction={
        <Link
          startIcon={<ArrowLeft />}
          // @ts-expect-error invalid typings
          to={{
            pathname: `/content-manager/${collectionType}/${model}`,
            search: rawQuery,
          }}
          id="go-back"
          as={NavLink}
        >
          {formatMessage({ id: 'global.back', defaultMessage: 'Back' })}
        </Link>
      }
      primaryAction={
        <Button size="S" disabled={!modified} type="submit" loading={isSubmitting}>
          {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
        </Button>
      }
      subtitle={formatMessage({
        id: getTranslation('components.SettingsViewWrapper.pluginHeader.description.list-settings'),
        defaultMessage: 'Define the settings of the list view.',
      })}
      title={formatMessage(
        {
          id: getTranslation('components.SettingsViewWrapper.pluginHeader.title'),
          defaultMessage: 'Configure the view - {name}',
        },
        { name: capitalise(name) }
      )}
    />
  );
};

export { Header };
export type { HeaderProps };
