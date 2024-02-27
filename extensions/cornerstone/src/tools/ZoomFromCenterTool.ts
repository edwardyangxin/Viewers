import { LengthTool, ZoomTool, utilities } from '@cornerstonejs/tools';

/**
 * Evibased ZoomFromCenterTool, which extends the ZoomTool.
 * TODO: should config Zoom Tool zoomToCenter: true. but not supported yet.
 */
class ZoomFromCenterTool extends ZoomTool {
  static toolName = 'Zoom';
  constructor(
    toolProps: PublicToolProps = {},
    defaultToolProps: ToolProps = {
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {
        // whether zoom to the center of the image OR zoom to the mouse position
        zoomToCenter: true,
        minZoomScale: 0.1,
        maxZoomScale: 30,
        pinchToZoom: true,
        pan: true,
        invert: false,
      },
    }
  ) {
    super(toolProps, defaultToolProps);
  }
}

export default ZoomFromCenterTool;
