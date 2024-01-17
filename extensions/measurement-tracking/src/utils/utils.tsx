import React from 'react';
import { Input, Dialog, ButtonEnums, Select, CheckBox } from '@ohif/ui';
import { annotation as CsAnnotation } from '@cornerstonejs/tools';
import i18n from '@ohif/i18n';

import {
  organMapping,
  organOptions,
  nonTargetIndexOptions,
  targetIndexOptions,
  LesionMapping,
  organLateralOptions,
  organLocationOptions,
  targetKeyGroup,
  lesionOptions,
} from './mappings';
import { utils } from '@ohif/core';

const { locking } = CsAnnotation;
const annotationManager = CsAnnotation.state.getAnnotationManager();

function getUserName(userAuthenticationService) {
  let username = 'unknown';
  const user = userAuthenticationService.getUser();
  if (user) {
    username = user.profile.preferred_username;
  }
  return username;
}

function getUserRoles(userAuthenticationService) {
  let userRoles = [];
  const user = userAuthenticationService.getUser();
  if (user?.profile?.realm_role) {
    userRoles = user.profile.realm_role;
  }
  return userRoles;
}

function getTimepointName(timepointId) {
  if (timepointId === null || timepointId === undefined) {
    return '未知';
  }
  return parseInt(timepointId) === 0 ? '基线' : `访视${timepointId}`;
}

function buildWadorsImageId(measurenemt, appConfig) {
  let { StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID, frame } = measurenemt;
  const { dataSources } = appConfig;
  const pacsConfig = dataSources[0];
  frame = frame || 1;
  return `wadors:${pacsConfig.configuration.wadoRoot}/studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}/frames/${frame}`;
}

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

function locationStrBuilder(measurementLabelInfo) {
  let lesionLocationStr = measurementLabelInfo.organ.label;
  lesionLocationStr += measurementLabelInfo.organLocation
    ? `-${measurementLabelInfo.organLocation.label}`
    : '';
  lesionLocationStr += measurementLabelInfo.organLateral
    ? `-${measurementLabelInfo.organLateral.label}`
    : '';
  lesionLocationStr += measurementLabelInfo.organDescription
    ? `(${measurementLabelInfo.organDescription})`
    : '';
  return lesionLocationStr;
}

function reportMeasurementToReadonlyMeasurement(
  extensionManager,
  measurementService,
  appConfig,
  measurement
) {
  const {
    readonlyMeasurementUID, // if readonlyMeasurementUID exists, means this measurement could has been added
    Patient_ID,
    Patient_Name,
    StudyInstanceUID,
    SeriesInstanceUID,
    SOPInstanceUID,
    Label,
    AnnotationType,
    Length,
    Width,
    Unit,
    FrameOfReferenceUID,
    points,
    label_info,
  } = measurement;

  if (readonlyMeasurementUID && measurementService.getReadonlyMeasurement(readonlyMeasurementUID)) {
    return readonlyMeasurementUID;
  }

  // based on hydrateStructuredReport in cornerstone-dicom-sr extension
  // use measurementService.addRawMeasurement to add measurement
  // get source
  const CORNERSTONE_3D_TOOLS_SOURCE_NAME = 'Cornerstone3DTools';
  const CORNERSTONE_3D_TOOLS_SOURCE_VERSION = '0.1';
  const source = measurementService.getSource(
    CORNERSTONE_3D_TOOLS_SOURCE_NAME,
    CORNERSTONE_3D_TOOLS_SOURCE_VERSION
  );
  // get AnnotationType, measurement["AnnotationType"] = "Cornerstone:Bidirectional"
  const annotationType = AnnotationType.split(':')[1];
  // get annotation
  // evibased: 注意这里imageId如果不对应的话，会导致annotation无法显示，这里参考了getWADORSImageId.js extension-default
  const referencedImageId = buildWadorsImageId(measurement, appConfig);
  const imageId = 'imageId:' + referencedImageId;
  const cachedStats = {
    [imageId]: {
      length: parseFloat(Length),
      width: parseFloat(Width),
    },
  };
  // turn points string to array [[x y z]]
  let handlesPoints = points.split(';');
  for (let i = 0; i < handlesPoints.length; i++) {
    handlesPoints[i] = handlesPoints[i].split(' ');
    for (let j = 0; j < handlesPoints[i].length; j++) {
      handlesPoints[i][j] = parseFloat(handlesPoints[i][j]);
    }
  }
  const annotationData = {
    handles: {
      points: handlesPoints,
      activeHandleIndex: 0,
      textBox: {
        hasMoved: false,
      },
    },
    cachedStats: cachedStats,
    frameNumber: undefined,
    label: Label,
    text: Label, // to support CornerstoneTools ArrowAnnotate
    finding: undefined,
    findingSites: undefined,
    site: undefined,
    measurementLabelInfo: label_info,
  };

  const annotation = {
    annotationUID: utils.guid(),
    data: annotationData,
    metadata: {
      toolName: annotationType,
      referencedImageId: referencedImageId,
      FrameOfReferenceUID,
    },
  };

  const mappings = measurementService.getSourceMappings(
    CORNERSTONE_3D_TOOLS_SOURCE_NAME,
    CORNERSTONE_3D_TOOLS_SOURCE_VERSION
  );
  const matchingMapping = mappings.find(m => m.annotationType === annotationType);

  // add measurement
  const newReadonlyMeasurementUID = measurementService.addReadonlyMeasurement(
    source,
    annotationType,
    { annotation },
    matchingMapping.toMeasurementSchema,
    extensionManager.getActiveDataSource()[0]
  );
  // disable editing, lock cornerstone annotation
  const addedAnnotation = annotationManager.getAnnotation(newReadonlyMeasurementUID);
  locking.setAnnotationLocked(addedAnnotation, true);

  console.log('newReadonlyMeasurementUID: ', newReadonlyMeasurementUID);
  return newReadonlyMeasurementUID;
}

function parseMeasurementLabelInfo(measurement) {
  const noMeasurement = measurement ? false : true;
  // label for 保存尽量多的label信息，因为cornerstonejs只支持保存label到DicomSR中
  let label = measurement ? measurement.label : '1|lesion_info|organ_info';
  label = label.split('|');
  // try to backward compatible, deprecated?
  if (label.length === 1) {
    label = [1, label[0] ? label[0] : 'lesion_info', 'organ_info'];
  } else if (label.length < 3) {
    // label at least 3 infos
    label.push('organ_info');
  }

  // get measurementLabelInfo, noMeasurement means create Cornerstone3D annotation first just return label to callback!
  // if no measurementLabelInfo, get from label
  const measurementLabelInfo =
    measurement && measurement['measurementLabelInfo'] ? measurement['measurementLabelInfo'] : {};

  // init lesionIndex, lesionValue, organValue
  if (!('lesionIndex' in measurementLabelInfo)) {
    // no lesion in measurementLabelInfo, get from label
    const lesionIndex = parseInt(label[0], 10);
    measurementLabelInfo['lesionIndex'] = {
      value: lesionIndex,
      label: lesionIndex,
    };
  }

  if (!('lesion' in measurementLabelInfo)) {
    // no lesion in measurementLabelInfo, get from label
    const lesionValue = label[1];
    measurementLabelInfo['lesion'] =
      lesionValue in LesionMapping
        ? {
            value: lesionValue,
            label: LesionMapping[lesionValue],
          }
        : {
            value: null,
            label: null,
          };
  }

  if (!('organ' in measurementLabelInfo)) {
    // no organ in measurementLabelInfo, get from label
    const organValue = label[2];
    measurementLabelInfo['organ'] =
      organValue in organMapping
        ? {
            value: organValue,
            label: organMapping[organValue],
          }
        : {
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

function getEditMeasurementLabelDialog(
  dialogId,
  dialogTitle,
  valueDialog,
  isArrowAnnotateTool,
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
            <label className="text-[14px] leading-[1.2] text-white">选择病灶类型</label>
            <Select
              id="lesion"
              placeholder="选择病灶类型"
              value={
                value.measurementLabelInfo?.lesion ? [value.measurementLabelInfo?.lesion.value] : []
              } //select只能传入lesion value
              onChange={(newSelection, action) => {
                console.info('newSelection:', newSelection, 'action:', action);
                setValue(value => {
                  // update label info
                  value['measurementLabelInfo']['lesion'] = newSelection;
                  value['label'][1] = newSelection ? newSelection['value'] : '';
                  return value;
                });
              }}
              options={lesionOptions}
            />
            <label className="mt-2 text-[14px] leading-[1.2] text-white">选择病灶编号</label>
            <Select
              id="lesionIndex"
              placeholder="选择病灶编号"
              value={
                value.measurementLabelInfo?.lesionIndex
                  ? [String(value.measurementLabelInfo?.lesionIndex.value)]
                  : []
              } //选项必须是string
              onChange={(newSelection, action) => {
                console.info('newSelection:', newSelection, 'action:', action);
                setValue(value => {
                  // update label info
                  value['measurementLabelInfo']['lesionIndex'] = newSelection;
                  value['label'][0] = newSelection ? newSelection['value'] : '';
                  return value;
                });
              }}
              options={
                targetKeyGroup.includes(value['label'][1])
                  ? targetIndexOptions
                  : nonTargetIndexOptions
              }
            />
            <label className="mt-2 text-[14px] leading-[1.2] text-white">选择病灶位置</label>
            <Select
              id="organ"
              placeholder="选择病灶器官"
              isSearchable={true}
              value={
                value.measurementLabelInfo?.organ ? [value.measurementLabelInfo?.organ.value] : []
              }
              onChange={(newSelection, action) => {
                console.info('newSelection:', newSelection, 'action:', action);
                setValue(value => {
                  // update label info
                  value['measurementLabelInfo']['organ'] = newSelection;
                  value['label'][2] = newSelection ? newSelection['value'] : '';
                  return value;
                });
              }}
              options={organOptions}
            />
            {value.measurementLabelInfo?.organ?.value in organLocationOptions && (
              <Select
                id="organLocation"
                placeholder="选择器官位置"
                isSearchable={true}
                value={
                  value.measurementLabelInfo?.organLocation
                    ? [value.measurementLabelInfo?.organLocation.value]
                    : []
                }
                onChange={(newSelection, action) => {
                  console.info('newSelection:', newSelection, 'action:', action);
                  setValue(value => {
                    // update label info
                    value['measurementLabelInfo']['organLocation'] = newSelection;
                    return value;
                  });
                }}
                options={organLocationOptions[value.measurementLabelInfo.organ.value]}
              />
            )}
            <Select
              id="organLateral"
              placeholder="选择器官方位"
              isSearchable={true}
              value={
                value.measurementLabelInfo?.organLateral
                  ? [value.measurementLabelInfo?.organLateral.value]
                  : []
              }
              onChange={(newSelection, action) => {
                console.info('newSelection:', newSelection, 'action:', action);
                setValue(value => {
                  // update label info
                  value['measurementLabelInfo']['organLateral'] = newSelection;
                  return value;
                });
              }}
              options={organLateralOptions}
            />
            <Input
              className="border-primary-main bg-black"
              type="text"
              id="organ-description"
              labelClassName="hidden text-white text-[10px] leading-[1.2]"
              smallInput={true}
              placeholder="病灶位置描述"
              value={
                value.measurementLabelInfo?.organDescription
                  ? value.measurementLabelInfo?.organDescription
                  : ''
              }
              onChange={event => {
                event.persist();
                setValue(value => {
                  console.info('event:', event);
                  // update label info
                  const newValue = {
                    ...value,
                    measurementLabelInfo: {
                      ...value.measurementLabelInfo,
                      organDescription: event.target.value,
                    },
                  };
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
                    const newValue = {
                      ...value,
                      measurementLabelInfo: {
                        ...value.measurementLabelInfo,
                        organDescription: event.target.value,
                      },
                    };
                    console.info('value:', newValue);
                    return newValue;
                  });
                }
              }}
            />
            <Input
              className="border-primary-main bg-black"
              type="text"
              id="comment"
              label="病灶备注"
              labelClassName="text-white text-[14px] leading-[1.2] mt-2"
              smallInput={false}
              placeholder="病灶备注"
              value={value.measurementLabelInfo?.comment ? value.measurementLabelInfo?.comment : ''}
              onChange={event => {
                event.persist();
                setValue(value => {
                  console.info('event:', event);
                  // update label info
                  const newValue = {
                    ...value,
                    measurementLabelInfo: {
                      ...value.measurementLabelInfo,
                      comment: event.target.value,
                    },
                  };
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
                    const newValue = {
                      ...value,
                      measurementLabelInfo: {
                        ...value.measurementLabelInfo,
                        comment: event.target.value,
                      },
                    };
                    console.info('value:', newValue);
                    return newValue;
                  });
                }
              }}
            />
            {!isArrowAnnotateTool && (
              <CheckBox
                label="病灶中存在空穴"
                checked={value.measurementLabelInfo?.cavitation}
                labelClassName="text-[12px] pl-1 pt-1"
                className="mb-[9px]"
                onChange={flag => {
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
          </div>
        );
      },
    },
  };
}

export {
  getUserName,
  getUserRoles,
  getTimepointName,
  buildWadorsImageId,
  getViewportId,
  locationStrBuilder,
  reportMeasurementToReadonlyMeasurement,
  parseMeasurementLabelInfo,
  getEditMeasurementLabelDialog,
};
