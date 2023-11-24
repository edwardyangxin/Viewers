import React from 'react';
import { Input, Dialog, ButtonEnums, Select } from '@ohif/ui';
import i18n from '@ohif/i18n';

// TODO: evibased, info mapping refactor to one location
const targetIndexMapping = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
};

const target_info_mapping = {
  Target: 'Target',
  Target_CR: 'Target(CR)',
  Target_UN: 'Target(UN未知)',
  Non_Target: 'Non_Target',
  Non_Target_Disappear: 'Non_Target(消失)',
  Non_Target_Progress: 'Non_Target(发展Progress)',
  Non_Target_New: 'Non_Target(新发New)',
  Other: 'Other',
};

const location_info_mapping = {
  Abdomen_Chest_Wall: 'Abdomen/Chest Wall',
  Lung: 'Lung',
  Lymph_Node: 'Lymph Node',
  Liver: 'Liver',
  Mediastinum_Hilum: 'Mediastinum/Hilum',
  Pelvis: 'Pelvis',
  Petritoneum_Omentum: 'Petritoneum/Omentum',
  Retroperitoneum: 'Retroperitoneum',
  Adrenal: 'Adrenal',
  Bladder: 'Bladder',
  Bone: 'Bone',
  Braine: 'Braine',
  Breast: 'Breast',
  Colon: 'Colon',
  Esophagus: 'Esophagus',
  Extremities: 'Extremities',
  Gallbladder: 'Gallbladder',
  Kidney: 'Kidney',
  Muscle: 'Muscle',
  Neck: 'Neck',
  Other_Soft_Tissue: 'Other Soft Tissue',
  Ovary: 'Ovary',
  Pancreas: 'Pancreas',
  Prostate: 'Prostate',
  Small_Bowel: 'Small Bowel',
  Spleen: 'Spleen',
  Stomach: 'Stomach',
  Subcutaneous: 'Subcutaneous',
};

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

  const noMeasurement = measurement ? false : true
  // label for 保存尽量多的label信息，因为cornerstonejs只支持保存label到DicomSR中
  let label = measurement
    ? isArrowAnnotateInputDialog
      ? measurement.text
      : measurement.label
    : '1|target_info|location_info';
  label = label.split("|")
  if (label.length === 1) {
    label = [1, label[0], 'location_info']
  } else if (label.length < 3) {
    // label at least 3 infos
    label.push('location_info');
  }

  // get measurementLabelInfo, noMeasurement means create Cornerstone3D annotation first just return label to callback!
  // if no measurementLabelInfo, get from label
  const measurementLabelInfo = measurement && measurement['measurementLabelInfo'] ?
    measurement['measurementLabelInfo'] : {}

  const valueDialog = {
    noMeasurement: noMeasurement,
    measurementLabelInfo: measurementLabelInfo,
    label: label,
  };

  const {
    dialogTitle = i18n.t('Dialog:Annotation'),
    inputLabel = i18n.t('Dialog:Enter your annotation'),
    validateFunc = value => true, // validate submit value
  } = dialogConfig;

  // init targetIndex, targetValue, locationValue
  let targetIndex = null;
  if ('targetIndex' in measurementLabelInfo) {
    targetIndex = measurementLabelInfo['targetIndex'];
  } else {
    // no target in measurementLabelInfo, get from label
    let labelIndex = parseInt(label[0], 10);
    targetIndex = {
      value: labelIndex,
      label: labelIndex,
    }
    measurementLabelInfo['targetIndex'] = targetIndex;
  }

  let targetValue = null;
  if ('target' in measurementLabelInfo) {
    targetValue = measurementLabelInfo['target'];
  } else {
    // no target in measurementLabelInfo, get from label
    let labelTarget = label[0]
    if (labelTarget in target_info_mapping) {
      targetValue = {
        'value': labelTarget,
        'label': target_info_mapping[labelTarget]
      }
    }
    measurementLabelInfo['target'] = targetValue;
  }

  let locationValue = null;
  if ('location' in measurementLabelInfo) {
    locationValue = measurementLabelInfo['location'];
  } else {
    // no target in measurementLabelInfo, get from label
    let labelLocation = label[1]
    if (labelLocation in location_info_mapping) {
      locationValue = {
        'value': labelLocation,
        'label': location_info_mapping[labelLocation]
      }
    }
    measurementLabelInfo['location'] = locationValue;
  }

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
          const targetIndexOptions = [];
          for (const [key, value] of Object.entries(targetIndexMapping)) {
            targetIndexOptions.push({ value: key, label: value });
          }
          let targetOptions = [];
          for (const [key, value] of Object.entries(target_info_mapping)) {
            targetOptions.push({ value: key, label: value });
          }
          let locationOptions = [];
          for (const [key, value] of Object.entries(location_info_mapping)) {
            locationOptions.push({ value: key, label: value });
          }
          return (
            <div>
              <Select
                id="targetIndex"
                placeholder="选择目标编号"
                value={targetIndex ? [targetIndex.value] : [1]} //select只能传入target value
                onChange={(newSelection, action) => {
                  console.info('newSelection:', newSelection, 'action:', action);
                  targetIndex = newSelection;
                  setValue(value => {
                    // update label info
                    value['measurementLabelInfo']['targetIndex'] = targetIndex;
                    value['label'][0] = targetIndex['value'];
                    return value;
                  });
                }}
                options={targetIndexOptions}
              />
              <Select
                id="target"
                placeholder="选择目标类型"
                value={targetValue ? [targetValue.value] : []} //select只能传入target value
                onChange={(newSelection, action) => {
                  console.info('newSelection:', newSelection, 'action:', action);
                  targetValue = newSelection;
                  setValue(value => {
                    // update label info
                    value['measurementLabelInfo']['target'] = targetValue;
                    value['label'][1] = targetValue['value'];
                    return value;
                  });
                }}
                options={targetOptions}
              />
              <Select
                id="location"
                placeholder="选择病灶位置"
                value={locationValue ? [locationValue.value] : []}
                onChange={(newSelection, action) => {
                  console.info('newSelection:', newSelection, 'action:', action);
                  locationValue = newSelection;
                  setValue(value => {
                    // update label info
                    value['measurementLabelInfo']['location'] = locationValue;
                    value['label'][2] = locationValue['value'];
                    return value;
                  });
                }}
                options={locationOptions}
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
