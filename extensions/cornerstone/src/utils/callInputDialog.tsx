import React from 'react';
import { Input, Dialog, ButtonEnums, Select } from '@ohif/ui';
import i18n from '@ohif/i18n';

/**
 * TODO: evibased，使用统一的edit dialog，重构。保留原始的代码？
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
  callback, // update measurement
  isArrowAnnotateInputDialog = true, // if arrow use data.text else use data.label
  dialogConfig: any = {}
) {
  const dialogId = 'dialog-enter-annotation';
  // get data imageID info
  const dataMeasurement = measurement ? measurement.data : null;
  // TODO: 重构arrow和measure tool保存data的位置一致
  let dataImageId = {};
  if (dataMeasurement) {
    if (dataMeasurement.hasOwnProperty('dataImageId')) {
      // get arrow tool data
      dataImageId = dataMeasurement['dataImageId'];
    } else {
      // get measure tool data
      dataImageId = dataMeasurement[Object.keys(dataMeasurement)[0]];
    }
  }

  // label is for measurement title in measurement table
  const label = data
    ? isArrowAnnotateInputDialog
      ? data.text
      : data.label
    : '';

  const valueDialog = {
    dataImageId: dataImageId,
    label: label,
  };

  const {
    dialogTitle = i18n.t('Dialog:Annotation'),
    inputLabel = i18n.t('Dialog:Enter your annotation'),
    validateFunc = value => true, // validate submit value
  } = dialogConfig;

  // for select
  // init targetValue, locationValue
  let targetValue = null;
  if ('target' in dataImageId) {
    targetValue = dataImageId['target'];
  } else {
    dataImageId['target'] = targetValue;
  }

  let locationValue = null;
  if ('location' in dataImageId) {
    locationValue = dataImageId['location'];
  } else {
    dataImageId['location'] = locationValue;
  }

  // for dialog sumbit button
  const onSubmitHandler = ({ action, value }) => {
    switch (action.id) {
      case 'save':
        // disable validation TODO: validate
        // if (typeof validateFunc === 'function' && !validateFunc(value.label)) {
        //   return;
        // }
        callback(value, action.id);
        break;
      case 'cancel':
        callback(null, action.id);
        break;
    }
    uiDialogService.dismiss({ id: dialogId });
  };

  if (uiDialogService) {
    uiDialogService.create({
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
              <Select
                id="target"
                placeholder="选择目标"
                value={targetValue ? [targetValue.value] : []} //select只能传入target value
                onChange={(newSelection, action) => {
                  console.info(
                    'newSelection:',
                    newSelection,
                    'action:',
                    action
                  );
                  targetValue = newSelection;
                  setValue(value => {
                    // update dataImage
                    value['dataImageId']['target'] = targetValue;
                    return value;
                  });
                }}
                options={[
                  { value: 'Target', label: 'Target' },
                  { value: 'Target-CR', label: 'Target(CR)' },
                  { value: 'Target-UN', label: 'Target(UN未知)' },
                  { value: 'Non-Target', label: 'Non-Target' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
              <Select
                id="location"
                placeholder="选择病灶位置"
                value={locationValue ? [locationValue.value] : []}
                onChange={(newSelection, action) => {
                  console.info(
                    'newSelection:',
                    newSelection,
                    'action:',
                    action
                  );
                  locationValue = newSelection;
                  setValue(value => {
                    // update dataImage
                    value['dataImageId']['location'] = locationValue;
                    // update label
                    value['label'] = locationValue['label'];
                    return value;
                  });
                }}
                options={[
                  { value: 'Abdomen_Chest_Wall', label: 'Abdomen/Chest Wall' },
                  { value: 'Lung', label: 'Lung' },
                  { value: 'Lymph_Node', label: 'Lymph Node' },
                  { value: 'Liver', label: 'Liver' },
                  { value: 'Mediastinum_Hilum', label: 'Mediastinum/Hilum' },
                  { value: 'Pelvis', label: 'Pelvis' },
                  {
                    value: 'Petritoneum_Omentum',
                    label: 'Petritoneum/Omentum',
                  },
                  { value: 'Retroperitoneum', label: 'Retroperitoneum' },
                  { value: 'Adrenal', label: 'Adrenal' },
                  { value: 'Bladder', label: 'Bladder' },
                  { value: 'Bone', label: 'Bone' },
                  { value: 'Braine', label: 'Braine' },
                  { value: 'Breast', label: 'Breast' },
                  { value: 'Colon', label: 'Colon' },
                  { value: 'Esophagus', label: 'Esophagus' },
                  { value: 'Extremities', label: 'Extremities' },
                  { value: 'Gallbladder', label: 'Gallbladder' },
                  { value: 'Kidney', label: 'Kidney' },
                  { value: 'Muscle', label: 'Muscle' },
                  { value: 'Neck', label: 'Neck' },
                  { value: 'Other_Soft_Tissue', label: 'Other Soft Tissue' },
                  { value: 'Ovary', label: 'Ovary' },
                  { value: 'Pancreas', label: 'Pancreas' },
                  { value: 'Prostate', label: 'Prostate' },
                  { value: 'Small_Bowel', label: 'Small Bowel' },
                  { value: 'Spleen', label: 'Spleen' },
                  { value: 'Stomach', label: 'Stomach' },
                  { value: 'Subcutaneous', label: 'Subcutaneous' },
                ]}
              />
              {/* <Select
                id="side"
                placeholder="选择病灶方位"
                value={selectValue}
                onChange={onSelectChange}
                options={[
                  { value: 'Left', label: 'Left' },
                  { value: 'Right', label: 'Right' },
                  { value: 'Other', label: 'Other' },
                ]}
              /> */}
              {/* <Input
                autoFocus
                className="bg-black border-primary-main"
                type="text"
                id="annotation"
                label={inputLabel}
                labelClassName="text-white text-[14px] leading-[1.2]"
                value={value.label}
                onChange={event => {
                  event.persist();
                  setValue(value => ({ ...value, label: event.target.value }));
                }}
                onKeyPress={event => {
                  if (event.key === 'Enter') {
                    onSubmitHandler({ value, action: { id: 'save' } });
                  }
                }}
              /> */}
            </div>
          );
        },
      },
    });
  }
}

export default callInputDialog;
