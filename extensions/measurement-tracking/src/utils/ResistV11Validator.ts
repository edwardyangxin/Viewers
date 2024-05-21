/**
 * Validator is a base class that can be extended by other validator classes.
 */
class Validator {
  isBaseline: boolean;
  targetMeasurements: any;
  lastTargetMeasurements: any; // last measuments for comparison
  targetMeasurementsByOrgan: any;
  newLesionMeasurements: any;
  newLesionMeasurementsByOrgan: any;
  lastNewLesionMeasurements: any; // last measuments for comparison
  nonTargetMeasurements: any;
  lastNonTargetMeasurements: any; // last measuments for comparison
  nonTargetMeasurementsByOrgan: any;
  validationInfo: any;
  constructor() {
    this.validationInfo = {
      targetGroupWarningMessages: [],
      newLesionGroupWarningMessages: [],
      nonTargetGroupWarningMessages: [],
    };
  }

  setBaseline(isBaseline) {
    this.isBaseline = isBaseline;
  }

  getValidationInfo() {
    return this.validationInfo;
  }

  validate() {
    throw new Error('NotImplementedError');
  }

  setTargetMeasurements(targetMeasurements) {
    this.setMeasurements(targetMeasurements, 'target');
  }

  getTargetMeasurements() {
    return this.targetMeasurements;
  }

  setNewLesionMeasurements(newLesionMeasurements) {
    this.setMeasurements(newLesionMeasurements, 'newLesion');
  }

  getNewLesionMeasurements() {
    return this.newLesionMeasurements;
  }

  setNonTargetMeasurements(nonTargetMeasurements) {
    this.setMeasurements(nonTargetMeasurements, 'nonTarget');
  }

  getNonTargetMeasurements() {
    return this.nonTargetMeasurements;
  }

  setLastTargetMeasurements(lastTargetMeasurements) {
    this.setLastMeasurements(lastTargetMeasurements, 'target');
  }

  getLastTargetMeasurements() {
    return this.lastTargetMeasurements;
  }

  setLastNewLesionMeasurements(lastNewLesionMeasurements) {
    this.setLastMeasurements(lastNewLesionMeasurements, 'newLesion');
  }

  getLastNewLesionMeasurements() {
    return this.lastNewLesionMeasurements;
  }

  setLastNonTargetMeasurements(lastNonTargetMeasurements) {
    this.setLastMeasurements(lastNonTargetMeasurements, 'nonTarget');
  }

  getLastNonTargetMeasurements() {
    return this.lastNonTargetMeasurements;
  }

  setMeasurements(measurements: any[], groupName: string) {
    const measurementPropertyName = `${groupName}Measurements`;
    const measurementByOrganPropertyName = `${groupName}MeasurementsByOrgan`;

    this[measurementPropertyName] = measurements;
    this[measurementByOrganPropertyName] = {};

    for (let i = 0; i < measurements.length; i++) {
      const measurement = measurements[i];
      const measurementLabelInfo = measurement.measurementLabelInfo;
      measurement.validationInfo = {
        messages: [],
      };

      if (!this[measurementByOrganPropertyName][measurementLabelInfo?.organ?.value]) {
        this[measurementByOrganPropertyName][measurementLabelInfo?.organ?.value] = [];
      }
      this[measurementByOrganPropertyName][measurementLabelInfo?.organ?.value].push(measurement);
    }
  }

  setLastMeasurements(lastMeasurements: any[], groupName: string) {
    const measurementPropertyName = `${groupName}Measurements`;
    const groupNameCapitalized = groupName.charAt(0).toUpperCase() + groupName.slice(1);
    const lastMeasurementPropertyName = `last${groupNameCapitalized}Measurements`;

    // find matching follow-up measurement for each of last measurement
    const measurements = this[measurementPropertyName];

    // if (!measurements) {
    //   console.error('set the measurements first');
    //   return;
    // }
    // find the last measurement for each measurement
    for (let i = 0; i < measurements.length; i++) {
      const measurement = measurements[i];
      // find the 1st last measurement that has the same lesion index for now
      const lastMeasurement = lastMeasurements.find(
        m =>
          m.measurementLabelInfo?.lesionIndex.value ===
          measurement.measurementLabelInfo?.lesionIndex.value
      );
      measurement.lastMeasurement = lastMeasurement;
    }

    // find the follow-up measurement for each of last measurement
    for (let i = 0; i < lastMeasurements.length; i++) {
      const measurement = lastMeasurements[i];
      // find the 1st follow-up measurement that has the same lesion index for now
      const followUpMeasurement = measurements.find(
        m =>
          m.measurementLabelInfo?.lesionIndex.value ===
          measurement.measurementLabelInfo?.lesionIndex.value
      );
      measurement.followUpMeasurement = followUpMeasurement;
      measurement.validationInfo = {
        messages: [],
      };
    }

    this[lastMeasurementPropertyName] = lastMeasurements;
  }
}

/**
 * ResistV11Validator exposes methods to validate the data received from the ResistV11 device.
 */
export class ResistV11Validator extends Validator {
  PROTOCOL = 'ResistV1.1';
  VERSION = 'V1';
  constructor() {
    console.log('init ResistV11Validator...');
    super();
    this.validationInfo.protocol = this.PROTOCOL; // indicate the protocol of the validator
    this.validationInfo.version = this.VERSION; // indicate the version of the validator
  }

  validate() {
    console.log('run ResistV11Validator validate method');
    if (!(this.targetMeasurements && this.targetMeasurements.length > 0)) {
      console.info('No target measurements found to validate!');
      this.validationInfo.targetGroupWarningMessages.push('靶病灶不能为空');
    }

    // all measurements validation
    // check cavitation
    this.checkCavitation();
    // check organ info
    this.checkMeasurementOrganInfo();
    // check for measurable lesions(1. 双径测量长度提示；2. 基线靶病灶需使用双径测量)
    this.checkMeasurableLesions();
    // compare with last measurements
    this.checkLastMeasurements();

    // target validation specific
    // check index of targetMeasurement no more than 5
    this.checkTargetMeasurementNumber();
    // check number of measurements for same organ
    this.checkNumberOfTargetMeasurementsForSameOrgan();

    // new lesion validation specific
    // 1. 不能在基线中出现新病灶
    this.checkNewLesionMeasurements();
  }

  private checkCavitation() {
    this.checkCavitationForGroup('target');
    this.checkCavitationForGroup('newLesion');
    this.checkCavitationForGroup('nonTarget');
  }

  private checkCavitationForGroup(groupName: string) {
    const measurementPropertyName = `${groupName}Measurements`;

    const measurements = this[measurementPropertyName];
    if (!measurements) {
      return;
    }

    let groupWarningFlag = false;
    let groupWarningMessages = [];

    for (let i = 0; i < measurements.length; i++) {
      const measurement = measurements[i];
      const measurementLabelInfo = measurement.measurementLabelInfo;
      const cavitation = measurementLabelInfo.cavitation;
      if (cavitation) {
        measurement.validationInfo.messages.push('病灶存在空腔');
        measurement.validationInfo.cavitationFlag = true;
        // groupWarningFlag = true;
        // groupWarningMessages.push('存在空腔');
      }
    }

    if (groupWarningFlag) {
      const groupWarningPropertyName = `${groupName}GroupWarningMessages`;
      this.validationInfo[groupWarningPropertyName].push(...groupWarningMessages);
    }
  }

  private checkMeasurementOrganInfo() {
    this.checkMeasurementOrganInfoForGroup('target');
    this.checkMeasurementOrganInfoForGroup('newLesion');
    this.checkMeasurementOrganInfoForGroup('nonTarget');
  }

  private checkMeasurementOrganInfoForGroup(groupName: string) {
    const measurementPropertyName = `${groupName}Measurements`;

    const measurements = this[measurementPropertyName];
    if (!measurements) {
      return;
    }

    let groupWarningFlag = false;
    let groupWarningMessages = '';

    for (let i = 0; i < measurements.length; i++) {
      const measurement = measurements[i];
      const measurementLabelInfo = measurement.measurementLabelInfo;
      if (!measurementLabelInfo?.organ?.value) {
        console.error('Organ info is missing');
        measurement.validationInfo.messages.push('器官信息不能为空');
        measurement.validationInfo.organInfoMissing = true;
        groupWarningFlag = true;
        groupWarningMessages = '器官信息不能为空';
      }
    }

    if (groupWarningFlag) {
      const groupWarningPropertyName = `${groupName}GroupWarningMessages`;
      this.validationInfo[groupWarningPropertyName].push(groupWarningMessages);
    }
  }

  private checkMeasurableLesions() {
    this.checkMeasurableLesionsForGroup('target');
    this.checkMeasurableLesionsForGroup('newLesion');
    this.checkMeasurableLesionsForGroup('nonTarget');
  }

  private checkMeasurableLesionsForGroup(groupName: string) {
    const measurementPropertyName = `${groupName}Measurements`;

    const measurements = this[measurementPropertyName];
    if (!measurements) {
      return;
    }

    let groupWarningFlag = false;
    const groupWarningMessages = [];

    for (let i = 0; i < measurements.length; i++) {
      const measurement = measurements[i];
      const measurementLabelInfo = measurement.measurementLabelInfo;
      const toolName = measurement.toolName;
      if (toolName === 'Bidirectional') {
        // short and long axis measurement
        const mData = measurement.data;
        try {
          // length and width from data object
          const keys = Object.keys(mData);
          const firstKey = keys[0];
          const length = mData[firstKey].length;
          const width = mData[firstKey].width;
          const organ = measurementLabelInfo.organ.value;

          if (organ === 'Lymph_Node') {
            if (width < 15) {
              measurement.validationInfo.messages.push('淋巴结目标短径小于15mm为正常');
              measurement.validationInfo.normalLesionFlag = true;
              if (this.isBaseline) {
                groupWarningFlag = true;
                groupWarningMessages.push('基线包含正常病灶');
              }
            }
          } else {
            if (length < 10) {
              measurement.validationInfo.messages.push('非淋巴结目标长径小于10mm为正常');
              measurement.validationInfo.normalLesionFlag = true;
              if (this.isBaseline) {
                groupWarningFlag = true;
                groupWarningMessages.push('基线包含正常病灶');
              }
            }
          }
        } catch {
          console.error('failed to parse short and long axis from measurement', measurement);
        }
      } else if (groupName === 'target' && this.isBaseline) {
        // baseline target measurement should be measurable
        measurement.validationInfo.messages.push('基线靶病灶需使用双径测量');
        measurement.validationInfo.baselineTargetMeasurementNotBidirectional = true;
        groupWarningFlag = true;
        groupWarningMessages.push('基线靶病灶需使用双径测量');
      }
    }

    if (groupWarningFlag) {
      const groupWarningPropertyName = `${groupName}GroupWarningMessages`;
      this.validationInfo[groupWarningPropertyName].push(...groupWarningMessages);
    }
  }

  private checkLastMeasurements() {
    this.checkLastMeasurementsForGroup('target');
    this.checkLastMeasurementsForGroup('newLesion');
    this.checkLastMeasurementsForGroup('nonTarget');
  }

  private checkLastMeasurementsForGroup(groupName: string) {
    // baseline has no last measurements to compare
    if (this.isBaseline) {
      return;
    }

    // check missing follow-up measurement
    this.checkMissingFollowUpMeasurement(groupName);

    // check measurement is the same organ or side as last measurement
    this.checkMeasurementConsistency(groupName);
  }

  private checkMissingFollowUpMeasurement(groupName: string) {
    const groupNameCapitalized = groupName.charAt(0).toUpperCase() + groupName.slice(1);
    const lastMeasurementPropertyName = `last${groupNameCapitalized}Measurements`;

    const lastMeasurements = this[lastMeasurementPropertyName];

    if (!lastMeasurements) {
      return;
    }

    let groupWarningFlag = false;
    let groupWarningMessage = '';

    for (let i = 0; i < lastMeasurements.length; i++) {
      const lastMeasurement = lastMeasurements[i];
      if (!lastMeasurement.followUpMeasurement) {
        console.error('Missing follow-up measurement');
        lastMeasurement.validationInfo.messages.push('缺少本期对应测量');
        lastMeasurement.validationInfo.missingFollowUpMeasurement = true;
        groupWarningFlag = true;
        groupWarningMessage = '往期测量缺少本期对应测量';
      }
    }

    if (groupWarningFlag) {
      const groupWarningPropertyName = `${groupName}GroupWarningMessages`;
      this.validationInfo[groupWarningPropertyName].push(groupWarningMessage);
    }
  }

  private checkMeasurementConsistency(groupName: string) {
    const measurementPropertyName = `${groupName}Measurements`;

    const measurements = this[measurementPropertyName];
    if (!measurements) {
      return;
    }

    let groupWarningFlag = false;
    const groupWarningMessage = [];

    for (let i = 0; i < measurements.length; i++) {
      const measurement = measurements[i];
      const lastMeasurement = measurement.lastMeasurement;

      if (lastMeasurement) {
        const measurementLabelInfo = measurement.measurementLabelInfo;
        const lastMeasurementLabelInfo = lastMeasurement.measurementLabelInfo;

        if (
          measurementLabelInfo.organ.value !== lastMeasurementLabelInfo.organ.value ||
          measurementLabelInfo.organLocation?.value !== lastMeasurementLabelInfo.organLocation?.value ||
          measurementLabelInfo.organLateral?.value !== lastMeasurementLabelInfo.organLateral?.value
        ) {
          console.error('Last measurement is not the same organ or side');
          measurement.validationInfo.messages.push('与往期测量的器官或位置不一致');
          measurement.validationInfo.lastMeasurementNotSameOrganOrSide = true;
          groupWarningFlag = true;
          groupWarningMessage.push('与往期测量不一致的器官或位置');
        }

        if (measurement.modality !== lastMeasurement.modality) {
          console.error('Last measurement is not the same modality');
          measurement.validationInfo.messages.push('与往期测量的模态不一致');
          measurement.validationInfo.lastMeasurementNotSameModality = true;
          groupWarningFlag = true;
          groupWarningMessage.push('存在与往期测量模态不一致');
        }
      } else if (groupName === 'newLesion') {
        measurement.validationInfo.messages.push('首次出现的新病灶');
        measurement.validationInfo.lastMeasurementNotFound = true;
        groupWarningFlag = true;
        groupWarningMessage.push('首次发现新病灶');
      } else {
        console.error('Last measurement not found');
        measurement.validationInfo.messages.push('没有对应的往期测量!');
        measurement.validationInfo.lastMeasurementNotFound = true;
        groupWarningFlag = true;
        groupWarningMessage.push('本期测量存在没有对应的往期测量，请检查是否为新发病灶');
      }
    }

    if (groupWarningFlag) {
      const groupWarningPropertyName = `${groupName}GroupWarningMessages`;
      this.validationInfo[groupWarningPropertyName].push(...groupWarningMessage);
    }
  }

  private checkNumberOfTargetMeasurementsForSameOrgan() {
    if (!this.targetMeasurementsByOrgan) {
      return;
    }

    for (const organ in this.targetMeasurementsByOrgan) {
      const measurements = this.targetMeasurementsByOrgan[organ];
      const indexCounter = [];
      for (let i = 0; i < measurements.length; i++) {
        const measurement = measurements[i];
        const measurementLabelInfo = measurement.measurementLabelInfo;
        if (!indexCounter.includes(measurementLabelInfo.lesionIndex.value)) {
          indexCounter.push(measurementLabelInfo.lesionIndex.value);
        }
      }
      if (indexCounter.length > 2) {
        console.error('Number of target measurements for same organ is invalid');
        this.validationInfo.targetGroupWarningMessages.push('靶病灶不能超过2个');
        for (let i = 0; i < measurements.length; i++) {
          const measurement = measurements[i];
          measurement.validationInfo.messages.push('靶病灶不能超过2个');
          measurement.validationInfo.numberOfMeasurementsExeed2 = true;
        }
      }
    }
  }

  private checkTargetMeasurementNumber() {
    if (!this.targetMeasurements) {
      return;
    }

    let validFlag = true;
    for (let i = 0; i < this.targetMeasurements.length; i++) {
      const measurement = this.targetMeasurements[i];
      const measurementLabelInfo = measurement.measurementLabelInfo;
      if (measurementLabelInfo.lesionIndex.value > 5) {
        validFlag = false;
        measurement.validationInfo.messages.push('靶病灶序号不能超过5个');
        measurement.validationInfo.targetMeasurementIndexExeed5 = true;
      }
    }
    if (!validFlag) {
      console.error('Target measurement index is invalid');
      this.validationInfo.targetMessages.push('靶病灶序号不能超过5个');
      this.validationInfo.targetMeasurementIndexValid = false;
    }
  }

  private checkNewLesionMeasurements() {
    if (this.isBaseline && this.newLesionMeasurements) {
      console.error('Baseline should not have new lesion measurements');
      this.validationInfo.newLesionGroupWarningMessages.push('基线不能出现新病灶!');
    }
  }
}
