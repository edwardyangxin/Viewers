import React from 'react';
import { TaskMapping } from '../../utils/mappings';
import ReportThumbnail from '../ReportThumbnail';

const ReportThumbnailList = ({ reports, onReportThumbnailClick, onReportThumbnailDoubleClick }) => {
  return (
    <div
      id="ohif-thumbnail-list"
      className="ohif-scrollbar bg-secondary-main min-h-[150px] overflow-y-hidden"
    >
      {reports.map(({ createTime, username, measurements, task, reportRef }, index) => {
        const taskType = task?.type;
        const userAlias = task?.userAlias;
        const isArbitration = taskType === 'arbitration';
        const taskTypeStr = taskType ? `${TaskMapping[taskType]}报告` : '未知类型';
        // Convert ISO time string to Date object
        const dateObject = new Date(createTime);
        // Format local date as 'yyyy-MM-DD'
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        const createDate = dateObject.toLocaleDateString('en-CA', options);
        const key = username + createDate;
        let reportName = '';
        if (isArbitration) {
          reportName = `仲裁人:${userAlias ? userAlias : username}(选择阅片人:${
            reportRef?.task?.userAlias ? reportRef?.task?.userAlias : reportRef?.username
          })`;
        } else {
          reportName = `阅片人:${userAlias ? userAlias : username}`;
        }
        // evibased, dragData for drag data to viewport?
        const dragData = {
          type: 'displayset',
          displaySetInstanceUID: key,
          report: reports[index],
        };
        switch ('thumbnailNoImage') {
          case 'thumbnailNoImage':
            return (
              <ReportThumbnail
                isActive={false}
                key={key}
                displaySetInstanceUID={key}
                dragData={dragData}
                taskType={taskTypeStr}
                taskTypeTooltip={'报告类型'}
                isArbitration={isArbitration}
                seriesDate={createDate}
                description={reportName}
                canReject={false}
                onReject={undefined}
                onClick={() => onReportThumbnailClick(key)}
                onDoubleClick={() => onReportThumbnailDoubleClick(reports[index])}
              />
            );
          default:
            return <></>;
        }
      })}
    </div>
  );
};

// TODO: evibased, add prop types
// ReportThumbnailList.propTypes = {
//   thumbnails: PropTypes.arrayOf(
//     PropTypes.shape({
//       displaySetInstanceUID: PropTypes.string.isRequired,
//       imageSrc: PropTypes.string,
//       imageAltText: PropTypes.string,
//       seriesDate: PropTypes.string,
//       seriesNumber: Types.StringNumber,
//       numInstances: PropTypes.number,
//       description: PropTypes.string,
//       componentType: Types.ThumbnailType.isRequired,
//       viewportIdentificator: Types.StringArray,
//       isTracked: PropTypes.bool,
//       /**
//        * Data the thumbnail should expose to a receiving drop target. Use a matching
//        * `dragData.type` to identify which targets can receive this draggable item.
//        * If this is not set, drag-n-drop will be disabled for this thumbnail.
//        *
//        * Ref: https://react-dnd.github.io/react-dnd/docs/api/use-drag#specification-object-members
//        */
//       dragData: PropTypes.shape({
//         /** Must match the "type" a dropTarget expects */
//         type: PropTypes.string.isRequired,
//       }),
//     })
//   ),
//   activeDisplaySetInstanceUIDs: PropTypes.arrayOf(PropTypes.string),
//   onReportThumbnailClick: PropTypes.func.isRequired,
//   onReportThumbnailDoubleClick: PropTypes.func.isRequired,
//   onClickUntrack: PropTypes.func.isRequired,
// };

export default ReportThumbnailList;