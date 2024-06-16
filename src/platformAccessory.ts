import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { ReolinkSirenAndLightHomebridgePlatform } from './platform';
import { CameraConfig, LightState, getWhiteLed, setWhiteLed, sirenToggle } from './reolink';

export class ReolinkSirenAndLightAccessory {
  private lightService?: Service;
  private sirenService?: Service;
  private cameraConfig: CameraConfig;
  private lastState: LightState = {
    isOn: false,
    brightLevel: 100,
  };

  private hasCalledGetLightStatusBackground = false;

  constructor(
      private readonly platform: ReolinkSirenAndLightHomebridgePlatform,
      private readonly accessory: PlatformAccessory,
  ) {
    this.cameraConfig = this.accessory.context.device;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Woodsnaps')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // Initialize Light Service if enabled in config
    if (this.cameraConfig.exposeLightToHomeKit) {
      this.lightService = this.accessory.getService(this.platform.Service.Lightbulb) ||
          this.accessory.addService(this.platform.Service.Lightbulb);
      this.lightService.setCharacteristic(this.platform.Characteristic.Name, `${accessory.context.device.name} Light`);

      this.lightService.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setLightOn.bind(this))
        .onGet(this.getLightStatus.bind(this));

      this.lightService.getCharacteristic(this.platform.Characteristic.Brightness)
        .onSet(this.setBrightness.bind(this));
    }

    // Initialize Siren Service if enabled in config
    if (this.cameraConfig.exposeSirenToHomeKit) {
      this.sirenService = this.accessory.getService('Siren') ||
          this.accessory.addService(this.platform.Service.Switch, 'Siren');
      this.sirenService.setCharacteristic(this.platform.Characteristic.Name, `${accessory.context.device.name} Siren`);
      this.sirenService.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setSirenOn.bind(this));
    }

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

  async setLightOn(value: CharacteristicValue) {
    const lightState = value === true ? 1 : 0;
    const brightState = (this.lightService?.getCharacteristic(this.platform.Characteristic.Brightness).value) as number || 100;

    await setWhiteLed(this.cameraConfig, lightState, brightState).catch(x => {
      this.platform.log.error(x);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    });
  }

  async getLightStatus(): Promise<CharacteristicValue> {
    if (!this.hasCalledGetLightStatusBackground) {
      this.hasCalledGetLightStatusBackground = true;
      this.getLightStatusBackground().catch(() => null).then(() => {
        this.hasCalledGetLightStatusBackground = false;
      });
    }

    return this.lastState.isOn;
  }

  async getLightStatusBackground() {
    const statusLed = await getWhiteLed(this.cameraConfig).catch(x => {
      this.platform.log.error(`Camera: ${this.cameraConfig.ip}`, x);
    });

    if (statusLed === undefined) {
      return;
    }

    this.lastState = statusLed;

    this.platform.log.debug(`StatusLed ${this.cameraConfig.ip}`, statusLed);

    if (this.lightService) {
      this.lightService
        .updateCharacteristic(this.platform.Characteristic.On, statusLed.isOn)
        .updateCharacteristic(this.platform.Characteristic.Brightness, statusLed.brightLevel);
    }
  }

  async setBrightness(value: CharacteristicValue) {
    let brightState = value as number;
    const lightState = brightState > 0 ? 1 : 0;

    if (brightState === 0) {
      brightState = 100;
    }

    await setWhiteLed(this.cameraConfig, lightState, brightState).catch(x => {
      this.platform.log.error(x);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    });
  }
}
