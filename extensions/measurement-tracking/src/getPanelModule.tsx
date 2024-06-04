import { Types } from '@ohif/core';
import {
  PanelMeasurementTableTracking,
  PanelQCData,
  PanelStudyBrowserTracking,
  PastReports,
} from './panels';
import i18n from 'i18next';

// TODO:
// - No loading UI exists yet
// - cancel promises when component is destroyed
// - show errors in UI for thumbnails if promise fails
function getPanelModule({ commandsManager, extensionManager, servicesManager }): Types.Panel[] {
  return [
    {
      name: 'seriesList',
      iconName: 'tab-studies',
      iconLabel: 'Studies',
      label: i18n.t('StudyBrowser:Studies'),
      component: PanelStudyBrowserTracking.bind(null, {
        commandsManager,
        extensionManager,
        servicesManager,
      }),
    },

    {
      name: 'trackedMeasurements',
      iconName: 'tab-patient-info',
      iconLabel: 'Measure',
      label: '报告',
      component: PanelMeasurementTableTracking.bind(null, {
        commandsManager,
        extensionManager,
        servicesManager,
      }),
    },

    {
      name: 'pastReports',
      iconName: 'tab-studies',
      iconLabel: 'pastReports',
      label: '往期报告',
      component: PastReports.bind(null, {
        commandsManager,
        extensionManager,
        servicesManager,
      }),
    },

    {
      name: 'QCData',
      iconName: 'tab-patient-info',
      iconLabel: 'QCData',
      label: '质控数据',
      component: PanelQCData.bind(null, {
        commandsManager,
        extensionManager,
        servicesManager,
      }),
    },
  ];
}

export default getPanelModule;
