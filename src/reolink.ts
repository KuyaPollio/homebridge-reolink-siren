import { log } from 'console';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type CameraConfig = {
  ip: string;
  user: string;
  password: string;
  exposeLightToHomeKit: boolean;
  exposeSirenToHomeKit: boolean;
  channel: number;
  time: number;
};

type LightState = {
  isOn: boolean;
  brightLevel: number;
};

enum Command {
  Login = 'Login',
  GetWhiteLed = 'GetWhiteLed',
  SetWhiteLed = 'SetWhiteLed',
  AudioAlarmPlay = 'AudioAlarmPlay'
}

const tokens: Map<string, string> = new Map();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apiRequest = async (config: CameraConfig, cmd: Command, data: object): Promise<any> => {
  const currentToken = tokens.get(config.ip);
  const response = await fetch(`http://${config.ip}/cgi-bin/api.cgi?cmd=${cmd}${currentToken ? `&token=${currentToken}` : ''}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([data]),
  });

  const jsonResponse = await response.json() as any;

  if (jsonResponse[0]?.code === 1 && jsonResponse[0]?.error?.detail === 'please login first') {
    await login(config);
    return apiRequest(config, cmd, data);
  }

  return jsonResponse;
};

const login = async (config: CameraConfig) => {
  const data = {
    cmd: Command.Login,
    param: {
      User: {
        Version: '0',
        userName: config.user,
        password: config.password,
      },
    },
  } as const;
  const response = await apiRequest(config, Command.Login, data);
  const newToken = response[0]?.value?.Token?.name || null;
  if (newToken) {
    tokens.set(config.ip, newToken);
  }
};

const getWhiteLed = async (config: CameraConfig): Promise<LightState> => {
  const data = {
    cmd: Command.GetWhiteLed,
    action: 0,
    param: {
      channel: config.channel,
    },
  } as const;

  const result = await apiRequest(config, Command.GetWhiteLed, data);

  return { isOn: result[0].value.WhiteLed.state !== 0, brightLevel: result[0].value.WhiteLed.bright };
};

const setWhiteLed = async (config: CameraConfig, state: number, bright: number) => {
  // There is not way to turn on without a mode like manual mode, so we have to set to timer with one minute to turn off
  const data = {
    cmd: Command.SetWhiteLed,
    param: {
      WhiteLed: {
        state,
        channel: config.channel,
        mode: state === 1 ? 3 : 1,
        bright: bright,
        LightingSchedule: {
          EndHour: 23,
          EndMin: 59,
          StartHour: 0,
          StartMin: 0,
        },
        wlAiDetectType: {
          dog_cat: state === 1 ? 1 : 0,
          face: state === 1 ? 1 : 0,
          people: 1,
          vehicle: 1,
        },
      },
    },
  } as const;

  return apiRequest(config, Command.SetWhiteLed, data);
};

const sirenToggle = async (config: CameraConfig, start: boolean) => {
  const data = {
    cmd: Command.AudioAlarmPlay,
    action: 0,
    param: {
      alarm_mode: 'manul',
      manual_switch: start ? 1 : 0,
      times: config.time,
      channel: config.channel,
    },
  } as const;
  log('sirenToggle', data);
  return apiRequest(config, Command.AudioAlarmPlay, data);
};

export {
  CameraConfig, LightState, Command, getWhiteLed, apiRequest, login, setWhiteLed, sirenToggle,
};