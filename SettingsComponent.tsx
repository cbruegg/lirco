import React from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import {
  Button,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {strings} from './i18n';
import {connectLirc} from './Lirc';

export type Settings = {
  host: string;
  port: number;
};

export async function getSettings(): Promise<Settings | null> {
  try {
    const host = await AsyncStorage.getItem(keyHost);
    const port = await AsyncStorage.getItem(keyPort);
    if (host !== null && port !== null) {
      return {
        host,
        port: Number(port),
      };
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(keyHost, settings.host);
  await AsyncStorage.setItem(keyPort, settings.port.toString());
}

export type SettingsComponentProperties = {
  onBack: () => void;
  forceSave: boolean;
};

type SettingsComponentState = {
  host: string;
  port: number;
  verifySuccess: boolean | null;
  isVerifying: boolean;
};

const keyHost = 'host';
const keyPort = 'port';

export class SettingsComponent extends React.Component<
  SettingsComponentProperties,
  SettingsComponentState
> {
  constructor(props: SettingsComponentProperties) {
    super(props);
    this.state = {
      host: '',
      port: 8765,
      verifySuccess: null,
      isVerifying: false,
    };
  }

  async componentDidMount(): Promise<void> {
    const settings = await getSettings();
    if (settings !== null) {
      this.setState({
        host: settings.host,
        port: settings.port,
      });
    }
  }

  private onNewHostInput(host: string) {
    this.setState({host, verifySuccess: null});
  }

  private onNewPortInput(port: string) {
    try {
      this.setState({
        port: Number(port),
        verifySuccess: null,
      });
    } catch (e) {
      this.setState(this.state); // Undo character input
    }
  }

  private async onVerifyClick() {
    const {host, port} = this.state;
    if (host.length > 0) {
      try {
        this.setState({
          verifySuccess: null,
          isVerifying: true,
        });
        const lircClient = await connectLirc(host, port);
        try {
          await lircClient.list();
        } finally {
          try {
            lircClient.close();
          } catch (ignoredError) {}
        }
        this.setState({
          verifySuccess: true,
          isVerifying: false,
        });
      } catch (e) {
        this.setState({
          verifySuccess: false,
          isVerifying: false,
        });
      }
    } else {
      this.setState({
        verifySuccess: false,
        isVerifying: false,
      });
    }
  }
  private async onSaveClick() {
    await saveSettings({
      host: this.state.host,
      port: this.state.port,
    });
    Keyboard.dismiss();
    this.props.onBack();
  }

  private onCancelClick() {
    Keyboard.dismiss();
    this.props.onBack();
  }

  render() {
    const {verifySuccess, isVerifying} = this.state;
    let statusTextStyle: any[];
    let statusText: string;
    if (verifySuccess === null) {
      statusTextStyle = [styles.statusText];
      statusText = isVerifying ? strings('component.settings.verifying') : '';
    } else if (verifySuccess) {
      statusTextStyle = [styles.statusText, styles.statusTextSuccess];
      statusText = strings('component.settings.verifySuccess');
    } else {
      statusTextStyle = [styles.statusText, styles.statusTextFail];
      statusText = strings('component.settings.verifyFail');
    }
    return (
      <>
        <Text style={styles.titleText}>
          {strings('component.settings.settings')}
        </Text>
        <Text style={styles.hintText}>
          {strings('component.settings.host')}
        </Text>
        <TextInput
          style={styles.textInput}
          autoCompleteType="off"
          autoCapitalize="none"
          value={this.state.host}
          editable={!isVerifying}
          onChangeText={host => this.onNewHostInput(host)}
        />
        <Text style={styles.hintText}>
          {strings('component.settings.port')}
        </Text>
        <TextInput
          style={styles.textInput}
          autoCompleteType="off"
          autoCapitalize="none"
          editable={!isVerifying}
          value={this.state.port.toString()}
          onChangeText={port => this.onNewPortInput(port)}
        />
        <View style={styles.button}>
          <Button
            title={strings('component.settings.verify')}
            onPress={() => this.onVerifyClick()}
            disabled={isVerifying}
          />
        </View>
        <Text style={statusTextStyle}>{statusText}</Text>
        <View style={styles.buttonContainer}>
          <View style={[styles.button, styles.buttonContainerButton]}>
            <Button
              title={strings('component.settings.cancel')}
              disabled={this.props.forceSave || isVerifying}
              onPress={() => this.onCancelClick()}
            />
          </View>
          <View style={[styles.button, styles.buttonContainerButton]}>
            <Button
              title={strings('component.settings.save')}
              onPress={() => this.onSaveClick()}
              disabled={isVerifying}
            />
          </View>
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  titleText: {
    fontSize: 30,
    margin: 10,
  },
  hintText: {
    fontSize: 18,
    marginHorizontal: 10,
  },
  textInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginHorizontal: 10,
  },
  button: {
    marginHorizontal: 10,
    marginTop: 10,
  },
  statusText: {
    flex: 1,
    alignSelf: 'center',
    marginTop: 10,
  },
  statusTextSuccess: {
    color: 'green',
  },
  statusTextFail: {
    color: 'red',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  buttonContainerButton: {
    flex: 1,
  },
});
