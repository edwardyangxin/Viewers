import React from 'react';

import { ButtonEnums, Dialog, Input, Select } from '@ohif/ui';
import i18n from '@ohif/i18n';
import {
  nonTargetKeyGroup,
  newLesionKeyGroup,
  LesionMapping,
  targetKeyGroup,
  nonTargetResponseOptions,
  responseOptions,
  targetResponseOptions,
} from '../../utils/mappings';
import TargetListTable, { TargetListExpandedRow } from '../../ui/TargetListTable';
import { locationStrBuilder } from '../../utils/utils';
import ReportDialog from '../../ui/ReportDialog';

export const CREATE_REPORT_DIALOG_RESPONSE = {
  CANCEL: 0,
  CREATE_REPORT: 1,
};

//
export default function CreateReportDialogPrompt(
  ctx,
  uiDialogService,
  measurementService,
  { extensionManager }
) {
  const {
    trackedStudy,
    trackedSeries,
    currentReportInfo,
    currentTimepoint,
    baselineTimepoint,
    lowestSODTimepoint,
    userRoles,
    currentTask,
  } = ctx;
  let taskType = null;
  if (currentTask) {
    taskType = currentTask.type;
  }
  const ifReadingTask = taskType === 'reading';
  const ifArbitrationTask = taskType === 'arbitration';
  const measurements = measurementService.getMeasurements();
  const filteredMeasurements = measurements.filter(
    m => trackedStudy === m.referenceStudyUID && trackedSeries.includes(m.referenceSeriesUID)
  );

  // if baseline or followup
  const ifBaseline = currentTimepoint.ifBaseline;
  // SODs
  let baselineSOD = undefined;
  let lowestSOD = undefined;
  if (!ifBaseline) {
    baselineSOD = baselineTimepoint?.SOD;
    lowestSOD = lowestSODTimepoint?.SOD;
  }

  // evibased 按照target&nonTarget分组显示
  const targetFindings = [];
  const nonTargetFindings = [];
  const newLesionFindings = [];
  const otherFindings = [];
  for (const dm of filteredMeasurements) {
    // get target info
    const lesionValue = dm.label.split('|')[1];
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
  targetFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));
  newLesionFindings.sort(
    (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
  );
  nonTargetFindings.sort(
    (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
  );
  // do not show otherFindings in report?
  otherFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));

  // initial SOD
  const initialSOD = autoCalSOD(targetFindings);

  return new Promise(function (resolve, reject) {
    let dialogId = undefined;
    // evibased, get username, timestamp and comment for default report name
    const { userAuthenticationService } = extensionManager._servicesManager.services;
    const userInfo = userAuthenticationService.getUser();

    const _handleClose = () => {
      // Dismiss dialog
      uiDialogService.dismiss({ id: dialogId });
      // Notify of cancel action
      resolve({
        action: CREATE_REPORT_DIALOG_RESPONSE.CANCEL,
        value: undefined,
        dataSourceName: undefined,
      });
    };

    /**
     *
     * @param {string} param0.action - value of action performed
     * @param {string} param0.value - value from input field
     */
    const _handleFormSubmit = ({ action, value }) => {
      uiDialogService.dismiss({ id: dialogId });
      switch (action.id) {
        case 'save':
          let returnVal = {
            ...value,
            reportInfo: {
              SOD: value.SOD,
              targetResponse: value.targetResponse,
              nonTargetResponse: value.nonTargetResponse,
              response: value.response,
              comment: value.comment,
            }
          };
          if (taskType === 'arbitration') {
            // 仲裁
            returnVal.reportInfo.arbitrationComment = value.arbitrationComment;
            returnVal.reportInfo.reportRef = currentReportInfo._id;
          }
          resolve({
            action: CREATE_REPORT_DIALOG_RESPONSE.CREATE_REPORT,
            value: returnVal,
            dataSourceName: undefined, // deprecated
          });
          break;
        case 'cancel':
          resolve({
            action: CREATE_REPORT_DIALOG_RESPONSE.CANCEL,
            value: undefined,
            dataSourceName: undefined, // deprecated
          });
          break;
      }
    };

    // actions, if user is QC, no save button
    let dialogActions = [
      {
        id: 'cancel',
        text: '返回',
        type: ButtonEnums.type.secondary,
      },
    ];
    if (userRoles && userRoles.length > 0) {
      if (!userRoles.includes('QC')) {
        let buttonText;
        if (taskType === 'arbitration') {
          buttonText = `${i18n.t('MeasurementTable:Save')}(选择${currentReportInfo.username}的报告)`;
        } else {
          buttonText = `${i18n.t('MeasurementTable:Save')}`;
        }
        dialogActions.push({
          id: 'save',
          text: buttonText,
          type: ButtonEnums.type.primary,
        });
      }
    }

    dialogId = uiDialogService.create({
      centralize: true,
      isDraggable: false,
      content: ReportDialog,
      useLastPosition: false,
      showOverlay: true,
      dialogWidth: '1200px',
      contentProps: {
        title: i18n.t('MeasurementTable:Create Report'),
        value: {
          targetFindings: targetFindings,
          nonTargetFindings: nonTargetFindings,
          newLesionFindings: newLesionFindings,
          SOD: currentReportInfo ? currentReportInfo.SOD : initialSOD,
          targetResponse: currentReportInfo ? currentReportInfo.targetResponse : 'Baseline',
          nonTargetResponse: currentReportInfo ? currentReportInfo.nonTargetResponse : 'Baseline',
          response: currentReportInfo ? currentReportInfo.response : 'Baseline',
          comment: currentReportInfo ? currentReportInfo.comment : '',
          arbitrationComment: currentReportInfo?.arbitrationComment ? currentReportInfo.arbitrationComment : null,
        },
        noCloseButton: false,
        onClose: _handleClose,
        actions: dialogActions,
        onSubmit: _handleFormSubmit,
        body: ({ value, setValue }) => {
          // for SOD input
          const onSODInputChangeHandler = event => {
            event.persist();
            setValue(value => ({ ...value, SOD: event.target.value }));
          };

          const onSODInputKeyUpHandler = event => {
            event.persist();
            if (event.key === 'Enter') {
              const inputStr = event.target.value;
              let result = inputStr;
              // calculate SOD if input is equation
              if (inputStr.includes('+') || inputStr.includes('-')) {
                try {
                  // Using Function constructor
                  const calculateResult = new Function('return ' + inputStr);
                  // Call the function to get the result
                  result = calculateResult();
                  result = result.toFixed(2);
                } catch (error) {
                  console.log('failed to calculate SOD', error);
                }
              }
              setValue(value => ({ ...value, SOD: result }));
            }
          };

          return (
            <>
              <div className="flex h-full flex-col bg-slate-300 ">
                <div className="flex grow flex-col overflow-visible">
                  <div className="flex grow flex-col">
                    <TargetListTable
                      tableDataSource={getTableDataSource(
                        value.targetFindings,
                        value.nonTargetFindings,
                        value.newLesionFindings,
                        value.SOD
                      )}
                    />
                  </div>
                  <div className="mt-3 flex grow flex-row justify-evenly">
                    <div className="w-1/3">
                      <Input
                        label="直径总和SOD(回车计算公式,单位mm)"
                        labelClassName="text-black text-[14px] leading-[1.2]"
                        className="border-primary-main bg-slate-300 text-black"
                        transparent={true}
                        type="text"
                        value={value.SOD}
                        onChange={onSODInputChangeHandler}
                        onKeyUp={onSODInputKeyUpHandler}
                        disabled={!ifReadingTask}
                      />
                    </div>
                    <div className="w-1/3">
                      {ifBaseline ? (
                        <label className="text-[14px] leading-[1.2] text-black">靶病灶评估</label>
                      ) : (
                        <label className="text-[14px] leading-[1.2] text-black">
                          {`靶病灶评估(与基线SOD(${baselineSOD}mm)变化:${(
                            ((parseFloat(value.SOD) - baselineSOD) / baselineSOD) *
                            100
                          ).toFixed(1)}%; 
                          与最低SOD(${lowestSOD}mm)变化:${(
                            parseFloat(value.SOD) - lowestSOD
                          ).toFixed(1)}mm,
                          ${(((parseFloat(value.SOD) - lowestSOD) / lowestSOD) * 100).toFixed(
                            1
                          )}%)`}
                        </label>
                      )}
                      <Select
                        id="targetResponse"
                        isClearable={false}
                        placeholder="靶病灶评估"
                        value={[value.targetResponse]}
                        onChange={(newSelection, action) => {
                          // console.info('newSelection:', newSelection, 'action:', action);
                          setValue(value => ({ ...value, targetResponse: newSelection?.value }));
                        }}
                        options={targetResponseOptions}
                        isDisabled={!ifReadingTask || ifBaseline}
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
                        onChange={(newSelection, action) => {
                          // console.info('newSelection:', newSelection, 'action:', action);
                          setValue(value => ({ ...value, nonTargetResponse: newSelection?.value }));
                        }}
                        options={nonTargetResponseOptions}
                        isDisabled={!ifReadingTask || ifBaseline}
                      />
                    </div>
                    <div className="w-1/3">
                      <label className="text-[14px] leading-[1.2] text-black">总体评估</label>
                      <Select
                        id="response"
                        isClearable={false}
                        placeholder="总体评估"
                        value={[value.response]}
                        onChange={(newSelection, action) => {
                          // console.info('newSelection:', newSelection, 'action:', action);
                          setValue(value => ({ ...value, response: newSelection?.value }));
                        }}
                        options={responseOptions}
                        isDisabled={!ifReadingTask}
                      />
                    </div>
                  </div>
                  <div className="flex grow flex-row justify-evenly">
                    <div className="w-1/2">
                      <Input
                        type="text"
                        id="comment"
                        label="备注信息"
                        labelClassName="text-black text-[14px] leading-[1.2] mt-2"
                        className="border-primary-main bg-slate-300 text-black"
                        transparent={true}
                        placeholder="备注信息"
                        value={value.comment}
                        onChange={event => {
                          event.persist();
                          setValue(value => ({ ...value, comment: event.target.value }));
                        }}
                        onKeyUp={event => {
                          event.persist();
                          if (event.key === 'Enter') {
                            setValue(value => ({ ...value, comment: event.target.value }));
                          }
                        }}
                        disabled={!ifReadingTask}
                      />
                    </div>
                  </div>
                  {
                    // 如果是仲裁任务，或者读取到了仲裁备注，显示仲裁备注输入框
                    (taskType === 'arbitration' || value.arbitrationComment) && (
                      <div className="flex grow flex-row justify-evenly">
                        <div className="w-1/2">
                          <Input
                            className="border-primary-main bg-slate-300 text-black"
                            type="text"
                            id="arbitration_comment"
                            label="仲裁备注"
                            labelClassName="text-black text-[14px] leading-[1.2] mt-2"
                            transparent={true}
                            placeholder="仲裁备注"
                            value={value.arbitrationComment}
                            onChange={event => {
                              event.persist();
                              setValue(value => ({ ...value, arbitrationComment: event.target.value }));
                            }}
                            onKeyUp={event => {
                              event.persist();
                              if (event.key === 'Enter') {
                                setValue(value => ({ ...value, arbitrationComment: event.target.value }));
                              }
                            }}
                            disabled={!ifArbitrationTask}
                          />
                        </div>
                      </div>
                    )
                  }
                </div>
              </div>
            </>
          );
        },
      },
    });
  });
}

function getTargetExpandedContent(targetFindings) {
  // target info split into non-Nymph nodes and Nymph nodes
  const nonNymphNodes = [];
  const NymphNodes = [];
  for (const dm of targetFindings) {
    const organ = dm.measurementLabelInfo.organ.value;
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
          const lesionIndex = dm.measurementLabelInfo.lesionIndex;
          const lesion = dm.measurementLabelInfo.lesion;
          const lesionLocationStr = locationStrBuilder(dm.measurementLabelInfo);
          const lesionValue = lesion.value;
          // get diameter
          let diameter = 0.0;
          // get long and short axis
          if (lesionValue === 'Target' && dm.toolName === 'Bidirectional') {
            // get long axis for 双径测量工具
            diameter = dm.data[Object.keys(dm.data)[0]].length;
          } else if (lesionValue === 'Target' && dm.toolName === 'Length') {
            // get long axis for 长径测量工具
            diameter = dm.data[Object.keys(dm.data)[0]].length;
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
            diameter: `${diameter.toFixed(2)} mm`,
            comment: dm.measurementLabelInfo.comment ? dm.measurementLabelInfo.comment : '',
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
            const lesionIndex = dm.measurementLabelInfo.lesionIndex;
            const lesion = dm.measurementLabelInfo.lesion;
            const lesionLocationStr = locationStrBuilder(dm.measurementLabelInfo);
            const lesionValue = lesion.value;
            // get diameter
            let diameter = 0.0;
            // get long and short axis
            if (lesionValue === 'Target' && dm.toolName === 'Bidirectional') {
              // get short axis, 双径测量工具
              diameter = dm.data[Object.keys(dm.data)[0]].width;
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
              diameter: `${diameter.toFixed(2)} mm`,
              comment: dm.measurementLabelInfo.comment ? dm.measurementLabelInfo.comment : '',
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
          const lesionIndex = dm.measurementLabelInfo.lesionIndex;
          const lesion = dm.measurementLabelInfo.lesion;
          const lesionLocationStr = locationStrBuilder(dm.measurementLabelInfo);
          return {
            index: lesionIndex.label,
            lesionType: lesion.label,
            lesionLocation: lesionLocationStr,
            displayText: `${dm.displayText.join(' ')}`,
            comment: dm.measurementLabelInfo.comment ? dm.measurementLabelInfo.comment : '',
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
    const lesionValue = dm.measurementLabelInfo.lesion.value;
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
          const lesionIndex = dm.measurementLabelInfo.lesionIndex;
          const lesion = dm.measurementLabelInfo.lesion;
          const lesionLocationStr = locationStrBuilder(dm.measurementLabelInfo);
          return {
            index: lesionIndex.label,
            lesionType: lesion.label,
            lesionLocation: lesionLocationStr,
            displayText: `${dm.displayText.join(' ')}`,
            comment: dm.measurementLabelInfo.comment ? dm.measurementLabelInfo.comment : '',
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
            const lesionIndex = dm.measurementLabelInfo.lesionIndex;
            const lesion = dm.measurementLabelInfo.lesion;
            const organStr =
              dm.measurementLabelInfo.organ.label +
              (dm.measurementLabelInfo.organDescription
                ? `(${dm.measurementLabelInfo.organDescription})`
                : '');
            return {
              index: lesionIndex.label,
              lesionType: lesion.label,
              lesionLocation: organStr,
              displayText: `${dm.displayText.join(' ')}`,
              comment: dm.measurementLabelInfo.comment ? dm.measurementLabelInfo.comment : '',
            };
          })}
        />
      )}
    </>
  );
}

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
        content: <span>{`径线和(SOD):${SOD} mm`}</span>,
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

function autoCalSOD(targetFindings) {
  let culmulativeSOD = 0.0;
  try {
    // calculate SOD based on targetFindings
    for (const dm of targetFindings) {
      const lesionValue = dm.measurementLabelInfo.lesion.value;
      const organValue = dm.measurementLabelInfo.organ.value;
      // get long and short axis
      let longAxis = 0.0;
      let shortAxis = 0.0;
      if (lesionValue === 'Target' && dm.toolName === 'Bidirectional') {
        // 可测量病灶，长短径测量
        // get long and short axis
        longAxis = dm.data[Object.keys(dm.data)[0]].length;
        shortAxis = dm.data[Object.keys(dm.data)[0]].width;
      } else if (lesionValue === 'Target' && dm.toolName === 'Length') {
        // 可测量病灶，长径测量
        longAxis = dm.data[Object.keys(dm.data)[0]].length;
      } else {
        // no axis info
        if (lesionValue === 'Target_NM') {
          // Target_NM 太小无法测量，计5mm
          culmulativeSOD += 5.0;
        }
        continue;
      }

      // if Lymph_Node
      if (organValue === 'Lymph_Node') {
        // use short axis
        culmulativeSOD += shortAxis;
      } else {
        // use long axis
        culmulativeSOD += longAxis;
      }
    }
  } catch (error) {
    console.log('failed to parse length', error);
  }
  return culmulativeSOD.toFixed(2);
}