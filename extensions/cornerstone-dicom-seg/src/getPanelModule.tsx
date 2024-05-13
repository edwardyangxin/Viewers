import React from 'react';

import { useAppConfig } from '@state';
import { Toolbox } from '@ohif/ui';
import PanelSegmentation from './panels/PanelSegmentation';
import { SegmentationPanelMode } from './types/segmentation';
import i18n from '@ohif/i18n';

const getPanelModule = ({
  commandsManager,
  servicesManager,
  extensionManager,
  configuration,
  title,
}) => {
  const { customizationService } = servicesManager.services;

  const wrappedPanelSegmentation = configuration => {
    const [appConfig] = useAppConfig();

    const disableEditingForMode = customizationService.get('segmentation.disableEditing');
    const segmentationPanelMode =
      customizationService.get('segmentation.segmentationPanelMode')?.value ||
      SegmentationPanelMode.Dropdown;

    return (
      <PanelSegmentation
        commandsManager={commandsManager}
        servicesManager={servicesManager}
        extensionManager={extensionManager}
        configuration={{
          ...configuration,
          disableEditing: appConfig.disableEditing || disableEditingForMode?.value,
          segmentationPanelMode: segmentationPanelMode,
        }}
      />
    );
  };

  const wrappedPanelSegmentationWithTools = configuration => {
    const [appConfig] = useAppConfig();
    const segmentationPanelMode =
      customizationService.get('segmentation.segmentationPanelMode')?.value ||
      SegmentationPanelMode.Dropdown;

    return (
      <>
        <Toolbox
          commandsManager={commandsManager}
          servicesManager={servicesManager}
          extensionManager={extensionManager}
          buttonSectionId="segmentationToolbox"
          title="Segmentation Tools"
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
            segmentationPanelMode: segmentationPanelMode,
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
