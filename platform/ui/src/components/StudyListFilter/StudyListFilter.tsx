import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import LegacyButton from '../LegacyButton';
import Icon from '../Icon';
import Typography from '../Typography';
import InputGroup from '../InputGroup';
import Select from '../Select';

const timepointStatusMapping = {
  'scheduled': '未上传',
  'collecting': '上传中',
  'appending': '补充数据中',
  'QC-data': '数据待审核',
  'reviewing': '阅片中',
  'QC-report': '报告待审核',
  'arbitration': '仲裁中',
  'freezed': '已锁定',
};
const timepointStatusOptions = Object.keys(timepointStatusMapping).map(key => ({
  value: key,
  label: timepointStatusMapping[key],
}));

const StudyListFilter = ({
  filtersMeta,
  filterValues,
  onChange,
  clearFilters,
  isFiltering,
  numOfStudies,
  onUploadClick,
  getDataSourceConfigurationComponent,
  ifManager = false, // evibased, add ifManager to show the filters for manager
  projects = [], // evibased, projects list for manager
}) => {
  const { t } = useTranslation('StudyList');
  const { sortBy, sortDirection, timepointStatus } = filterValues;
  const filterSorting = { sortBy, sortDirection };
  const setFilterSorting = sortingValues => {
    onChange({
      ...filterValues,
      ...sortingValues,
    });
  };
  const isSortingEnabled = numOfStudies > 0 && numOfStudies <= 100;

  // evibased,
  const [timepointStatusValue, setTimepointStatusValue] = React.useState(timepointStatus.split('+'));
  const [projectCode, setProjectCode] = React.useState(null);
  const projectsOptions = projects.map(project => ({
    value: project,
    label: project,
  }));

  return (
    <React.Fragment>
      <div>
        <div className="bg-black">
          <div className="container relative mx-auto flex flex-col pt-5">
            <div className="mb-5 flex flex-row justify-between">
              <div className="flex min-w-[1px] shrink flex-row items-center gap-6">
                <Typography
                  variant="h6"
                  className="text-white"
                >
                  {t('StudyList')}
                </Typography>
                {/* evibased, upload to PACS, not working for now */}
                {getDataSourceConfigurationComponent && getDataSourceConfigurationComponent()}
                {onUploadClick && (
                  <div
                    className="text-primary-active flex cursor-pointer items-center gap-2 self-center text-lg font-semibold"
                    onClick={onUploadClick}
                  >
                    <Icon name="icon-upload"></Icon>
                    <span>{t('Upload')}</span>
                  </div>
                )}
                {/* evibased, if manager show project, timepoint status filters */}
                {ifManager && (
                  <div className="z-50 flex gap-2">
                    {/* project list select */}
                    <Select
                      id="projectFilter"
                      isClearable={true}
                      isSearchable={true}
                      placeholder="按照项目过滤"
                      value={[projectCode]}
                      onChange={(newSelection, action) => {
                        console.info('newSelection:', newSelection, 'action:', action);
                        setProjectCode(newSelection ? newSelection.value : null);
                      }}
                      options={projectsOptions}
                    />
                    {/* timepoint status filter */}
                    <Select
                      id="timepointStatusFilter"
                      closeMenuOnSelect={false}
                      isClearable={true}
                      isMulti={true}
                      isSearchable={true}
                      placeholder="访视状态过滤"
                      value={timepointStatusValue}
                      onChange={(newSelection, action) => {
                        console.info('newSelection:', newSelection, 'action:', action);
                        // all actions are handled the same way
                        // if (action === 'select-option') {
                        //   setTimepointStatusValue([...newSelection]);
                        // } else if (action === 'clear') {
                        //   setTimepointStatusValue([...newSelection]);
                        // } else if (action === 'deselect-option') {
                        //   setTimepointStatusValue([...newSelection]);
                        // }
                        setTimepointStatusValue([...newSelection]);
                        console.info('timepointStatusValue:', timepointStatusValue);
                      }}
                      options={timepointStatusOptions}
                    />
                    {/* refresh button */}
                    <div
                      className="text-primary-active flex cursor-pointer items-center gap-2 self-center text-lg font-semibold"
                      onClick={() => {
                        console.info('search button clicked');
                        setFilterSorting({
                          timepointStatus: timepointStatusValue ? timepointStatusValue.join('+') : '',
                          projectCode: projectCode ? projectCode : null,
                        });
                      }}
                    >
                      <Icon name="icon-search"></Icon>
                      <span>{'刷新'}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex h-[34px] flex-row items-center">
                {/* TODO revisit the completely rounded style of button used for clearing the study list filter - for now use LegacyButton*/}
                {isFiltering && (
                  <LegacyButton
                    rounded="full"
                    variant="outlined"
                    color="primaryActive"
                    border="primaryActive"
                    className="mx-8"
                    startIcon={<Icon name="cancel" />}
                    onClick={clearFilters}
                  >
                    {t('ClearFilters')}
                  </LegacyButton>
                )}
                <Typography
                  variant="h6"
                  className="text-primary-light"
                >
                  {`${t('Number of studies')}: `}
                </Typography>
                <Typography
                  variant="h6"
                  className="mr-2"
                  data-cy={'num-studies'}
                >
                  {numOfStudies > 100 ? '>100' : numOfStudies}
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* evibased, add container to top ele. to have the same width as table body */}
      <div className="sticky -top-1 z-10 container mx-auto border-b-4 border-black">
        <div className="bg-primary-dark pt-3 pb-3">
          <InputGroup
            inputMeta={filtersMeta}
            values={filterValues}
            onValuesChange={onChange}
            sorting={filterSorting}
            onSortingChange={setFilterSorting}
            isSortingEnabled={isSortingEnabled}
          />
        </div>
        {numOfStudies > 100 && (
          <div className="container m-auto">
            <div className="bg-primary-main rounded-b py-1 text-center text-base">
              <p className="text-white">{t('Filter list to 100 studies or less to enable sorting')}</p>
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

StudyListFilter.propTypes = {
  filtersMeta: PropTypes.arrayOf(
    PropTypes.shape({
      /** Identifier used to map a field to it's value in `filterValues` */
      name: PropTypes.string.isRequired,
      /** Friendly label for filter field */
      displayName: PropTypes.string.isRequired,
      /** One of the supported filter field input types */
      inputType: PropTypes.oneOf(['Text', 'MultiSelect', 'DateRange', 'None']).isRequired,
      isSortable: PropTypes.bool.isRequired,
      /** Size of filter field in a 12-grid system */
      gridCol: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).isRequired,
      /** Options for a "MultiSelect" inputType */
      option: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.string,
          label: PropTypes.string,
        })
      ),
    })
  ).isRequired,
  filterValues: PropTypes.object.isRequired,
  numOfStudies: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  clearFilters: PropTypes.func.isRequired,
  isFiltering: PropTypes.bool.isRequired,
  onUploadClick: PropTypes.func,
  getDataSourceConfigurationComponent: PropTypes.func,
};

export default StudyListFilter;
