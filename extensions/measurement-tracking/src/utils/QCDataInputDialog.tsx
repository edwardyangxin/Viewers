import React from 'react';
import { Input, Dialog, ButtonEnums, Select } from '@ohif/ui';
import i18n from '@ohif/i18n';
import { parseQCDataInfo } from './utils';
import { DataProblemType, dataProblemTypeOptions, dicomTagOptions } from './mappings';

/**
 * @param {*} data
 * @param {*} data.text
 * @param {*} data.label
 * @param {*} event
 * @param {*} callback
 * @param {*} isNonMeasurementTool
 * @param {*} dialogConfig
 * @param {string?} dialogConfig.dialogTitle - title of the input dialog
 * @param {string?} dialogConfig.inputLabel - show label above the input
 */
function QCDataInputDialog(
  uiDialogService,
  measurement, // measurement entity
  callback, // update measurement
  dialogConfig: any = {}
) {
  const dialogId = 'dialog-enter-annotation';
  const valueDialog = parseQCDataInfo(measurement);

  const { dialogTitle = '数据问题记录' } = dialogConfig;

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
      getEditQCDataLabelDialog(
        dialogId,
        dialogTitle,
        valueDialog,
        uiDialogService,
        onSubmitHandler
      )
    );
  }
}

function getEditQCDataLabelDialog(
  dialogId,
  dialogTitle,
  valueDialog,
  uiDialogService,
  onSubmitHandler
) {
  return {
    id: dialogId,
    centralize: true,
    isDraggable: false,
    showOverlay: true,
    content: Dialog,
    contentProps: {
      title: dialogTitle,
      value: valueDialog,
      noCloseButton: true,
      onClose: () => uiDialogService.dismiss({ id: dialogId }),
      actions: [
        {
          id: 'cancel',
          text: i18n.t('Dialog:Cancel'),
          type: ButtonEnums.type.secondary,
        },
        {
          id: 'save',
          text: i18n.t('Dialog:Save'),
          type: ButtonEnums.type.primary,
        },
      ],
      onSubmit: onSubmitHandler,
      body: ({ value, setValue }) => {
        return (
          <div>
            <label className="text-[14px] leading-[1.2] text-white">选择问题类型</label>
            <Select
              id="dataProblemType"
              placeholder="选择问题类型"
              value={
                value.measurementLabelInfo?.dataProblemType
                  ? [value.measurementLabelInfo?.dataProblemType.value]
                  : [DataProblemType.DELETE_SERIES]
              } //select只能传入lesion value
              onChange={(newSelection, action) => {
                console.info('newSelection:', newSelection, 'action:', action);
                setValue(value => {
                  // update label info
                  value['measurementLabelInfo']['dataProblemType'] = newSelection;
                  value['label'][0] = newSelection ? newSelection['value'] : '';
                  return value;
                });
              }}
              options={dataProblemTypeOptions}
            />
            <label className="mt-2 text-[14px] leading-[1.2] text-white">选择tag</label>
            <Select
              id="dicomTag"
              placeholder="选择tag"
              value={
                value.measurementLabelInfo?.dicomTagModify
                  ? [String(value.measurementLabelInfo?.dicomTagModify.value)]
                  : []
              } //选项必须是string
              onChange={(newSelection, action) => {
                console.info('newSelection:', newSelection, 'action:', action);
                setValue(value => {
                  // update label info
                  value['measurementLabelInfo']['dicomTagModify'] = newSelection;
                  value['label'][1] = newSelection ? newSelection['value'] : '';
                  return value;
                });
              }}
              options={dicomTagOptions}
            />
            <Input
              className="border-primary-main bg-black"
              type="text"
              id="dataProblemComment"
              label="病灶备注"
              labelClassName="text-white text-[14px] leading-[1.2] mt-2"
              smallInput={false}
              placeholder="病灶备注"
              value={value.measurementLabelInfo?.dataProblemComment ? value.measurementLabelInfo?.dataProblemComment : ''}
              onChange={event => {
                event.persist();
                setValue(value => {
                  console.info('event:', event);
                  // update label info
                  const ifModifyTag = value.measurementLabelInfo?.dicomTagModify ? true : false;
                  const newValue = {
                    ...value,
                    measurementLabelInfo: {
                      ...value.measurementLabelInfo,
                      dataProblemComment: event.target.value,
                    },
                  };
                  if (ifModifyTag) {
                    newValue['label'][2] = event.target.value;
                  } else {
                    newValue['label'][1] = event.target.value;
                  }
                  console.info('value:', newValue);
                  return newValue;
                });
              }}
              onKeyUp={event => {
                event.persist();
                if (event.key === 'Enter') {
                  setValue(value => {
                    console.info('event:', event);
                    // update label info
                    const ifModifyTag = value.measurementLabelInfo?.dicomTagModify ? true : false;
                    const newValue = {
                      ...value,
                      measurementLabelInfo: {
                        ...value.measurementLabelInfo,
                        dataProblemComment: event.target.value,
                      },
                    };
                    if (ifModifyTag) {
                      newValue['label'][2] = event.target.value;
                    } else {
                      newValue['label'][1] = event.target.value;
                    }
                    console.info('value:', newValue);
                    return newValue;
                  });
                }
              }}
            />
          </div>
        );
      },
    },
  };
}

export default QCDataInputDialog;
