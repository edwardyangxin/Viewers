import React from 'react';
import { Input, Dialog, ButtonEnums } from '@ohif/ui';
import i18n from '@ohif/i18n';

/**
 *
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
  data,
  callback,
  isArrowAnnotateInputDialog = true,
  dialogConfig: any = {}
) {
  const dialogId = 'dialog-enter-annotation';
  const label = data
    ? isArrowAnnotateInputDialog
      ? data.text
      : data.label
    : '';
  const {
    dialogTitle = i18n.t('Dialog:Annotation'),
    inputLabel = i18n.t('Dialog:Enter your annotation'),
    validateFunc = value => true,
  } = dialogConfig;

  const onSubmitHandler = ({ action, value }) => {
    switch (action.id) {
      case 'save':
        if (typeof validateFunc === 'function' && !validateFunc(value.label)) {
          return;
        }

        callback(value.label, action.id);
        break;
      case 'cancel':
        callback('', action.id);
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
        value: { label },
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
            <Input
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
            />
          );
        },
      },
    });
  }
}

export default callInputDialog;
