import areAllImageDimensionsEqual from './areAllImageDimensionsEqual';
import areAllImageComponentsEqual from './areAllImageComponentsEqual';
import areAllImageOrientationsEqual from './areAllImageOrientationsEqual';
import areAllImagePositionsEqual from './areAllImagePositionsEqual';
import areAllImageSpacingEqual from './areAllImageSpacingEqual';
import { DisplaySetMessage, DisplaySetMessageList } from '@ohif/core';
import toNumber from '@ohif/core/src/utils/toNumber';

/**
 * Runs various checks in a single frame series
 * @param {*} instances
 * @param {*} warnings
 */
export default function checkSingleFrames(
  instances: Array<any>,
  messages: DisplaySetMessageList
): void {
  if (instances.length > 2) {
    if (!areAllImageDimensionsEqual(instances)) {
      messages.addMessage(DisplaySetMessage.CODES.INCONSISTENT_DIMENSIONS);
    }

    if (!areAllImageComponentsEqual(instances)) {
      messages.addMessage(DisplaySetMessage.CODES.INCONSISTENT_COMPONENTS);
    }

    if (!areAllImageOrientationsEqual(instances)) {
      messages.addMessage(DisplaySetMessage.CODES.INCONSISTENT_ORIENTATIONS);
    }

    if (!areAllImagePositionsEqual(instances)) {
      messages.addMessage(DisplaySetMessage.CODES.INCONSISTENT_POSITION_INFORMATION);
    }
    // evibased, 通过ImagePositionPatient tag 检查spacing
    areAllImageSpacingEqual(instances, messages);

    // evibased, check slice thickness and slice spacing
    const firstInstance = instances[0];
    const { SliceThickness, SpacingBetweenSlices } = firstInstance;
    if (SliceThickness && toNumber(SliceThickness) > 5) {
      messages.addMessage(DisplaySetMessage.CODES.INVALID_SLICE_THICKNESS);
    }
    if (SliceThickness && SpacingBetweenSlices && toNumber(SpacingBetweenSlices) > toNumber(SliceThickness)) {
      messages.addMessage(DisplaySetMessage.CODES.SPACING_BETWEEN_SLICES_GREATER_THAN_SLICE_THICKNESS);
    }
  }
}
