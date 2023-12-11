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
          /** label in form:
            {measurementLabelInfo: {
              length: 221.56495778786802,
              unit: "mm",
              target: {
                value: "Target-CR",
                label: "Target(CR)",
              },
              location: {
                value: "Liver",
                label: "Liver",
              },
            },
            label: "Target|Liver"}
          */
          if (actionId === 'cancel') {
            return;
          }

          // copy measurement
          const updatedMeasurement = { ...measurement };
          // update label data
          updatedMeasurement['measurementLabelInfo'] = label['measurementLabelInfo'];
          updatedMeasurement['label'] = label['label'];

          // measurementService in platform core service module
          measurementService.update(updatedMeasurement.uid, updatedMeasurement, true); // notYetUpdatedAtSource = true
        },
        false // isArrowAnnotateInputDialog = false
      );
    },

    // evibased, 箭头标注，重构，独立的command
    IRCArrowTextCallback: ({ callback, data }) => {
      callInputDialog(uiDialogService, data, callback);
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
  };

  return {
    actions,
    definitions,
    defaultContext: 'CORNERSTONE',
  };
}

export default commandsModule;
