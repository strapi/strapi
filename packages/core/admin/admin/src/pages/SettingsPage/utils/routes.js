// This file makes it easier to make the difference between the ee and ce version
import customRoutes from 'ee_else_ce/pages/SettingsPage/utils/customRoutes';
import defaultRoutes from './defaultRoutes';

export default [...customRoutes, ...defaultRoutes];
