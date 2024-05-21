import sortInstancesByPosition from '@ohif/core/src/utils/sortInstancesByPosition';
import { constructableModalities } from '@ohif/core/src/utils/isDisplaySetReconstructable';
import { DisplaySetMessage, DisplaySetMessageList } from '@ohif/core';
import checkMultiFrame from './utils/validations/checkMultiframe';
import checkSingleFrames from './utils/validations/checkSingleFrames';
/**
 * Checks if a series is reconstructable to a 3D volume.
 * evibased, displaySet data checks/validations, displaySet messages 数据检查
 * @param {Object[]} instances An array of `OHIFInstanceMetadata` objects.
 */
export default function getDisplaySetMessages(
  instances: Array<any>,
  isReconstructable: boolean,
  isDynamicVolume: boolean
): DisplaySetMessageList {
  const messages = new DisplaySetMessageList();

  if (isDynamicVolume) {
    return messages;
  }

  // evibased, 没有实例
  if (!instances.length) {
    messages.addMessage(DisplaySetMessage.CODES.NO_VALID_INSTANCES);
    return;
  }

  const firstInstance = instances[0];
  const { Modality, ImageType, NumberOfFrames } = firstInstance;
  // Due to current requirements, LOCALIZER series doesn't have any messages
  if (ImageType?.includes('LOCALIZER')) {
    return messages;
  }

  if (!constructableModalities.includes(Modality)) {
    return messages;
  }

  const isMultiframe = NumberOfFrames > 1;
  // Can't reconstruct if all instances don't have the ImagePositionPatient.
  // evibased，没有位置信息，ImagePositionPatient tag 为空
  if (!isMultiframe && !instances.every(instance => instance.ImagePositionPatient)) {
    messages.addMessage(DisplaySetMessage.CODES.NO_POSITION_INFORMATION);
  }

  const sortedInstances = sortInstancesByPosition(instances);

  // evibased, TODO: multiframe check
  isMultiframe
    ? checkMultiFrame(sortedInstances[0], messages)
    : checkSingleFrames(sortedInstances, messages);

  if (!isReconstructable) {
    messages.addMessage(DisplaySetMessage.CODES.NOT_RECONSTRUCTABLE);
  }
  return messages;
}
