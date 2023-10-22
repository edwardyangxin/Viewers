import React from 'react';

import { useAppConfig } from '@state';
import PanelSegmentation from './panels/PanelSegmentation';
import SegmentationToolbox from './panels/SegmentationToolbox';
import i18n from '@ohif/i18n';

const getPanelModule = ({ commandsManager, servicesManager, extensionManager, configuration }) => {
  const { customizationService } = servicesManager.services;

  const wrappedPanelSegmentation = configuration => {
    const [appConfig] = useAppConfig();

    const disableEditingForMode = customizationService.get('segmentation.disableEditing');

    return (
      <PanelSegmentation
        commandsManager={commandsManager}
        servicesManager={servicesManager}
        extensionManager={extensionManager}
        configuration={{
          ...configuration,
          disableEditing: appConfig.disableEditing || disableEditingForMode?.value,
        }}
      />
    );
  };

  const wrappedPanelSegmentationWithTools = configuration => {
    const [appConfig] = useAppConfig();
    return (
      <>
        <SegmentationToolbox
          commandsManager={commandsManager}
          servicesManager={servicesManager}
          extensionManager={extensionManager}
          configuration={{
            ...configuration,
          }}
        />
        <PanelSegmentation
          commandsManager={commandsManager}
          servicesManager={servicesManager}
          extensionManager={extensionManager}
          configuration={{
            ...configuration,
          }}
        />
      </>
    );
  };

  return [
    {
      name: 'panelSegmentation',
      iconName: 'tab-segmentation',
      iconLabel: 'Segmentation',
      label: i18n.t('SidePanel:Segmentation'),
      component: wrappedPanelSegmentation,
    },
    {
      name: 'panelSegmentationWithTools',
      iconName: 'tab-segmentation',
      iconLabel: 'Segmentation',
      label: i18n.t('SidePanel:Segmentation'),
      component: wrappedPanelSegmentationWithTools,
    },
  ];
};

export default getPanelModule;
