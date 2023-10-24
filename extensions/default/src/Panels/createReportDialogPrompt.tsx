import React from 'react';

import { ButtonEnums, Dialog, Input, Select } from '@ohif/ui';

export const CREATE_REPORT_DIALOG_RESPONSE = {
  CANCEL: 0,
  CREATE_REPORT: 1,
};

export default function CreateReportDialogPrompt(uiDialogService, { extensionManager }) {
  return new Promise(function (resolve, reject) {
    let dialogId = undefined;
    // evibased, get username, timestamp and comment for default report name
    const { userAuthenticationService } = extensionManager._servicesManager.services;
    const userInfo = userAuthenticationService.getUser();
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
        title: 'Create Report',
        value: {
          label: labelTemplate,
          dataSourceName: extensionManager.activeDataSource,
        },
        noCloseButton: true,
        onClose: _handleClose,
        actions: [
          { id: 'cancel', text: 'Cancel', type: ButtonEnums.type.secondary },
          { id: 'save', text: 'Save', type: ButtonEnums.type.primary },
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
            </>
          );
        },
      },
    });
  });
}
