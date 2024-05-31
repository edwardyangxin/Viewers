import { AllInOneMenu, Icon } from '@ohif/ui';
import React, { ReactElement } from 'react';
import { VolumeRenderingPresetsProps } from '../../types/ViewportPresets';
import { VolumeRenderingPresetsContent } from './VolumeRenderingPresetsContent';

export function VolumeRenderingPresets({
  viewportId,
  serviceManager,
  commandsManager,
  volumeRenderingPresets,
}: VolumeRenderingPresetsProps): ReactElement {
  const { uiModalService } = serviceManager.services;

  const onClickPresets = () => {
    uiModalService.show({
      content: VolumeRenderingPresetsContent,
      title: '重建预设效果设置',
      movable: true,
      contentProps: {
        onClose: uiModalService.hide,
        presets: volumeRenderingPresets,
        viewportId,
        commandsManager,
      },
      containerDimensions: 'h-[543px] w-[460px]',
      contentDimensions: 'h-[493px] w-[460px]  pl-[12px] pr-[12px]',
    });
  };

  return (
    <AllInOneMenu.Item
      label="重建预设效果设置"
      icon={<Icon name="VolumeRendering" />}
      rightIcon={<Icon name="action-new-dialog" />}
      onClick={onClickPresets}
    />
  );
}
