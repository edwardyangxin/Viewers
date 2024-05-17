/**
 * Validator is a base class that can be extended by other validator classes.
 */
class Validator {
  targetMeasurements: any;
  targetMeasurementsByOrgan: any;
  nonTargetMeasurements: any;
  nonTargetMeasurementsByOrgan: any;
  validationInfo: any;
  constructor() {
    this.validationInfo = {
      targetGroupWarningMessages: [],
      nonTargetGroupWarningMessages: [],
    };
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

  getValidationInfo() {
    return this.validationInfo;
  }

  validate() {
    throw new Error('NotImplementedError');
  }
}

/**
 * ResistV11Validator exposes methods to validate the data received from the ResistV11 device.
 * 
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
      return;
    }
    // check index of targetMeasurement no more than 5
    this.checkTargetMeasurementNumber();
    // check number of measurements for same organ
    this.checkNumberOfTargetMeasurementsForSameOrgan();
  }

  checkNumberOfTargetMeasurementsForSameOrgan() {
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

  checkTargetMeasurementNumber() {
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
}
