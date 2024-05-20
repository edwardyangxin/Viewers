/**
 * Validator is a base class that can be extended by other validator classes.
 */
class Validator {
  isBaseline: boolean;
  targetMeasurements: any;
  lastTargetMeasurements: any; // last measuments for comparison
  targetMeasurementsByOrgan: any;
  nonTargetMeasurements: any;
  lastNonTargetMeasurements: any; // last measuments for comparison
  nonTargetMeasurementsByOrgan: any;
  validationInfo: any;
  constructor() {
    this.validationInfo = {
      targetGroupWarningMessages: [],
      nonTargetGroupWarningMessages: [],
    };
  }

  setBaseline(isBaseline) {
    this.isBaseline = isBaseline;
  }

  setTargetMeasurements(targetMeasurements) {
    this.targetMeasurements = targetMeasurements;
    this.targetMeasurementsByOrgan = {};
    for (let i = 0; i < targetMeasurements.length; i++) {
      const measurement = targetMeasurements[i];
      const measurementLabelInfo = measurement.measurementLabelInfo;
      measurement.validationInfo = {
        messages: [],
      };

      if (!this.targetMeasurementsByOrgan[measurementLabelInfo?.organ?.value]) {
        this.targetMeasurementsByOrgan[measurementLabelInfo?.organ?.value] = [];
      }
      this.targetMeasurementsByOrgan[measurementLabelInfo?.organ?.value].push(measurement);
    }
  }

  getTargetMeasurements() {
    return this.targetMeasurements;
  }

  setNonTargetMeasurements(nonTargetMeasurements) {
    this.nonTargetMeasurements = nonTargetMeasurements;
    this.nonTargetMeasurementsByOrgan = {};
    for (let i = 0; i < nonTargetMeasurements.length; i++) {
      const measurement = nonTargetMeasurements[i];
      const measurementLabelInfo = measurement.measurementLabelInfo;
      measurement.validationInfo = {
        messages: [],
      };

      if (!this.nonTargetMeasurementsByOrgan[measurementLabelInfo?.organ?.value]) {
        this.nonTargetMeasurementsByOrgan[measurementLabelInfo?.organ?.value] = [];
      }
      this.nonTargetMeasurementsByOrgan[measurementLabelInfo?.organ?.value].push(measurement);
    }
  }

  getNonTargetMeasurements() {
    return this.nonTargetMeasurements;
  }

  setLastTargetMeasurements(lastTargetMeasurements) {
    this.setLastMeasurements(true, lastTargetMeasurements);
  }

  getLastTargetMeasurements() {
    return this.lastTargetMeasurements;
  }

  setLastNonTargetMeasurements(lastNonTargetMeasurements) {
    this.setLastMeasurements(false, lastNonTargetMeasurements);
  }

  getLastNonTargetMeasurements() {
    return this.lastNonTargetMeasurements;
  }

  setLastMeasurements(isTargetGroup: boolean, lastMeasurements: any) {
    const measurements = isTargetGroup ? this.targetMeasurements : this.nonTargetMeasurements;

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

    if (isTargetGroup) {
      this.lastTargetMeasurements = lastMeasurements;
    } else {
      this.lastNonTargetMeasurements = lastMeasurements;
    }
  }

  getValidationInfo() {
    return this.validationInfo;
  }

  validate() {
    throw new Error('NotImplementedError');
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

    // target validation
    let ifTargetGroup = true;
    // check organ info
    this.checkMeasurementOrganInfo(ifTargetGroup);
    // check index of targetMeasurement no more than 5
    this.checkTargetMeasurementNumber();
    // check number of measurements for same organ
    this.checkNumberOfTargetMeasurementsForSameOrgan();
    // check for measurable lesions(1. 双径测量长度提示；2. 基线靶病灶需使用双径测量)
    this.checkMeasurableLesions(ifTargetGroup);
    if (this.lastTargetMeasurements) {
      // compare with last measurements
      this.checkLastMeasurements(ifTargetGroup);
    }

    // non-target validation
    ifTargetGroup = false;
    // check organ info
    this.checkMeasurementOrganInfo(ifTargetGroup);
    // check for measurable lesions
    this.checkMeasurableLesions(ifTargetGroup);
    if (this.lastNonTargetMeasurements) {
      // compare with last measurements
      this.checkLastMeasurements(ifTargetGroup);
    }
  }

  checkMeasurementOrganInfo(ifTargetGroup: boolean) {
    const measurements = ifTargetGroup ? this.targetMeasurements : this.nonTargetMeasurements;
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
      if (ifTargetGroup) {
        this.validationInfo.targetGroupWarningMessages.push(groupWarningMessages);
      } else {
        this.validationInfo.nonTargetGroupWarningMessages.push(groupWarningMessages);
      }
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

  private checkMeasurableLesions(ifTargetGroup: boolean) {
    const measurements = ifTargetGroup ? this.targetMeasurements : this.nonTargetMeasurements;
    if (!measurements) {
      return;
    }

    let groupWarningFlag = false;
    let groupWarningMessages = [];

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
            }
          } else {
            if (length < 10) {
              measurement.validationInfo.messages.push('非淋巴结目标长径小于10mm为正常');
              measurement.validationInfo.normalLesionFlag = true;
            }
          }
        } catch {
          console.error('failed to parse short and long axis from measurement', measurement);
        }
      } else if (ifTargetGroup && this.isBaseline) {
        // baseline target measurement should be measurable
        measurement.validationInfo.messages.push('基线靶病灶需使用双径测量');
        measurement.validationInfo.baselineTargetMeasurementNotBidirectional = true;
        groupWarningFlag = true;
        groupWarningMessages.push('基线靶病灶需使用双径测量');
      }
    }

    if (groupWarningFlag) {
      if (ifTargetGroup) {
        this.validationInfo.targetGroupWarningMessages.push(...groupWarningMessages);
      } else {
        this.validationInfo.nonTargetGroupWarningMessages.push(...groupWarningMessages);
      }
    }
  }

  private checkLastMeasurements(ifTargetGroup: boolean) {
    // check missing follow-up measurement
    this.checkMissingFollowUpMeasurement(ifTargetGroup);

    // check measurement is the same organ or side as last measurement
    this.checkMeasurementConsistency(ifTargetGroup);
  }

  private checkMissingFollowUpMeasurement(ifTargetGroup: boolean) {
    const lastMeasurements = ifTargetGroup
      ? this.lastTargetMeasurements
      : this.lastNonTargetMeasurements;

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
      console.error('Missing follow-up measurement');
      if (ifTargetGroup) {
        this.validationInfo.targetGroupWarningMessages.push(groupWarningMessage);
      } else {
        this.validationInfo.nonTargetGroupWarningMessages.push(groupWarningMessage);
      }
    }
  }

  private checkMeasurementConsistency(ifTargetGroup: boolean) {
    const measurements = ifTargetGroup ? this.targetMeasurements : this.nonTargetMeasurements;
    if (!measurements) {
      return;
    }

    let groupWarningFlag = false;
    let groupWarningMessage = '';

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
          groupWarningMessage = '与往期测量不一致的器官或位置';
        }
      } else {
        console.error('Last measurement not found');
        measurement.validationInfo.messages.push('对应的往期访视测量未找到!');
        measurement.validationInfo.lastMeasurementNotFound = true;
        groupWarningFlag = true;
        groupWarningMessage = '本期测量没有对应的往期测量';
      }
    }

    if (groupWarningFlag) {
      console.error('Last measurement is not the same organ or side');
      if (ifTargetGroup) {
        this.validationInfo.targetGroupWarningMessages.push(groupWarningMessage);
      } else {
        this.validationInfo.nonTargetGroupWarningMessages.push(groupWarningMessage);
      }
    }
  }
}
