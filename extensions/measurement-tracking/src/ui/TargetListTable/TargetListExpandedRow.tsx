import React from 'react';
import PropTypes from 'prop-types';

import { TableBody, TableRow, TableCell } from '@ohif/ui';
import ReportTableHead from '../ReportTableHead';
import ReportTable from '../ReportTable';

const TargetListExpandedRow = ({
  tableTitle,
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
            {tableDataSource.map((row, i) => (
              <TableRow key={i}>
                {Object.keys(row).map(cellKey => {
                  const content = row[cellKey];
                  return (
                    <TableCell
                      cellsNum={cellsNum}
                      key={cellKey}
                    >
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </ReportTable>
      </div>
    </div>
  );
};

TargetListExpandedRow.propTypes = {
  tableDataSource: PropTypes.arrayOf(PropTypes.object),
  tableColumns: PropTypes.object,
  children: PropTypes.node,
};

export default TargetListExpandedRow;
