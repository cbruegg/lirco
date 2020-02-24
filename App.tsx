/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import {Button, SafeAreaView, StatusBar, StyleSheet, View} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import {connectLirc, LircClient, RemoteId} from './Lirc';
import {RemoteListComponent} from './RemoteListComponent';
import React from 'react';
import {Text} from 'react-native';
import {RemoteComponent} from './RemoteComponent';
import {strings} from './i18n';
import {getSettings, Settings, SettingsComponent} from './SettingsComponent';

type AppProperties = {};

type AppState = {
  lirc: LircClient | null;
  lircState: LircState;
  selectedRemoteId: RemoteId | null;
  settings: Settings | null;
  inSettings: boolean;
};

enum LircState {
  Loading = 'Loading',
  Failed = 'Failed',
  Loaded = 'Loaded',
}

class App extends React.Component<AppProperties, AppState> {
  constructor(props: AppProperties) {
    super(props);
    this.state = {
      lirc: null,
      lircState: LircState.Loading,
      selectedRemoteId: null,
      settings: null,
      inSettings: false,
    };
  }

  async componentDidMount(): Promise<void> {
    this.setState({
      settings: await getSettings(),
    });
    await this.reload();
  }

  private async reload() {
    const settings = this.state.settings;
    if (settings !== null) {
      try {
        const lirc = await connectLirc(settings.host, settings.port);
        this.setState({
          lirc: lirc,
          lircState: LircState.Loaded,
        });
      } catch (e) {
        console.log(`Error while fetching remotes: ${e}`);
        this.setState({
          lirc: null,
          lircState: LircState.Failed,
        });
      }
    } else {
      this.setState({
        settings: null,
        inSettings: true,
      });
    }
  }

  private async leaveSettings() {
    this.setState({
      settings: await getSettings(),
      inSettings: false,
    });
    await this.reload();
  }

  private onSettingsClick() {
    this.setState({
      inSettings: true,
    });
  }

  private async onRetryClick() {
    await this.reload();
  }

  render() {
    const {
      lirc,
      lircState,
      selectedRemoteId,
      settings,
      inSettings,
    } = this.state;
    let body: any;
    if (inSettings) {
      body = (
        <SettingsComponent
          forceSave={settings == null}
          onBack={() => this.leaveSettings()}
        />
      );
    } else if (lircState === LircState.Failed || lirc == null) {
      body = (
        <>
          <Text>{strings('general.connectionFailed')}</Text>
          <View>
            <Button
              title={strings('general.retry')}
              onPress={() => this.onRetryClick()}
            />
          </View>
        </>
      );
    } else if (lircState === LircState.Loading) {
      body = (
        <>
          <Text>{strings('general.connecting')}</Text>
          <View>
            <Button
              title={strings('general.retry')}
              onPress={() => this.onRetryClick()}
            />
          </View>
        </>
      );
    } else if (selectedRemoteId === null) {
      const clickListener = (remoteId: RemoteId) => {
        this.setState({
          selectedRemoteId: remoteId,
        });
      };
      body = (
        <>
          <RemoteListComponent lirc={lirc} clickListener={clickListener} />
          <View style={styles.button}>
            <Button
              title={strings('component.settings.settings')}
              onPress={() => this.onSettingsClick()}
            />
          </View>
        </>
      );
    } else {
      const deselectRemote = () =>
        this.setState({
          selectedRemoteId: null,
        });
      body = (
        <RemoteComponent
          lirc={lirc}
          remoteId={selectedRemoteId}
          onBack={deselectRemote}
        />
      );
    }

    return (
      <>
        <Text style={styles.title}>{strings('general.title')}</Text>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.body}>{body}</SafeAreaView>
      </>
    );
  }
}
const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: 'white',
    backgroundColor: 'rgb(29,202,246)',
    padding: 10,
  },
  button: {
    margin: 10,
  },
});
export default App;
