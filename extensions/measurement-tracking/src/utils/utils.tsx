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
  newLesionKeyGroup,
  nonTargetKeyGroup,
  targetResponseOptions,
  nonTargetResponseOptions,
  responseOptions,
  LesionMeasurementOptions,
  dataProblemTypeMapping,
} from './mappings';
import { utils } from '@ohif/core';
import TargetListTable, { TargetListExpandedRow } from '../ui/TargetListTable';
import ReportDialog from '../ui/ReportDialog';

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
  // deprecated, remove timepoint prefix, 现在没有T前缀
  timepointId = timepointId.startsWith('T') ? timepointId.slice(1) : timepointId;
  let timepointName = '';
  if (timepointId === '00' || timepointId === '0') {
    timepointName = '基线';
  } else if (timepointId.length === 3) {
    // the 3rd character is the unscheduled visit number
    const unscheduledVisitNumber = timepointId[2];
    timepointName = `访视${timepointId.slice(0, 2)}后计划外(${unscheduledVisitNumber})`;
  } else if (timepointId.length <= 2) {
    timepointName = `访视${timepointId}`;
  }
  return timepointName;
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

// TODO: This could be a measurementService mapper?
function mapMeasurementToDisplay(measurement, displaySetService) {
  const { referenceStudyUID, referenceSeriesUID, SOPInstanceUID } = measurement;

  // TODO: We don't deal with multiframe well yet, would need to update
  // This in OHIF-312 when we add FrameIndex to measurements.

  // deprecated
  // const instance = DicomMetadataStore.getInstance(
  //   referenceStudyUID,
  //   referenceSeriesUID,
  //   SOPInstanceUID
  // );

  const displaySets = displaySetService.getDisplaySetsForSeries(referenceSeriesUID);

  if (!displaySets[0] || !displaySets[0].images) {
    throw new Error('The tracked measurements panel should only be tracking "stack" displaySets.');
  }

  const {
    displayText: baseDisplayText,
    uid,
    label: baseLabel,
    type,
    selected,
    findingSites,
    finding,
    measurementLabelInfo, // evibased, add measurementLabelInfo
    toolName, // evibased
    data, // evibased
  } = measurement;

  const firstSite = findingSites?.[0];
  const label = baseLabel || finding?.text || firstSite?.text || '(empty)';
  let displayText = baseDisplayText || [];
  if (findingSites) {
    const siteText = [];
    findingSites.forEach(site => {
      if (site?.text !== label) {
        siteText.push(site.text);
      }
    });
    displayText = [...siteText, ...displayText];
  }
  if (finding && finding?.text !== label) {
    displayText = [finding.text, ...displayText];
  }

  return {
    uid,
    label,
    baseLabel,
    measurementType: type,
    displayText,
    baseDisplayText,
    isActive: selected,
    finding,
    findingSites,
    measurementLabelInfo, // evibased
    toolName, // evibased
    data, // evibased
    modality: displaySets[0]?.Modality, // evibased
  };
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

function parseQCDataInfo(measurement) {
  const noMeasurement = measurement ? false : true;
  // label for 保存尽量多的label信息，因为cornerstonejs只支持保存label到DicomSR中
  let label = measurement ? measurement.label : 'problem_info|comment_info';
  label = label.split('|');

  // get measurementLabelInfo, noMeasurement means create Cornerstone3D annotation first just return label to callback!
  // if no measurementLabelInfo, get from label
  const measurementLabelInfo =
    measurement && measurement['measurementLabelInfo'] ? measurement['measurementLabelInfo'] : {};

  // init dataProblemType, lesionValue, organValue
  if (!('dataProblemType' in measurementLabelInfo)) {
    // no dataProblemType in measurementLabelInfo, get from label
    const dataProblemTypeValue = label[0];
    measurementLabelInfo['dataProblemType'] =
    dataProblemTypeValue in dataProblemTypeMapping
        ? {
            value: dataProblemTypeValue,
            label: dataProblemTypeMapping[dataProblemTypeValue],
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

function reportToReportFindings(report) {
  const measurements = report.measurements;
  const targetFindings = [];
  const nonTargetFindings = [];
  const newLesionFindings = [];
  const otherFindings = [];
  for (const dm of measurements) {
    // get target info
    const lesionValue = dm.Label.split('|')[1];
    if (!(lesionValue in LesionMapping)) {
      // not in LesionMapping, just show and allow edit in other group
      otherFindings.push(dm);
    } else if (targetKeyGroup.includes(lesionValue)) {
      targetFindings.push(dm);
    } else if (newLesionKeyGroup.includes(lesionValue)) {
      newLesionFindings.push(dm);
    } else if (nonTargetKeyGroup.includes(lesionValue)) {
      nonTargetFindings.push(dm);
    } else {
      otherFindings.push(dm);
    }
  }
  // sort by index, get index from label, TODO: get index from measurementLabelInfo
  targetFindings.sort((a, b) => parseInt(a.Label.split('|')[0]) - parseInt(b.Label.split('|')[0]));
  newLesionFindings.sort(
    (a, b) => parseInt(a.Label.split('|')[0]) - parseInt(b.Label.split('|')[0])
  );
  nonTargetFindings.sort(
    (a, b) => parseInt(a.Label.split('|')[0]) - parseInt(b.Label.split('|')[0])
  );
  // do not show otherFindings in report?
  otherFindings.sort((a, b) => parseInt(a.Label.split('|')[0]) - parseInt(b.Label.split('|')[0]));

  return {
    targetFindings: targetFindings,
    newLesionFindings: newLesionFindings,
    nonTargetFindings: nonTargetFindings,
    otherFindings: otherFindings,
  };
}

function getTargetExpandedContent(targetFindings) {
  // target info split into non-Nymph nodes and Nymph nodes
  const nonNymphNodes = [];
  const NymphNodes = [];
  for (const dm of targetFindings) {
    const organ = dm.label_info.organ.value;
    if (organ === 'Lymph_Node') {
      NymphNodes.push(dm);
    } else {
      nonNymphNodes.push(dm);
    }
  }

  return (
    <>
      <TargetListExpandedRow
        tableTitle="非淋巴结靶病灶"
        tableColumns={{
          index: '序号',
          lesionType: '靶病灶类型',
          lesionLocation: '靶病灶位置',
          diameter: '长径(单位:mm)',
          comment: '备注',
        }}
        tableDataSource={nonNymphNodes.map((dm, index) => {
          const lesionIndex = dm.label_info.lesionIndex;
          const lesion = dm.label_info.lesion;
          const lesionLocationStr = locationStrBuilder(dm.label_info);
          // get diameter
          let diameter = 0.0;
          // get long and short axis
          if (dm.AnnotationType.split(':')[1] === 'Bidirectional') {
            // bi-dimensional tool
            // get long axis
            diameter = dm.Length;
          } else if (dm.AnnotationType.split(':')[1] === 'Length') {
            // single axis tool
            diameter = dm.Length;
          } else {
            // no axis info
            if (lesion.value === 'Target_NM') {
              // Target_NM 太小无法测量，计5mm
              diameter = 5.0;
            }
          }

          return {
            index: lesionIndex.label,
            lesionType: lesion.label,
            lesionLocation: lesionLocationStr,
            diameter: `${diameter.toFixed(1)} mm`,
            comment: dm.label_info.comment ? dm.label_info.comment : '',
          };
        })}
      />
      {NymphNodes.length > 0 && (
        <TargetListExpandedRow
          tableTitle="淋巴结靶病灶"
          tableColumns={{
            index: '序号',
            lesionType: '靶病灶类型',
            lesionLocation: '靶病灶位置',
            diameter: '短径(单位:mm)',
            comment: '备注',
          }}
          tableDataSource={NymphNodes.map((dm, index) => {
            const lesionIndex = dm.label_info.lesionIndex;
            const lesion = dm.label_info.lesion;
            const lesionLocationStr = locationStrBuilder(dm.label_info);
            // get diameter
            let diameter = 0.0;
            // get long and short axis
            if (dm.AnnotationType.split(':')[1] === 'Bidirectional') {
              // bi-dimensional tool
              // get short axis
              diameter = dm.Width;
            } else if (dm.AnnotationType.split(':')[1] === 'Length') {
              // single axis tool
              diameter = dm.Length;
            } else {
              // no axis info
              if (lesion.value === 'Target_NM') {
                // Target_NM 太小无法测量，计5mm
                diameter = 5.0;
              }
            }

            return {
              index: lesionIndex.label,
              lesionType: lesion.label,
              lesionLocation: lesionLocationStr,
              diameter: `${diameter.toFixed(1)} mm`,
              comment: dm.label_info.comment ? dm.label_info.comment : '',
            };
          })}
        />
      )}
    </>
  );
}

function getNonTargetExpandedContent(nonTargetFindings) {
  return (
    <>
      <TargetListExpandedRow
        // tableTitle="非靶病灶"
        tableColumns={{
          index: '序号',
          lesionType: '非靶病灶类型',
          lesionLocation: '非靶病灶位置',
          displayText: '描述信息',
          comment: '备注',
        }}
        tableDataSource={nonTargetFindings.map((dm, index) => {
          const lesionIndex = dm.label_info.lesionIndex;
          const lesion = dm.label_info.lesion;
          const lesionLocationStr = locationStrBuilder(dm.label_info);
          return {
            index: lesionIndex.label,
            lesionType: lesion.label,
            lesionLocation: lesionLocationStr,
            displayText: '',
            comment: dm.label_info.comment ? dm.label_info.comment : '',
          };
        })}
      />
    </>
  );
}

function getNewLesionExpandedContent(newLesionFindings) {
  // target info split into possible new and new lesions
  const possibleNews = [];
  const newLeisions = [];
  for (const dm of newLesionFindings) {
    const lesionValue = dm.label_info.lesion.value;
    if (lesionValue === 'New_Lesion') {
      newLeisions.push(dm);
    } else {
      possibleNews.push(dm);
    }
  }

  return (
    <>
      <TargetListExpandedRow
        tableTitle="疑似新发病灶"
        tabelBgColor="bg-red-800"
        tableColumns={{
          index: '序号',
          lesionType: '新发病灶类型',
          lesionLocation: '新发病灶位置',
          displayText: '描述信息',
          comment: '备注',
        }}
        tableDataSource={possibleNews.map((dm, index) => {
          const lesionIndex = dm.label_info.lesionIndex;
          const lesion = dm.label_info.lesion;
          const lesionLocationStr = locationStrBuilder(dm.label_info);
          return {
            index: lesionIndex.label,
            lesionType: lesion.label,
            lesionLocation: lesionLocationStr,
            displayText: '',
            comment: dm.label_info.comment ? dm.label_info.comment : '',
          };
        })}
      />
      {newLeisions.length > 0 && (
        <TargetListExpandedRow
          tableTitle="确认新发病灶"
          tabelBgColor="bg-red-500"
          tableColumns={{
            index: '序号',
            lesionType: '新发病灶类型',
            lesionLocation: '新发病灶位置',
            displayText: '描述信息',
          }}
          tableDataSource={newLeisions.map((dm, index) => {
            const lesionIndex = dm.label_info.lesionIndex;
            const lesion = dm.label_info.lesion;
            const organStr =
              dm.label_info.organ.label +
              (dm.label_info.organDescription ? `(${dm.label_info.organDescription})` : '');
            return {
              index: lesionIndex.label,
              lesionType: lesion.label,
              lesionLocation: organStr,
              displayText: '',
              comment: dm.label_info.comment ? dm.label_info.comment : '',
            };
          })}
        />
      )}
    </>
  );
}

// TODO: createReportDialogPrompt 里面也有一个tableDataSource， 重构统一起来，全部放到这里
function getTableDataSource(targetFindings, nonTargetFindings, newLesionFindings, SOD) {
  const tableDataSource = [];
  // target
  tableDataSource.push({
    row: [
      {
        key: 'targetGroup',
        content: <span>靶病灶</span>,
        gridCol: 4,
      },
      {
        key: 'count',
        content: <span>{`数量:${targetFindings.length}`}</span>,
        gridCol: 3,
      },
      {
        key: 'SOD',
        content: <span>{`径线和(SOD):${parseFloat(SOD).toFixed(1)} mm`}</span>,
        gridCol: 3,
      },
    ],
    expandedContent: getTargetExpandedContent(targetFindings),
  });
  // non-target
  tableDataSource.push({
    row: [
      {
        key: 'nonTargetGroup',
        content: <span>非靶病灶</span>,
        gridCol: 4,
      },
      {
        key: 'count',
        content: <span>{`数量:${nonTargetFindings.length}`}</span>,
        gridCol: 3,
      },
    ],
    expandedContent: getNonTargetExpandedContent(nonTargetFindings),
  });
  // new lesion
  if (newLesionFindings.length > 0) {
    tableDataSource.push({
      row: [
        {
          key: 'newLesionGroup',
          content: <span>新发病灶</span>,
          gridCol: 4,
        },
        {
          key: 'count',
          content: <span>{`数量:${newLesionFindings.length}`}</span>,
          gridCol: 3,
        },
      ],
      expandedContent: getNewLesionExpandedContent(newLesionFindings),
    });
  }
  return tableDataSource;
}

function getPastReportDialog(uiDialogService, trialTimePointInfo, report) {
  let dialogId = undefined;
  const _handleClose = () => {
    // Dismiss dialog
    uiDialogService.dismiss({ id: dialogId });
  };
  const _handleFormSubmit = ({ action, value }) => {
    uiDialogService.dismiss({ id: dialogId });
  };
  const dialogActions = [
    {
      id: 'cancel',
      text: '返回',
      type: ButtonEnums.type.secondary,
    },
  ];

  const { targetFindings, nonTargetFindings, newLesionFindings } = reportToReportFindings(report);
  const tableDataSource = getTableDataSource(
    targetFindings,
    nonTargetFindings,
    newLesionFindings,
    report.SOD
  );

  dialogId = uiDialogService.create({
    centralize: true,
    isDraggable: false,
    content: ReportDialog,
    useLastPosition: false,
    showOverlay: true,
    dialogWidth: '1200px',
    onClickOutside: _handleClose,
    contentProps: {
      title: `往期报告(${trialTimePointInfo})`,
      value: {
        imageQuality: report?.imageQuality,
        targetFindings: targetFindings,
        nonTargetFindings: nonTargetFindings,
        newLesionFindings: newLesionFindings,
        SOD: report ? report.SOD : null,
        targetResponse: report ? report.targetResponse : null,
        nonTargetResponse: report ? report.nonTargetResponse : null,
        response: report ? report.response : null,
        reviewComment: report ? report.reviewComment : '',
        arbitrationComment: report?.arbitrationComment ? report.arbitrationComment : null,
      },
      noCloseButton: false,
      onClose: _handleClose,
      actions: dialogActions,
      onSubmit: _handleFormSubmit,
      body: ({ value, setValue }) => {
        return (
          <>
            <div className="flex h-full flex-col bg-slate-300 ">
              {/* image quality */}
              <div className="flex flex-row justify-between pl-2 pb-2">
                <div className="flex flex-row">
                  <span className="text-black text-[14px] leading-[1.2]">
                    {value.imageQuality
                      ? `图像质量: ${value.imageQuality?.selection?.label} ${value.imageQuality?.description ? '(' + value.imageQuality?.description + ')' : ''}`
                      : '图像质量: 未知'}
                  </span>
                </div>
              </div>
              {/* lesion tables */}
              <div className="flex grow flex-col overflow-visible">
                <div className="flex grow flex-col">
                  <TargetListTable tableDataSource={tableDataSource} />
                </div>
                <div className="mt-3 flex grow flex-row justify-evenly">
                  <div className="w-1/3">
                    <Input
                      label="直径总和SOD(回车计算公式,单位mm)"
                      labelClassName="text-black text-[14px] leading-[1.2]"
                      className="border-primary-main bg-slate-300 text-black"
                      transparent={true}
                      type="text"
                      value={parseFloat(value.SOD).toFixed(1)}
                      disabled={true}
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="text-[14px] leading-[1.2] text-black">靶病灶评估</label>
                    <Select
                      id="targetResponse"
                      isClearable={false}
                      placeholder="靶病灶评估"
                      value={[value.targetResponse]}
                      options={targetResponseOptions}
                      isDisabled={true}
                    />
                  </div>
                </div>
                <div className="flex grow flex-row justify-evenly">
                  <div className="w-1/3">
                    <label className="text-[14px] leading-[1.2] text-black">非靶病灶评估</label>
                    <Select
                      id="nonTargetResponse"
                      isClearable={false}
                      placeholder="非靶病灶评估"
                      value={[value.nonTargetResponse]}
                      options={nonTargetResponseOptions}
                      isDisabled={true}
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="text-[14px] leading-[1.2] text-black">总体评估</label>
                    <Select
                      id="response"
                      isClearable={false}
                      placeholder="总体评估"
                      value={[value.response]}
                      options={responseOptions}
                      isDisabled={true}
                    />
                  </div>
                </div>
                <div className="flex grow flex-row justify-evenly">
                  <div className="w-1/2">
                    <Input
                      className="border-primary-main bg-slate-300 text-black"
                      type="text"
                      id="comment"
                      label="备注信息"
                      labelClassName="text-black text-[12px] leading-[1.2] mt-2"
                      transparent={true}
                      placeholder="备注信息"
                      value={value.reviewComment}
                      disabled={true}
                    />
                  </div>
                </div>
                {value.arbitrationComment && (
                  <div className="flex grow flex-row justify-evenly text-black">
                    <div className="w-1/2">
                      <Input
                        className="border-primary-main bg-slate-300"
                        type="text"
                        id="arbitration_comment"
                        label="仲裁备注"
                        labelClassName="text-black text-[12px] leading-[1.2] mt-2"
                        transparent={true}
                        placeholder="仲裁备注"
                        value={value.arbitrationComment}
                        disabled={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      },
    },
  });
}

function getEditMeasurementLabelDialog(
  dialogId,
  dialogTitle,
  valueDialog,
  isNonMeasurementTool,
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
        const comparedReportInfo = value.comparedReportInfo;

        function findCorrespondingAndFill(findingsGroup, lesionIndex) {
          const foundMeasurement = findingsGroup.find(
            dm => parseInt(dm?.measurementLabelInfo?.lesionIndex?.value) === parseInt(lesionIndex.value)
          );
          if (foundMeasurement) {
            // auto fill organ
            const organ = foundMeasurement.measurementLabelInfo.organ;
            const organLocation = foundMeasurement.measurementLabelInfo.organLocation;
            const organLateral = foundMeasurement.measurementLabelInfo.organLateral;
            setValue(value => {
              value['measurementLabelInfo']['organ'] = organ;
              value['label'][2] = organ ? organ['value'] : '';
              value['measurementLabelInfo']['organLocation'] = organLocation;
              value['measurementLabelInfo']['organLateral'] = organLateral;
              return value;
            });
          }
        }

        function autoFillValue() {
          const measurementLabelInfo = value['measurementLabelInfo'];
          if (!measurementLabelInfo || !comparedReportInfo) {
            return;
          }
          const lesion = measurementLabelInfo['lesion'];
          const lesionIndex = measurementLabelInfo['lesionIndex'];
          if (!lesion || !lesionIndex) {
            return;
          }
          const targetFindings = comparedReportInfo.targetFindings;
          const nonTargetFindings = comparedReportInfo.nonTargetFindings;
          const newLesionFindings = comparedReportInfo.newLesionFindings;
          if (targetKeyGroup.includes(lesion.value)) {
            // target
            findCorrespondingAndFill(targetFindings, lesionIndex);
          } else if (nonTargetKeyGroup.includes(lesion.value)) {
            // non-target
            findCorrespondingAndFill(nonTargetFindings, lesionIndex);
          } else if (newLesionKeyGroup.includes(lesion.value)) {
            // new lesion
            findCorrespondingAndFill(newLesionFindings, lesionIndex);
          }
        }
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
                autoFillValue();
              }}
              options={isNonMeasurementTool ? lesionOptions : LesionMeasurementOptions}
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
                autoFillValue();
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
            {!isNonMeasurementTool && (
              <CheckBox
                label="病灶中存在空腔"
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
  mapMeasurementToDisplay,
  reportMeasurementToReadonlyMeasurement,
  parseMeasurementLabelInfo,
  getTableDataSource,
  reportToReportFindings,
  getPastReportDialog,
  getEditMeasurementLabelDialog,
  // QC
  parseQCDataInfo,
};
