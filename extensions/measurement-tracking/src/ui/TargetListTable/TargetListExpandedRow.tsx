import React from 'react';
import PropTypes from 'prop-types';

import { TableBody, TableRow, TableCell } from '@ohif/ui';
import ReportTableHead from '../ReportTableHead';
import ReportTable from '../ReportTable';
import WarningInfoTooltip from '../WarningInfoTooltip';

const TargetListExpandedRow = ({
  tableTitle,
  tableId,
  tableColumns,
  tableDataSource,
  tabelBgColor = 'bg-slate-300',
}) => {
  const cellsNum = Object.keys(tableColumns).length;
  return (
    <div className={`w-full py-4 pl-12 pr-2 ${tabelBgColor}`}>
      {tableTitle && <div className="text-lg font-bold text-black">{tableTitle}</div>}
      <div>
        <ReportTable>
          <ReportTableHead>
            <TableRow>
              {Object.keys(tableColumns).map(columnKey => {
                return (
                  <TableCell
                    cellsNum={cellsNum}
                    key={columnKey}
                  >
                    {tableColumns[columnKey]}
                  </TableCell>
                );
              })}
            </TableRow>
          </ReportTableHead>

          <TableBody>
            {tableDataSource.map((row, i) => {
              const warningInfo = row.warningInfo;
              delete row.warningInfo;
              return <TableRow key={i}>
                      {Object.keys(row).map(cellKey => {
                        const content = row[cellKey];
                        const ifIndexCell = cellKey === 'index';
                        const lesionIndex = row.index
                        return (
                          <TableCell
                            cellsNum={cellsNum}
                            key={cellKey}
                          >
                            <div className="flex">
                              <span className="truncate">{content}</span>
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
                    </TableRow>;
            })}
          </TableBody>
        </ReportTable>
      </div>
    </div>
  );
};

TargetListExpandedRow.propTypes = {
  tableTitle: PropTypes.string,
  tableDataSource: PropTypes.arrayOf(PropTypes.object),
  tableColumns: PropTypes.object,
  tabelBgColor: PropTypes.string,
  children: PropTypes.node,
};

export default TargetListExpandedRow;
