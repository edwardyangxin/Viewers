import i18n from '@ohif/i18n';
import { parseMeasurementLabelInfo, getEditMeasurementLabelDialog } from './utils';

/**
 * @param {*} data
 * @param {*} data.text
 * @param {*} data.label
 * @param {*} event
 * @param {*} callback
 * @param {*} isArrowAnnotateInputDialog
 * @param {*} dialogConfig
 * @param {string?} dialogConfig.dialogTitle - title of the input dialog
 * @param {string?} dialogConfig.inputLabel - show label above the input
 */
function callInputDialog(
  uiDialogService,
  measurement, // measurement entity
  comparedReportInfo,
  callback, // update measurement
  isArrowAnnotateInputDialog = true, // if arrow use data.text else use data.label
  dialogConfig: any = {}
) {
  const dialogId = 'dialog-enter-annotation';
  const valueDialog = parseMeasurementLabelInfo(measurement);
  valueDialog['comparedReportInfo'] = comparedReportInfo;

  const {
    dialogTitle = i18n.t('Dialog:Annotation'),
    inputLabel = i18n.t('Dialog:Enter your annotation'),
    validateFunc = value => true, // validate submit value
  } = dialogConfig;

  // for dialog sumbit button
  const onSubmitHandler = ({ action, value }) => {
    switch (action.id) {
      case 'save':
        // disable validation TODO: validate
        // if (typeof validateFunc === 'function' && !validateFunc(value.label)) {
        //   return;
        // }
        // join label list to 'xxx|xxx|xxx' format

        // reformat label, if noMeasurement return only label to Cornerstone3D to create annontation
        value['label'] = value['label'].join('|');
        callback(value['noMeasurement'] ? value['label'] : value, action.id);
        break;
      case 'cancel':
        callback(null, action.id);
        break;
    }
    uiDialogService.dismiss({ id: dialogId });
  };

  if (uiDialogService) {
    uiDialogService.create(
      getEditMeasurementLabelDialog(
        dialogId,
        dialogTitle,
        valueDialog,
        isArrowAnnotateInputDialog,
        uiDialogService,
        onSubmitHandler
      )
    );
  }
}

export default callInputDialog;
