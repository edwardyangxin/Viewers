import React from 'react';
import PropTypes from 'prop-types';

import TargetListTableRow from './TargetListTableRow.tsx';

const TargetListTable = ({ tableDataSource }) => {
  return (
    <div className="bg-black">
      <div className="container relative m-auto">
        <table className="w-full text-white">
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
      row: PropTypes.array.isRequired,
      expandedContent: PropTypes.node.isRequired,
      querying: PropTypes.bool,
      onClickRow: PropTypes.func.isRequired,
      isExpanded: PropTypes.bool.isRequired,
    })
  ),
};

export default TargetListTable;
