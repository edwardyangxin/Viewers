import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import { Icon } from '@ohif/ui';
import WarningInfoTooltip from '../WarningInfoTooltip';

function getGridWidthClass(gridCol) {
  const widthClasses = {
    1: 'w-1/24',
    2: 'w-2/24',
    3: 'w-3/24',
    4: 'w-4/24',
    5: 'w-5/24',
    6: 'w-6/24',
    7: 'w-7/24',
    8: 'w-8/24',
    9: 'w-9/24',
    10: 'w-10/24',
    11: 'w-11/24',
    12: 'w-12/24',
    13: 'w-13/24',
    14: 'w-14/24',
    15: 'w-15/24',
    16: 'w-16/24',
    17: 'w-17/24',
    18: 'w-18/24',
    19: 'w-19/24',
    20: 'w-20/24',
    21: 'w-21/24',
    22: 'w-22/24',
    23: 'w-23/24',
    24: 'w-24/24',
  };

  return widthClasses[gridCol];
}

const TargetListTableRow = props => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { tableData, tableId } = props;
  const { row, expandedContent } = tableData;
  return (
    <>
      <tr className="select-none">
        <td
          className={classnames('border-0 p-0', {
            'border-secondary-light bg-slate-300 border-b': isExpanded,
          })}
        >
          <div
            className={classnames(
              'w-full transition duration-300',
              {
                'border-secondary-light hover:border-secondary-light mb-2 overflow-hidden rounded border':
                  isExpanded,
              },
              {
                'border-transparent': !isExpanded,
              }
            )}
          >
            <table className={classnames('w-full p-4')}>
              <tbody>
                <tr
                  className={classnames(
                    'hover:bg-secondary-main cursor-pointer transition duration-300',
                    {
                      'bg-slate-300': !isExpanded,
                    },
                    { 'bg-slate-300': isExpanded }
                  )}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {row.map((cell, index) => {
                    const { content, title, gridCol, warningInfo } = cell;
                    return (
                      <td
                        key={index}
                        className={classnames(
                          'truncate px-4 py-2 text-lg',
                          { 'border-secondary-light border-b': !isExpanded },
                          getGridWidthClass(gridCol) || ''
                        )}
                        style={{
                          maxWidth: 0,
                        }}
                        title={title} // title for tooltip
                      >
                        <div className="flex">
                          {index === 0 && (
                            // row expand/collapse icon
                            <div>
                              <Icon
                                name={isExpanded ? 'chevron-down' : 'chevron-right'}
                                className="mr-4 inline-flex"
                              />
                            </div>
                          )}
                          <div
                            className={classnames({ 'overflow-hidden': true }, { truncate: true })}
                          >
                            {/* 列的title */}
                            {content}
                          </div>
                          {index === 0 && (
                            <WarningInfoTooltip
                              id={'ReportGroup' + tableId + index}
                              position="right"
                              warningInfo={warningInfo}
                            ></WarningInfoTooltip>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                {isExpanded && (
                  // evibased, table的下拉详细内容，expanded row content below the row
                  <tr className="max-h-0 w-full select-text overflow-hidden bg-slate-300">
                    <td colSpan={row.length}>{expandedContent}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </>
  );
};

TargetListTableRow.propTypes = {
  tableData: PropTypes.shape({
    /** A table row represented by an array of "cell" objects */
    row: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        /** Optional content to render in row's cell */
        content: PropTypes.node,
        /** Title attribute to use for provided content */
        title: PropTypes.string,
        gridCol: PropTypes.number.isRequired,
      })
    ).isRequired,
    expandedContent: PropTypes.node.isRequired,
    dataCY: PropTypes.string,
  }),
  tableId: PropTypes.number.isRequired,
};

export default TargetListTableRow;
