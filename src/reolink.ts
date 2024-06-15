const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type CameraConfig = {
  ip: string;
  user: string;
  password: string;
};

enum Command {
  Login = 'Login',
  AudioAlarmPlay = 'AudioAlarmPlay'
}

const tokens: Map<string, string> = new Map();

const apiRequest = async (config: CameraConfig, cmd: Command, data: object): Promise<any> => {
  const currentToken = tokens.get(config.ip);
  // @ts-expect-error aaq
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

  await sleep(1000);
};

const sirenToggle = async (config: CameraConfig, start: boolean) => {
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

  return apiRequest(config, Command.AudioAlarmPlay, data);
};

export {
  CameraConfig, Command, apiRequest, login, sirenToggle,
};
