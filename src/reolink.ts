const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type CameraConfig = {
  ip: string;
  user: string;
  password: string;
  exposeLightToHomeKit: boolean;
  exposeSirenToHomeKit: boolean;
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

interface ApiResponse {
  code?: number;
  error?: {
    detail: string;
  };
  value?: {
    Token?: {
      name: string;
    };
    WhiteLed?: {
      state: number;
      bright: number;
    };
    // Add other fields based on your API response structure
  };
}

const apiRequest = async (config: CameraConfig, cmd: Command, data: object): Promise<ApiResponse[]> => {
  const currentToken = tokens.get(config.ip);
  const response = await fetch(`http://${config.ip}/cgi-bin/api.cgi?cmd=${cmd}${currentToken ? `&token=${currentToken}` : ''}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([data]),
  });

  const jsonResponse: ApiResponse[] = await response.json();

  if (jsonResponse[0]?.code === 1 && jsonResponse[0]?.error?.detail === 'please login first') {
    await login(config);
    return apiRequest(config, cmd, data);
  }

  return jsonResponse;
};

const login = async (config: CameraConfig): Promise<void> => {
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

  await sleep(1000);
};

const getWhiteLed = async (config: CameraConfig): Promise<LightState | undefined> => {
  const data = {
    cmd: Command.GetWhiteLed,
    action: 0,
    param: {
      channel: 0,
    },
  } as const;

  const result = await apiRequest(config, Command.GetWhiteLed, data);

  if (result && result[0]?.value && 'WhiteLed' in result[0].value) {
    const value = result[0].value as { WhiteLed: { state: number; bright: number } };
    return {
      isOn: value.WhiteLed.state !== 0,
      brightLevel: value.WhiteLed.bright,
    };
  } else {
    return undefined;
  }
};

const setWhiteLed = async (config: CameraConfig, state: number, bright: number): Promise<void> => {
  const data = {
    cmd: Command.SetWhiteLed,
    param: {
      WhiteLed: {
        state,
        channel: 0,
        mode: state === 1 ? 3 : 1,
        bright,
        LightingSchedule: {
          EndHour: 8,
          EndMin: 58,
          StartHour: 9,
          StartMin: 0,
        },
      },
    },
  } as const;

  await apiRequest(config, Command.SetWhiteLed, data);
};

const sirenToggle = async (config: CameraConfig, start: boolean): Promise<void> => {
  const data = {
    cmd: Command.AudioAlarmPlay,
    action: 0,
    param: {
      alarm_mode: 'manul',
      manual_switch: start ? 1 : 0,
      times: 1,
      channel: 0,
    },
  } as const;

  await apiRequest(config, Command.AudioAlarmPlay, data);
};

export {
  CameraConfig, LightState, Command, apiRequest, login, getWhiteLed, setWhiteLed, sirenToggle,
};
