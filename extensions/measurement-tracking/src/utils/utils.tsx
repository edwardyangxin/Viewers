import React from 'react';
import { Input, Dialog, ButtonEnums, Select, CheckBox } from '@ohif/ui';
import i18n from '@ohif/i18n';

import { locationInfoMapping, locationOptions, nonTargetIndexOptions, 
  targetIndexOptions, targetInfoMapping, targetKeyGroup, targetOptions } from "./mappings";

function getViewportId(viewports, viewportName = 'default') {
  let targetViewportId = null;
  for (const viewport of viewports.values()) {
    const { viewportId, displaySetOptions } = viewport;
    // get id from displaySetOptions[0]
    const idLabel = displaySetOptions[0]['id'];
    if (idLabel === viewportName) {
      targetViewportId = viewportId;
      break;
    }
  }
  return targetViewportId;
}

function parseMeasurementLabelInfo(measurement) {
  const noMeasurement = measurement ? false : true;
  // label for 保存尽量多的label信息，因为cornerstonejs只支持保存label到DicomSR中
  let label = measurement ? measurement.label : '1|target_info|location_info';
  label = label.split('|');
  // try to backward compatible, deprecated?
  if (label.length === 1) {
    label = [1, label[0] ? label[0] : 'target_info', 'location_info'];
  } else if (label.length < 3) {
    // label at least 3 infos
    label.push('location_info');
  }

  // get measurementLabelInfo, noMeasurement means create Cornerstone3D annotation first just return label to callback!
  // if no measurementLabelInfo, get from label
  const measurementLabelInfo = measurement && measurement['measurementLabelInfo'] ?
    measurement['measurementLabelInfo'] : {};

  // init targetIndex, targetValue, locationValue
  if (!('targetIndex' in measurementLabelInfo)) {
    // no target in measurementLabelInfo, get from label
    const labelIndex = parseInt(label[0], 10);
    measurementLabelInfo['targetIndex'] = {
      value: labelIndex,
      label: labelIndex,
    };
  }

  if (!('target' in measurementLabelInfo)) {
    // no target in measurementLabelInfo, get from label
    const labelTarget = label[1];
    measurementLabelInfo['target'] = labelTarget in targetInfoMapping ? 
    {
      value: labelTarget,
      label: targetInfoMapping[labelTarget],
    } : {
      value: null,
      label: null,
    };
  }

  if (!('location' in measurementLabelInfo)) {
    // no target in measurementLabelInfo, get from label
    const labelLocation = label[2];
    measurementLabelInfo['location'] = labelLocation in locationInfoMapping ? 
    {
      value: labelLocation,
      label: locationInfoMapping[labelLocation],
    } : {
      value: null,
      label: null,
    };
  }

  return {
    noMeasurement: noMeasurement,
    measurementLabelInfo: measurementLabelInfo,
    label: label,
  };
}

function getEditMeasurementLabelDialog(dialogId, dialogTitle, valueDialog, 
  isArrowAnnotateTool, uiDialogService, onSubmitHandler) {
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
            <label className="text-[14px] leading-[1.2] text-white">选择病灶类型</label>
            <Select
              id="target"
              placeholder="选择病灶类型"
              value={value.measurementLabelInfo?.target ? [value.measurementLabelInfo?.target.value] : []} //select只能传入target value
              onChange={(newSelection, action) => {
                console.info('newSelection:', newSelection, 'action:', action);
                setValue(value => {
                  // update label info
                  value['measurementLabelInfo']['target'] = newSelection;
                  value['label'][1] = newSelection ? newSelection['value'] : '';
                  return value;
                });
              }}
              options={targetOptions}
            />
            <label className="text-[14px] leading-[1.2] text-white">选择病灶编号</label>
            <Select
              id="targetIndex"
              placeholder="选择病灶编号"
              value={value.measurementLabelInfo?.targetIndex ? [String(value.measurementLabelInfo?.targetIndex.value)] : []} //选项必须是string
              onChange={(newSelection, action) => {
                console.info('newSelection:', newSelection, 'action:', action);
                setValue(value => {
                  // update label info
                  value['measurementLabelInfo']['targetIndex'] = newSelection;
                  value['label'][0] = newSelection ? newSelection['value'] : '';
                  return value;
                });
              }}
              options={targetKeyGroup.includes(value['label'][1]) ? targetIndexOptions: nonTargetIndexOptions}
            />
            <label className="text-[14px] leading-[1.2] text-white">选择病灶位置</label>
            <Select
              id="location"
              placeholder="选择病灶位置"
              value={value.measurementLabelInfo?.location ? [value.measurementLabelInfo?.location.value] : []}
              onChange={(newSelection, action) => {
                console.info('newSelection:', newSelection, 'action:', action);
                setValue(value => {
                  // update label info
                  value['measurementLabelInfo']['location'] = newSelection;
                  value['label'][2] = newSelection ? newSelection['value'] : '';
                  return value;
                });
              }}
              options={locationOptions}
            />
            {!isArrowAnnotateTool && (
              <CheckBox
                label="病灶中存在空穴"
                checked={value.measurementLabelInfo?.cavitation}
                labelClassName="text-[12px] pl-1 pt-1"
                className="mb-[9px]"
                onChange={(flag) => {
                  console.info('flag:', flag);
                  setValue(value => {
                    // update label info
                    value['measurementLabelInfo']['cavitation'] = flag;
                    return value;
                  });
                }}
              />
            )}
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
  };
}

export { getViewportId, parseMeasurementLabelInfo, getEditMeasurementLabelDialog };
