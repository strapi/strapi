import { Button, HeaderLayout } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useForm } from '../../../../components/Form';
import { BackButton } from '../../../../features/BackButton';
import { capitalise } from '../../../../utils/strings';
import { getTranslation } from '../../../utils/translations';

interface HeaderProps {
  collectionType: string;
  name: string;
  model: string;
}

const Header = ({ name }: HeaderProps) => {
  const { formatMessage } = useIntl();

  const modified = useForm('Header', (state) => state.modified);
  const isSubmitting = useForm('Header', (state) => state.isSubmitting);

  return (
    <HeaderLayout
      navigationAction={<BackButton />}
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
