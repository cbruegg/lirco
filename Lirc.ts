import TcpSocketLib, {TcpSocket} from 'react-native-tcp-socket';
import {sleep} from './utils';
import {types} from 'util';
import {Mutex} from 'async-mutex';

export enum ErrorCode {
  CommandTimeout = 'CommandTimeout',
  TcpError = 'TcpError',
  InvalidData = 'InvalidData',
  CommandResultMismatch = 'CommandResultMismatch',
  NoSuccess = 'NoSuccess',
  CountMismatch = 'CountMismatch',
}

const timeoutMs = 10000;

export async function connectLirc(
  host: string,
  port: number,
): Promise<LircClient> {
  return new RobustLircClient(async () => {
    try {
      const tcpClient = await connectTcp(host, port);
      return new LircClientImpl(tcpClient);
    } catch (e) {
      if (e.message === TcpError.Generic) {
        throw new Error(ErrorCode.TcpError);
      } else {
        throw e;
      }
    }
  });
}

enum TcpError {
  Generic = 'Generic',
}

function connectTcp(host: string, port: number): Promise<TcpSocket> {
  return new Promise<TcpSocket>(async (resolve, reject) => {
    let client: TcpSocket;
    client = TcpSocketLib.createConnection(
      {
        host: host,
        port: port,
        timeout: timeoutMs,
      },
      address => {
        if (address !== undefined && address !== null && client !== undefined) {
          resolve(client);
        } else {
          reject(new Error(TcpError.Generic));
        }
      },
    );
    client.on('error', _ => {
      reject(new Error(TcpError.Generic));
    });
    await sleep(timeoutMs);
    if (typeof client.address() !== 'string') {
      reject(new Error(TcpError.Generic));
    }
  });
}

export type RemoteId = string;
export type ButtonId = string;
export interface LircClient {
  list(): Promise<RemoteId[]>;
  listButtons(remoteId: RemoteId): Promise<ButtonId[]>;
  sendOnce(
    remoteId: RemoteId,
    buttonId: ButtonId,
    repeats?: number,
  ): Promise<void>;
  sendStart(remoteId: RemoteId, buttonId: ButtonId): Promise<void>;
  sendStop(remoteId: RemoteId, buttonId: ButtonId): Promise<void>;
  close(): void;
}

/**
Parses output like
BEGIN
LIST               <-- The command
SUCCESS            <-- The status (SUCCESS / ERROR)
DATA               <-- Begin of optional part
1                  <-- Number of data lines
teufel_ce_500_rc   <-- First data line, end of optional part
END
 */
const commandRegex = /BEGIN\n(?<command>.*?)\n(?<status>SUCCESS|ERROR)\n(DATA\n(?<count>[0-9]+)\n(?<data>(.*\n|.*)*?)\n)?END/m;

class RobustLircClient implements LircClient {
  private readonly clientFactory: () => Promise<LircClient>;
  private readonly mutex: Mutex = new Mutex();
  private currentClient: LircClient | null = null;

  constructor(clientFactory: () => Promise<LircClient>) {
    this.clientFactory = clientFactory;
  }

  private async obtainClient(): Promise<LircClient> {
    return await this.mutex.runExclusive(async () => {
      if (this.currentClient == null) {
        this.currentClient = await this.clientFactory();
      }

      return this.currentClient;
    });
  }

  close() {
    this.killCurrentClient();
  }

  private killCurrentClient(): void {
    try {
      this.currentClient?.close();
    } catch (ignoredError) {
    }
    this.currentClient = null;
  }

  private async retried<T>(
    f: () => Promise<T>,
    maxRetries: number = 7,
    startDelayMs: number = 100,
  ): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await f();
      } catch (e) {
        console.log("Caught exception, retrying!");
        if (e.message === ErrorCode.CommandTimeout || e.message === ErrorCode.TcpError) {
          this.killCurrentClient();
        }

        lastErr = e;
        await sleep(startDelayMs);
        startDelayMs *= 2;
      }
    }
    throw lastErr;
  }

  async list(): Promise<RemoteId[]> {
    return await this.retried(async () => {
      return (await this.obtainClient()).list();
    });
  }

  async listButtons(remoteId: string): Promise<ButtonId[]> {
    return await this.retried(async () => {
      return (await this.obtainClient()).listButtons(remoteId);
    });
  }

  async sendOnce(
    remoteId: string,
    buttonId: string,
    repeats?: number,
  ): Promise<void> {
    return await this.retried(async () => {
      return (await this.obtainClient()).sendOnce(remoteId, buttonId, repeats);
    });
  }

  async sendStart(remoteId: string, buttonId: string): Promise<void> {
    return await this.retried(async () => {
      return (await this.obtainClient()).sendStart(remoteId, buttonId);
    });
  }

  async sendStop(remoteId: string, buttonId: string): Promise<void> {
    return await this.retried(async () => {
      return (await this.obtainClient()).sendStop(remoteId, buttonId);
    });
  }
}

class LircClientImpl implements LircClient {
  private tcpClient: TcpSocket;
  private mutex = new Mutex();
  constructor(tcpClient: TcpSocket) {
    this.tcpClient = tcpClient;
  }

  close() {
    this.tcpClient.destroy();
  }

  async list(): Promise<RemoteId[]> {
    return (await this.execute('LIST')) as string[];
  }

  async listButtons(remoteId: string): Promise<ButtonId[]> {
    const lines = (await this.execute(`LIST ${remoteId}`)) as string[];
    return lines.map(line => {
      const splitLine = line.split(' ');
      if (splitLine.length < 2) {
        throw new Error(ErrorCode.InvalidData);
      }
      return splitLine[1];
    });
  }

  async sendStart(remoteId: string, buttonId: string): Promise<void> {
    await this.execute(`SEND_START ${remoteId} ${buttonId}`);
  }

  async sendStop(remoteId: string, buttonId: string): Promise<void> {
    await this.execute(`SEND_STOP ${remoteId} ${buttonId}`);
  }

  async sendOnce(
    remoteId: string,
    buttonId: string,
    repeats: number = 1,
  ): Promise<void> {
    await this.execute(`SEND_ONCE ${remoteId} ${buttonId} ${repeats}`);
  }

  private async execute(requestedCommand: string): Promise<string[] | void> {
    console.log(`Executing '${requestedCommand}'`);
    const result = await this.send(requestedCommand);
    console.log(`Got answer '${result}'`);
    const regexResult = commandRegex.exec(result);
    console.log('Parsed answer!');
    if (regexResult !== null && regexResult.groups !== undefined) {
      const {command, status, count, data} = regexResult.groups;
      if (command !== requestedCommand) {
        throw new Error(ErrorCode.CommandResultMismatch);
      }
      if (status !== 'SUCCESS') {
        throw new Error(ErrorCode.NoSuccess);
      }

      if (data === undefined) {
        return;
      } else {
        const lines = data.split('\n');
        if (lines.length !== Number(count)) {
          throw new Error(ErrorCode.CountMismatch);
        }

        return lines;
      }
    } else {
      throw new Error(ErrorCode.InvalidData);
    }
  }

  private send(command: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const release = await this.mutex.acquire();
      try {
        this.tcpClient.on('error', _ => {
          reject(new Error(ErrorCode.TcpError));
        });

        let result = '';
        let receivedInvalidData = false;
        this.tcpClient.on('data', data => {
          if (!types.isUint8Array(data)) {
            receivedInvalidData = true;
            reject(new Error(ErrorCode.InvalidData));
            return;
          } else if (receivedInvalidData) {
            return;
          }

          const dataStr = data.toString();
          if (result.length !== 0 || dataStr.startsWith('BEGIN')) {
            result += dataStr;
          }

          const trimmedResult = result.trim();
          if (
            trimmedResult.startsWith('BEGIN') &&
            trimmedResult.endsWith('END')
          ) {
            resolve(trimmedResult);
            release();
          }
        });

        try {
          this.tcpClient.write(command + '\n', 'utf-8');
        } catch (e) {
          reject(new Error(ErrorCode.TcpError));
        }
        await sleep(timeoutMs);
        console.log("Rejecting due to timeout!");
        reject(new Error(ErrorCode.CommandTimeout));
      } finally {
        release();
      }
    });
  }
}
