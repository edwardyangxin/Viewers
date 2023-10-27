import React from 'react';
import ThumbnailNoImage from '../ThumbnailNoImage';

const ReportThumbnailList = ({
  reportThumbnails,
  onReportThumbnailClick,
  onReportThumbnailDoubleClick,
}) => {
  return (
    <div
      id="ohif-thumbnail-list"
      className="ohif-scrollbar min-h-[150px] overflow-y-hidden bg-black py-3"
    >
      {reportThumbnails.map(
        ({
          // get displaySetInstanceUID, for click on the thumbnail
          // 唯一idfor thumbnail component
          // displaySetInstanceUID,
          // report title: "test|20231024|测试report"
          // description,
          // dragData example: {
          //   type: "displayset",
          //   displaySetInstanceUID: "c9cf4e5f-a5e4-9f76-f50f-e3d4510efd44",
          // }
          // 全量的report信息？
          // dragData,
          // example: "24-Oct-2023", 显示report创建日期
          // seriesDate,
          report_name,
          timestamp,
          username,
          user_report_version,
          report_template,
          report_template_version,
          measurements,
        }) => {
          const key = username + timestamp;
          // TODO: evibased, dragData for drag data to viewport?
          const dragData = {
            type: 'displayset',
            displaySetInstanceUID: key,
            report: {
              report_name: report_name,
              timestamp: timestamp,
              username: username,
              user_report_version: user_report_version,
              report_template: report_template,
              report_template_version: report_template_version,
              measurements: measurements,
            },
          }
          // report default modality
          const modality = 'SR';
          switch ('thumbnailNoImage') {
            case 'thumbnailNoImage':
              return (
                <ThumbnailNoImage
                  isActive={false}
                  key={key}
                  displaySetInstanceUID={key}
                  dragData={dragData}
                  modality={modality}
                  modalityTooltip={_getModalityTooltip(modality)}
                  messages={undefined}
                  seriesDate={timestamp}
                  description={report_name}
                  canReject={false}
                  onReject={undefined}
                  onClick={() => onReportThumbnailClick(key)}
                  onDoubleClick={() => onReportThumbnailDoubleClick(dragData.report)}
                  isHydratedForDerivedDisplaySet={undefined}
                />
              );
            default:
              return <></>;
          }
        }
      )}
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

function _getModalityTooltip(modality) {
  if (_modalityTooltips.hasOwnProperty(modality)) {
    return _modalityTooltips[modality];
  }

  return 'Unknown';
}

const _modalityTooltips = {
  SR: 'Structured Report',
  SEG: 'Segmentation',
  RTSTRUCT: 'RT Structure Set',
};

export default ReportThumbnailList;
