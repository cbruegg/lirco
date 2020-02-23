declare module 'react-native-tcp-socket' {
  import {EmitterSubscription, NativeEventEmitter} from 'react-native';

  const tcpSockets: TCPSockets;
  export default tcpSockets;

  type Options = {
    host: string;
    port: number;
    timeout: number;
  };

  type ServerOptions = {
    host: string;
    port: number;
    timeout: number;
  };

  type Address = {
    port: number;
    address: string;
  };

  class RemovableListener {
    /**
     * @param {import("react-native").EmitterSubscription} listener
     * @param {import("react-native").NativeEventEmitter} eventEmitter
     */
    constructor(
      listener: EmitterSubscription,
      eventEmitter: NativeEventEmitter,
    );

    isRemoved(): boolean;

    remove(): void;
  }

  class TCPSockets {
    constructor();

    /**
     * @param {(socket: Socket) => void} connectionListener
     */
    createServer(connectionListener: (socket: TcpSocket) => void): TcpServer;

    /**
     * @param {{ host: string; port: number; timeout: number; }} options
     * @param {(address: string) => void} callback
     */
    createConnection(
      options: Options,
      callback?: (address: Address) => void,
    ): TcpSocket;
  }

  export class TcpServer {
    /**
     * @param {number} id
     * @param {import("react-native").NativeEventEmitter} eventEmitter
     * @param {(socket: TcpSocket) => void} connectionCallback
     */
    constructor(
      id: number,
      eventEmitter: NativeEventEmitter,
      connectionCallback: (socket: TcpSocket) => void,
    );

    close(): void;

    /**
     * @param {(arg0: number) => void} callback
     */
    getConnections(callback: (numberOfConnections: number) => void): void;

    /**
     * @param {{ port: number; host: any; }} options
     * @param {(arg0: any) => void} callback
     */
    listen(options: ServerOptions, callback: (address: String) => void): void;
  }

  export class TcpSocket {
    /**
     * Initialices a TcpSocket.
     *
     * @param {number} id
     * @param {import('react-native').NativeEventEmitter} eventEmitter
     */
    constructor(id: number, eventEmitter: NativeEventEmitter);

    /**
     * Adds a listener to be invoked when events of the specified type are emitted by the `TcpSocket`.
     * An optional calling `context` may be provided.
     * The data arguments emitted will be passed to the listener callback.
     *
     * @param {string} event  Name of the event to listen to
     * @param {function(object): void} callback Function to invoke when the specified event is emitted
     * @param {any} [context] Optional context object to use when invoking the listener
     */
    on(
      event: string,
      callback: (event?: object) => void,
      context?: any,
    ): RemovableListener;

    off(): void;

    /**
     * @param {{ host: string; port: number; timeout: number; }} options
     * @param {(address: string) => void} [callback]
     */
    connect(options: Options, callback: (address: string) => void): TcpSocket;

    /**
     * @param {number} msecs
     * @param {{ (...args: any[]): any; (...args: any[]): any; }} [callback]
     */
    setTimeout(msecs: number, callback: (...args: any[]) => any): TcpSocket;

    address(): string | null | undefined;

    /**
     * @param {string | Buffer | Uint8Array} data
     * @param {BufferEncoding} [encoding]
     */
    end(data: string | Buffer | Uint8Array, encoding: BufferEncoding): void;

    destroy(): void;

    /**
     * Sends data on the socket. The second parameter specifies the encoding in the case of a string — it defaults to UTF8 encoding.
     *
     * The optional callback parameter will be executed when the data is finally written out, which may not be immediately.
     *
     * @param {string | Buffer | Uint8Array} buffer
     * @param {BufferEncoding} [encoding]
     * @param {(error?: string) => void} [callback]
     */
    write(
      buffer: string | Buffer | Uint8Array,
      encoding?: BufferEncoding,
      callback?: (...args: any[]) => any,
    ): void;

    /**
     * @param {string} address
     */
    setConnected(address: string): void;

    setDisconnected(): void;
  }
}
