import React from 'react';

import { ButtonEnums, Dialog, Input, Select } from '@ohif/ui';
import i18n from '@ohif/i18n';
import { responseOptions } from '../../utils/mappings';

export const CREATE_REPORT_DIALOG_RESPONSE = {
  CANCEL: 0,
  CREATE_REPORT: 1,
};

export default function CreateReportDialogPrompt(uiDialogService, { extensionManager, reportInfo }) {
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
          { id: 'cancel', text: i18n.t('MeasurementTable:Cancel'), type: ButtonEnums.type.secondary },
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
              {dataSourcesOpts.length > 1 && window.config?.allowMultiSelectExport && (
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
              )}
              <div className="mt-3">
                  <Input
                    label="总测量值(SOD, 单位:mm)"
                    labelClassName="text-white text-[14px] leading-[1.2]"
                    className="border-primary-main bg-black"
                    type="text"
                    value={value.reportInfo.SOD}
                    disabled
                  />
              </div>
              <div>
                  <Input
                    label="结论(Response)"
                    labelClassName="text-white text-[14px] leading-[1.2]"
                    className="border-primary-main bg-black"
                    type="text"
                    value={value.reportInfo.response}
                    disabled
                  />
              </div>
            </>
          );
        },
      },
    });
  });
}
