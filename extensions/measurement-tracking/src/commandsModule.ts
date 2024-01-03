import {
  getEnabledElement,
  StackViewport,
  VolumeViewport,
  utilities as csUtils,
  Types as CoreTypes,
  BaseVolumeViewport,
} from '@cornerstonejs/core';
import {
  ToolGroupManager,
  Enums,
  utilities as cstUtils,
  ReferenceLinesTool,
} from '@cornerstonejs/tools';
import { Types as OhifTypes } from '@ohif/core';

import callInputDialog from './utils/callInputDialog';
import toggleIRCImageSync from './utils/toggleStackImageSync';

// evibased, based on cornerstone extension
function commandsModule({
  servicesManager,
  commandsManager,
}: OhifTypes.Extensions.ExtensionParams): OhifTypes.Extensions.CommandsModule {
  const {
    viewportGridService,
    toolGroupService,
    cineService,
    toolbarService,
    uiDialogService,
    cornerstoneViewportService,
    uiNotificationService,
    measurementService,
  } = servicesManager.services as CornerstoneServices;

  const actions = {
    /**
     * evibased, 注册新的编辑measurement command for IRC，保留原始command
     * Show the measurement labelling input dialog and update the label
     * on the measurement with a response if not cancelled.
     *
     * updated: set measurement data and label
     */
    setIRCMeasurementLabel: ({ uid }) => {
      const measurement = measurementService.getMeasurement(uid);

      callInputDialog(
        uiDialogService,
        measurement,
        (label, actionId) => {
          if (actionId === 'cancel') {
            return;
          }

          // copy measurement, get measurement again in case it has been updated。
          // 在创建annotation时，会不断更新长度。会导致update measurement为旧的长度错误。
          const currentMeasurement = measurementService.getMeasurement(uid);
          const updatedMeasurement = { ...currentMeasurement };
          // update label data
          updatedMeasurement['measurementLabelInfo'] = label['measurementLabelInfo'];
          updatedMeasurement['label'] = label['label'];

          // measurementService in platform core service module
          measurementService.update(updatedMeasurement.uid, updatedMeasurement, true); // notYetUpdatedAtSource = true
        },
        false // isArrowAnnotateInputDialog = false
      );
    },

    // evibased, 箭头标注callback, 默认不在此编辑
    IRCArrowTextCallback: ({ callback, data }) => {
      // callInputDialog(uiDialogService, data, callback);
      // 默认传回label，和创建annotation（save）
      callback('no label', 'save');
    },

    toggleIRCImageSync: ({ toggledState }) => {
      toggleIRCImageSync({
        servicesManager,
        toggledState,
      });
    },

    // Just call the toolbar service record interaction - allows
    // executing a toolbar command as a full toolbar command with side affects
    // coming from the ToolbarService itself.
    toolbarServiceRecordInteraction: props => {
      toolbarService.recordInteraction(props);
    },
  };

  const definitions = {
    // The command here is to show the viewer context menu, as being the
    // context menu
    setIRCMeasurementLabel: {
      commandFn: actions.setIRCMeasurementLabel,
    },
    IRCArrowTextCallback: {
      commandFn: actions.IRCArrowTextCallback,
    },
    toggleIRCImageSync: {
      commandFn: actions.toggleIRCImageSync,
    },
  };

  return {
    actions,
    definitions,
    defaultContext: 'CORNERSTONE',
  };
}

export default commandsModule;
