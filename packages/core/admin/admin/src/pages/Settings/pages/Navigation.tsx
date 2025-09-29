import { SubNav } from '../../../components/SubNav';
import { SettingsNav } from '../components/SettingsNav';

const Navigation = () => {
  return (
    <SubNav.PageWrapper>
      <SettingsNav isFullPage />
    </SubNav.PageWrapper>
  );
};

export { Navigation };
