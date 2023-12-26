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
          const targetIndex = dm.measurementLabelInfo.targetIndex.label;
          const targetType = dm.measurementLabelInfo.target.label;
          const location = dm.measurementLabelInfo.location.label;
          return {
            index: targetIndex,
            targetType: targetType,
            targetLocation: location,
            diameter: `${dm.data[Object.keys(dm.data)[0]].length.toFixed(2)} ${dm.data[Object.keys(dm.data)[0]].unit}`,
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
            const targetIndex = dm.measurementLabelInfo.targetIndex.label;
            const targetType = dm.measurementLabelInfo.target.label;
            const location = dm.measurementLabelInfo.location.label;
            return {
              index: targetIndex,
              targetType: targetType,
              targetLocation: location,
              diameter: `${dm.data[Object.keys(dm.data)[0]].width.toFixed(2)} ${dm.data[Object.keys(dm.data)[0]].unit}`,
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
          const targetIndex = dm.measurementLabelInfo.targetIndex.label;
          const targetType = dm.measurementLabelInfo.target.label;
          const location = dm.measurementLabelInfo.location.label;
          return {
            index: targetIndex,
            targetType: targetType,
            targetLocation: location,
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
          const targetIndex = dm.measurementLabelInfo.targetIndex.label;
          const targetType = dm.measurementLabelInfo.target.label;
          const location = dm.measurementLabelInfo.location.label;
          return {
            index: targetIndex,
            targetType: targetType,
            targetLocation: location,
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
            const targetIndex = dm.measurementLabelInfo.targetIndex.label;
            const targetType = dm.measurementLabelInfo.target.label;
            const location = dm.measurementLabelInfo.location.label;
            return {
              index: targetIndex,
              targetType: targetType,
              targetLocation: location,
              displayText: `${dm.displayText.join(' ')}`,
            };
          })}
        />
      )}
    </>
  );
}

function getTableDataSource(targetFindings, nonTargetFindings, newLesionFindings) {
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
        content: <span>{`径合(SOD):TODO mm`}</span>,  // TODO
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

// TODO: SOD 计算放入当前页面，； 2. 太小和消失的靶病灶的长度计算显示；
// TODO：三个评估下拉框，放入当前页面
// TODO: 1. 位置加入description； 2. 每个病灶可以编辑description
// TODO: 如果没有新发，不显示新发栏目
export default function CreateReportDialogPrompt(
  uiDialogService,
  filteredMeasurements,
  { extensionManager, reportInfo }
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
  newLesionFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));
  nonTargetFindings.sort(
    (a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0])
  );
  // do not show otherFindings in report?
  otherFindings.sort((a, b) => parseInt(a.label.split('|')[0]) - parseInt(b.label.split('|')[0]));

  // get table data source
  const tableDataSource = getTableDataSource(targetFindings, nonTargetFindings, newLesionFindings);

  return new Promise(function (resolve, reject) {
    let dialogId = undefined;
    // evibased, get username, timestamp and comment for default report name
    const { userAuthenticationService } = extensionManager._servicesManager.services;
    const userInfo = userAuthenticationService.getUser();
    // labelTemplate deprecated
    let labelTemplate = userInfo ? userInfo.profile.preferred_username : 'unknown_user';
    labelTemplate += '|' + new Date().toISOString().slice(0, 16).replace(/-/g, '');
    labelTemplate += '|请在这里填写注释等信息';

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
            value: value.label,
            dataSourceName: value.dataSourceName,
          });
          break;
        case 'cancel':
          resolve({
            action: CREATE_REPORT_DIALOG_RESPONSE.CANCEL,
            value: undefined,
            dataSourceName: undefined,
          });
          break;
      }
    };

    const dataSourcesOpts = Object.keys(extensionManager.dataSourceMap)
      .filter(ds => {
        const configuration = extensionManager.dataSourceDefs[ds]?.configuration;
        const supportsStow = configuration?.supportsStow ?? configuration?.wadoRoot;
        return supportsStow;
      })
      .map(ds => {
        return {
          value: ds,
          label: ds,
          placeHolder: ds,
        };
      });

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
          label: labelTemplate,
          dataSourceName: extensionManager.activeDataSource,
          reportInfo: reportInfo,
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
        // TODO: Should be on button press...
        onSubmit: _handleFormSubmit,
        body: ({ value, setValue }) => {
          const onChangeHandler = event => {
            event.persist();
            setValue(value => ({ ...value, label: event.target.value }));
          };
          const onKeyPressHandler = event => {
            if (event.key === 'Enter') {
              uiDialogService.dismiss({ id: dialogId });
              resolve({
                action: CREATE_REPORT_DIALOG_RESPONSE.CREATE_REPORT,
                value: value.label,
              });
            }
          };
          return (
            <>
              {/* evibased, multi datasource but same backend api */}
              {/* {dataSourcesOpts.length > 1 && window.config?.allowMultiSelectExport && (
                <div>
                  <label className="text-[14px] leading-[1.2] text-white">Data Source</label>
                  <Select
                    closeMenuOnSelect={true}
                    className="border-primary-main  mt-2 bg-black"
                    options={dataSourcesOpts}
                    placeholder={
                      dataSourcesOpts.find(option => option.value === value.dataSourceName)
                        .placeHolder
                    }
                    value={value.dataSourceName}
                    onChange={evt => {
                      setValue(v => ({ ...v, dataSourceName: evt.value }));
                    }}
                    isClearable={false}
                  />
                </div>
              )}
              {!extensionManager._appConfig.evibased['use_report_api'] && (
                <div className="mt-3">
                  <Input
                    autoFocus
                    label="Enter the report name"
                    labelClassName="text-white text-[14px] leading-[1.2]"
                    className="border-primary-main bg-black"
                    type="text"
                    value={value.label}
                    onChange={onChangeHandler}
                    onKeyPress={onKeyPressHandler}
                    required
                  />
                </div>
              )} */}
              <div className="flex h-full flex-col bg-black ">
                <div className="ohif-scrollbar flex grow flex-col overflow-y-auto">
                  <div className="flex grow flex-col">
                    <TargetListTable tableDataSource={tableDataSource} />
                  </div>
                  <div className="mt-3">
                    <Input
                      label="直径总和SOD(单位:mm)"
                      labelClassName="text-white text-[14px] leading-[1.2]"
                      className="border-primary-main bg-black"
                      type="text"
                      value={value.reportInfo.SOD}
                      disabled
                    />
                  </div>
                  <div>
                    <Input
                      label="非靶病灶评估"
                      labelClassName="text-white text-[14px] leading-[1.2]"
                      className="border-primary-main bg-black"
                      type="text"
                      value={nonTargetResponseMapping[value.reportInfo.nonTargetResponse]}
                      disabled
                    />
                  </div>
                  <div>
                    <Input
                      label="总体评估"
                      labelClassName="text-white text-[14px] leading-[1.2]"
                      className="border-primary-main bg-black"
                      type="text"
                      value={responseMapping[value.reportInfo.response]}
                      disabled
                    />
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
