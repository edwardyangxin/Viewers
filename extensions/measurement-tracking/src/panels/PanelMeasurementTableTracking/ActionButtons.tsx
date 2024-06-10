import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { Button, ButtonEnums } from '@ohif/ui';

function ActionButtons({
  onExportClick,
  onUploadClick,
  onCreateReportClick,
  userRoles,
  readonlyMode,
  disabled,
}) {
  const { t } = useTranslation('MeasurementTable');

  let reportButtonName = t('Create Report');
  if (userRoles && userRoles.length > 0) {
    if (!userRoles.includes('doctor') || readonlyMode) {
      reportButtonName = '查看报告';
    }
  }

  return (
    <React.Fragment>
      {/* evibased disable export CSV */}
      {/* <Button
        onClick={onExportClick}
        disabled={disabled}
        type={ButtonEnums.type.secondary}
        size={ButtonEnums.size.small}
      >
        {t('Export')}
      </Button> */}
      {/* upload report to backend */}
      {/* <Button
        onClick={onUploadClick}
        disabled={disabled}
        type={ButtonEnums.type.secondary}
        size={ButtonEnums.size.small}
      >
        {t('Upload')}
      </Button> */}
      <Button
        className="ml-2"
        onClick={onCreateReportClick}
        type={ButtonEnums.type.secondary}
        size={ButtonEnums.size.large}
        disabled={disabled}
      >
        {reportButtonName}
      </Button>
    </React.Fragment>
  );
}

ActionButtons.propTypes = {
  onExportClick: PropTypes.func,
  onCreateReportClick: PropTypes.func,
  disabled: PropTypes.bool,
};

ActionButtons.defaultProps = {
  onExportClick: () => alert('Export'),
  onCreateReportClick: () => alert('Create Report'),
  disabled: false,
};

export default ActionButtons;
