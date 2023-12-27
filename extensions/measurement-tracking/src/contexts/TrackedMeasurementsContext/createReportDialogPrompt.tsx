import React from 'react';

import { ButtonEnums, Dialog, Input, Select } from '@ohif/ui';
import i18n from '@ohif/i18n';
import {
  nonTargetResponseMapping,
  nontargetKeyGroup,
  newLesionKeyGroup,
  responseMapping,
  targetInfoMapping,
  targetKeyGroup,
  nonTargetResponseOptions,
  responseOptions,
  targetResponseOptions,
} from '../../utils/mappings';
import TargetListTable, { TargetListExpandedRow } from '../../ui/TargetListTable';

export const CREATE_REPORT_DIALOG_RESPONSE = {
  CANCEL: 0,
  CREATE_REPORT: 1,
};

function getTargetExpandedContent(targetFindings) {
  // target info split into non-Nymph nodes and Nymph nodes
  const nonNymphNodes = [];
  const NymphNodes = [];
  for (const dm of targetFindings) {
    const locationInfo = dm.measurementLabelInfo.location.value;
    if (locationInfo === 'Lymph_Node') {
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
          targetType: '靶病灶类型',
          targetLocation: '靶病灶位置',
          diameter: '长径(单位:mm)',
        }}
        tableDataSource={nonNymphNodes.map((dm, index) => {
          const targetIndex = dm.measurementLabelInfo.targetIndex;
          const targetType = dm.measurementLabelInfo.target;
          const locationStr =
            dm.measurementLabelInfo.location.label +
              (dm.measurementLabelInfo.locationDescription
              ? `(${dm.measurementLabelInfo.locationDescription})`
              : '');
          // get diameter
          let diameter = 0.0;
          // get long and short axis from displayText
          const displayText = dm.displayText[0];
          if (displayText.includes('x') && displayText.includes('mm')) {
            // bi-dimensional tool
            // get long axis
            diameter = dm.data[Object.keys(dm.data)[0]].length;
          } else {
            // no axis info
            if (targetType.value === 'Target_NM') {
              // Target_NM 太小无法测量，计5mm
              diameter = 5.0;
            }
          }

          return {
            index: targetIndex.label,
            targetType: targetType.label,
            targetLocation: locationStr,
            diameter: `${diameter.toFixed(2)} mm`,
          };
        })}
      />
      {NymphNodes.length > 0 && (
        <TargetListExpandedRow
          tableTitle="淋巴结靶病灶"
          tableColumns={{
            index: '序号',
            targetType: '靶病灶类型',
            targetLocation: '靶病灶位置',
            diameter: '短径(单位:mm)',
          }}
          tableDataSource={NymphNodes.map((dm, index) => {
            const targetIndex = dm.measurementLabelInfo.targetIndex;
            const targetType = dm.measurementLabelInfo.target;
            const locationStr =
              dm.measurementLabelInfo.location.label +
                (dm.measurementLabelInfo.locationDescription
                ? `(${dm.measurementLabelInfo.locationDescription.label})`
                : '');
            // get diameter
            let diameter = 0.0;
            // get long and short axis from displayText
            const displayText = dm.displayText[0];
            if (displayText.includes('x') && displayText.includes('mm')) {
              // bi-dimensional tool
              // get short axis
              diameter = dm.data[Object.keys(dm.data)[0]].width;
            } else {
              // no axis info
              if (targetType.value === 'Target_NM') {
                // Target_NM 太小无法测量，计5mm
                diameter = 5.0;
              }
            }

            return {
              index: targetIndex.label,
              targetType: targetType.label,
              targetLocation: locationStr,
              diameter: `${diameter.toFixed(2)} mm`,
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
          targetType: '非靶病灶类型',
          targetLocation: '非靶病灶位置',
          displayText: '描述信息',
        }}
        tableDataSource={nonTargetFindings.map((dm, index) => {
          const targetIndex = dm.measurementLabelInfo.targetIndex;
          const targetType = dm.measurementLabelInfo.target;
          const locationStr =
            dm.measurementLabelInfo.location.label +
              (dm.measurementLabelInfo.locationDescription
              ? `(${dm.measurementLabelInfo.locationDescription.label})`
              : '');
          return {
            index: targetIndex.label,
            targetType: targetType.label,
            targetLocation: locationStr,
            displayText: `${dm.displayText.join(' ')}`,
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
    const locationInfo = dm.measurementLabelInfo.target.value;
    if (locationInfo === 'New_Lesion') {
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
          targetType: '新发病灶类型',
          targetLocation: '新发病灶位置',
          displayText: '描述信息',
        }}
        tableDataSource={possibleNews.map((dm, index) => {
          const targetIndex = dm.measurementLabelInfo.targetIndex;
          const targetType = dm.measurementLabelInfo.target;
          const locationStr =
            dm.measurementLabelInfo.location.label +
              (dm.measurementLabelInfo.locationDescription
              ? `(${dm.measurementLabelInfo.locationDescription.label})`
              : '');
          return {
            index: targetIndex.label,
            targetType: targetType.label,
            targetLocation: locationStr,
            displayText: `${dm.displayText.join(' ')}`,
          };
        })}
      />
      {newLeisions.length > 0 && (
        <TargetListExpandedRow
          tableTitle="确认新发病灶"
          tabelBgColor="bg-red-500"
          tableColumns={{
            index: '序号',
            targetType: '新发病灶类型',
            targetLocation: '新发病灶位置',
            displayText: '描述信息',
          }}
          tableDataSource={newLeisions.map((dm, index) => {
            const targetIndex = dm.measurementLabelInfo.targetIndex;
            const targetType = dm.measurementLabelInfo.target;
            const locationStr =
              dm.measurementLabelInfo.location.label +
                (dm.measurementLabelInfo.locationDescription
                ? `(${dm.measurementLabelInfo.locationDescription.label})`
                : '');
            return {
              index: targetIndex.label,
              targetType: targetType.label,
              targetLocation: locationStr,
              displayText: `${dm.displayText.join(' ')}`,
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
        content: <span>{`径和(SOD):${SOD} mm`}</span>,
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
      const targetOption = dm.measurementLabelInfo.target.value;
      const location = dm.measurementLabelInfo.location.value;
      // get long and short axis from displayText
      const displayText = dm.displayText[0];
      let longAxis = 0.0;
      let shortAxis = 0.0;
      if (displayText.includes('x') && displayText.includes('mm')) {
        // bi-dimensional tool
        // get long and short axis
        longAxis = dm.data[Object.keys(dm.data)[0]].length;
        shortAxis = dm.data[Object.keys(dm.data)[0]].width;
      } else {
        // no axis info
        if (targetOption === 'Target_NM') {
          // Target_NM 太小无法测量，计5mm
          culmulativeSOD += 5.0;
        }
        continue;
      }

      // if Lymph_Node
      if (location === 'Lymph_Node') {
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

// Todo:
// 每个病灶可以comment
// 显示SOD变化统计信息
export default function CreateReportDialogPrompt(
  uiDialogService,
  filteredMeasurements,
  { extensionManager, currentReportInfo }
) {
  // evibased 按照target&nonTarget分组显示
  const targetFindings = [];
  const nonTargetFindings = [];
  const newLesionFindings = [];
  const otherFindings = [];
  for (const dm of filteredMeasurements) {
    // get target info
    const targetInfo = dm.label.split('|')[1];
    if (!(targetInfo in targetInfoMapping)) {
      // not in targetInfoMapping, just show and allow edit in other group
      otherFindings.push(dm);
    } else if (targetKeyGroup.includes(targetInfo)) {
      targetFindings.push(dm);
    } else if (newLesionKeyGroup.includes(targetInfo)) {
      newLesionFindings.push(dm);
    } else if (nontargetKeyGroup.includes(targetInfo)) {
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
          resolve({
            action: CREATE_REPORT_DIALOG_RESPONSE.CREATE_REPORT,
            value: {...value, reportInfo: {
              SOD: value.SOD,
              targetResponse: value.targetResponse,
              nonTargetResponse: value.nonTargetResponse,
              response: value.response,
            }},
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

    dialogId = uiDialogService.create({
      centralize: true,
      isDraggable: false,
      content: Dialog,
      useLastPosition: false,
      showOverlay: true,
      dialogWidth: '1000px',
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
        },
        noCloseButton: true,
        onClose: _handleClose,
        actions: [
          {
            id: 'cancel',
            text: i18n.t('MeasurementTable:Cancel'),
            type: ButtonEnums.type.secondary,
          },
          { id: 'save', text: i18n.t('MeasurementTable:Save'), type: ButtonEnums.type.primary },
        ],
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
              <div className="flex h-full flex-col bg-black ">
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
                  <div className="flex grow flex-row justify-evenly mt-3">
                    <div className="w-1/3">
                      <Input
                        label="直径总和SOD(回车计算公式,单位mm)"
                        labelClassName="text-white text-[14px] leading-[1.2]"
                        className="border-primary-main bg-black"
                        type="text"
                        value={value.SOD}
                        onChange={onSODInputChangeHandler}
                        onKeyUp={onSODInputKeyUpHandler}
                      />
                    </div>
                    <div className="w-1/3">
                      <label className="text-[14px] leading-[1.2] text-white">靶病灶评估</label>
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
                      />
                    </div>
                  </div>
                  <div className="flex grow flex-row justify-evenly">
                    <div className="w-1/3">
                      <label className="text-[14px] leading-[1.2] text-white">非靶病灶评估</label>
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
                      />
                    </div>
                    <div className="w-1/3">
                      <label className="text-[14px] leading-[1.2] text-white">总体评估</label>
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
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          );
        },
      },
    });
  });
}
