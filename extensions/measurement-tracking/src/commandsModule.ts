import { Types as OhifTypes } from '@ohif/core';
import toggleIRCImageSync from './utils/toggleStackImageSync';

// evibased, based on cornerstone extension
function commandsModule({
  servicesManager,
  commandsManager,
}: OhifTypes.Extensions.ExtensionParams): OhifTypes.Extensions.CommandsModule {
  const { toolbarService, measurementService } = servicesManager.services as CornerstoneServices;

  const actions = {
    /**
     * evibased, 注册新的编辑measurement command for IRC，保留原始command
     * Show the measurement labelling input dialog and update the label
     * on the measurement with a response if not cancelled.
     *
     * updated: set measurement data and label
     */
    setIRCMeasurementLabel: ({ uid }) => {
      measurementService._broadcastEvent(measurementService.EVENTS.TRACKED_MEASUREMENT_EDIT, {
        uid,
      });
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
