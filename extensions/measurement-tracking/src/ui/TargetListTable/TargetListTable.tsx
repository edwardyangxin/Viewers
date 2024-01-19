import React from 'react';
import PropTypes from 'prop-types';

import TargetListTableRow from './TargetListTableRow.tsx';

const TargetListTable = ({ tableDataSource }) => {
  return (
    <div className="bg-slate-400">
      <div className="container relative m-auto">
        <table className="w-full text-black">
          <tbody>
            {tableDataSource.map((tableData, i) => {
              return (
                <TargetListTableRow
                  tableData={tableData}
                  key={i}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

TargetListTable.propTypes = {
  tableDataSource: PropTypes.arrayOf(
    PropTypes.shape({
      row: PropTypes.array,
      expandedContent: PropTypes.node,
      querying: PropTypes.bool,
      onClickRow: PropTypes.func,
      isExpanded: PropTypes.bool,
    })
  ),
};

export default TargetListTable;
