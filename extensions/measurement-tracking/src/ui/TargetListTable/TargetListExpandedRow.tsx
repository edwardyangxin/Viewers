import React from 'react';
import PropTypes from 'prop-types';

import { TableBody, TableRow, TableCell } from '@ohif/ui';
import ReportTable from '../ReportTable';
import WarningInfoTooltip from '../WarningInfoTooltip';

const TargetListExpandedRow = ({
  tableTitle,
  tableId,
  tableColumns,
  tableDataSource,
  tabelBgColor = 'bg-slate-300',
}) => {
  return (
    <div className={`w-full py-4 pl-12 pr-2 ${tabelBgColor}`}>
      {tableTitle && <div className="text-lg font-bold text-black">{tableTitle}</div>}
      <div>
        <ReportTable>
          <div className="flex border-b pr-2 font-bold">
            <TableRow isTableHead={true}>
              {Object.keys(tableColumns).map((columnKey, i) => {
                return (
                  <TableCell key={tableId + columnKey + i}>{tableColumns[columnKey]}</TableCell>
                );
              })}
            </TableRow>
          </div>

          <TableBody>
            {tableDataSource.map((row, i) => {
              const warningInfo = row.warningInfo;
              // TableRow 会计算 children 的数量来设置TableCell cellsNum的长度，所以这里需要删除 warningInfo 和 showToolTipColumnIndex
              delete row.warningInfo;
              return (
                <TableRow key={tableId + 'Row' + i}>
                  {Object.keys(row).map((cellKey, j) => {
                    const content = row[cellKey];
                    const ifIndexCell = cellKey === 'index';
                    const lesionIndex = row.index;
                    return (
                      <TableCell key={tableId + 'Cell' + lesionIndex + j}>
                        <div className="flex">
                          <span>{content}</span>
                          {ifIndexCell && warningInfo && warningInfo.length > 0 && (
                            <WarningInfoTooltip
                              id={`${tableId}Meas${lesionIndex}${i}`}
                              position="right"
                              warningInfo={warningInfo}
                            ></WarningInfoTooltip>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </ReportTable>
      </div>
    </div>
  );
};

TargetListExpandedRow.propTypes = {
  tableTitle: PropTypes.string,
  tableId: PropTypes.string,
  tableDataSource: PropTypes.arrayOf(PropTypes.object),
  tableColumns: PropTypes.object,
  tabelBgColor: PropTypes.string,
  children: PropTypes.node,
};

export default TargetListExpandedRow;
