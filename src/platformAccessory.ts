import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { ReolinkExtrasHomebridgePlatform } from './platform';
import { CameraConfig, sirenToggle } from './reolink';

export class ReolinkExtraAccessory {
  private sirenService: Service;
  private cameraConfig: CameraConfig;
  constructor(
    private readonly platform: ReolinkExtrasHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.cameraConfig = this.accessory.context.device;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');


    this.sirenService = this.accessory.getService('Siren') ||
      this.accessory.addService(this.platform.Service.Switch, 'Siren');

    this.sirenService.setCharacteristic(this.platform.Characteristic.Name, `${accessory.context.device.name} Siren`);
    this.sirenService.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setSirenOn.bind(this));

    this.platform.log.debug('Finished initializing accessory:', accessory.displayName);
  }

  async setSirenOn(value: CharacteristicValue) {
    const sirenState = value === true;

    await sirenToggle(this.cameraConfig, sirenState).catch(x => {
      this.platform.log.error(x);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    });

    this.platform.log.debug('Siren:', sirenState);
  }

}
