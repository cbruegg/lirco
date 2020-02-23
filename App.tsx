/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import {SafeAreaView, StatusBar, StyleSheet} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';
import {connectLirc, LircClient, RemoteId} from './Lirc';
import {RemoteListComponent} from './RemoteListComponent';
import React from 'react';
import {Text} from 'react-native';
import {RemoteComponent} from './RemoteComponent';
import {strings} from './i18n';

type AppProperties = {};

type AppState = {
  lirc: LircClient | null;
  lircState: LircState;
  selectedRemoteId: RemoteId | null;
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
    };
  }

  async componentDidMount(): Promise<void> {
    try {
      const lirc = await connectLirc('192.168.86.25', 8765);
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
  }

  render() {
    const {lirc, lircState, selectedRemoteId} = this.state;
    let body: any;
    if (selectedRemoteId === null) {
      const clickListener = (remoteId: RemoteId) => {
        this.setState({
          selectedRemoteId: remoteId,
        });
      };
      body = (
        <>
          {lirc !== null && (
            <RemoteListComponent lirc={lirc} clickListener={clickListener} />
          )}
          {lircState !== LircState.Loaded && (
            <Text>{lircState.toString()}</Text>
          )}
        </>
      );
    } else {
      const deselectRemote = () =>
        this.setState({
          selectedRemoteId: null,
        });
      body = (
        <RemoteComponent
          lirc={lirc!}
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
});
export default App;
