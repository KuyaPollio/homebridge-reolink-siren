import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ReolinkSirenAndLightAccessory } from './platformAccessory';
import { CameraConfig } from './reolink';

export class ReolinkSirenAndLightHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];
  private uuids: string[] = [];

  constructor(
      public readonly log: Logger,
      public readonly config: PlatformConfig,
      public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // Validate that the config is properly formatted
    if (!this.config || !this.config.cameras || !Array.isArray(this.config.cameras)) {
      this.log.error('Invalid configuration: "cameras" is missing or not an array.');
      return;
    }

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    for (const device of this.config.cameras) {
      // Create a more unique identifier using both IP and name
      const uniqueIdentifier = `${device.ip}-${device.name}`;
      const uuid = this.api.hap.uuid.generate(uniqueIdentifier);
      this.uuids.push(uuid);

      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new ReolinkSirenAndLightAccessory(this, existingAccessory);
      } else {
        this.log.info('Adding new accessory:', device.name);

        // Ensure displayName is set to a non-empty string
        const displayName = device.name || 'Unnamed Accessory';

        const accessory = new this.api.platformAccessory(displayName, uuid);
        accessory.context.device = device as CameraConfig;

        new ReolinkSirenAndLightAccessory(this, accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }

    // Remove orphaned accessories not found in current config
    for (const deviceOrphan of this.accessories.filter(x => !this.uuids.includes(x.UUID))) {
      this.log.info('Removing orphan accessory:', deviceOrphan.displayName);
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [deviceOrphan]);
    }
  }
}
