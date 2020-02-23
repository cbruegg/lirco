import {LircClient, RemoteId} from './Lirc';
import React from 'react';
import {Button, FlatList, StyleSheet, Text, View} from 'react-native';
import {strings} from './i18n';

import Spinner from 'react-native-spinkit';

export type RemoteListComponentProperties = {
  lirc: LircClient;
  clickListener?: (remoteId: RemoteId) => void;
};
type RemoteListComponentState = {
  remoteIds: RemoteId[];
  loadingState: LoadingState;
};

enum LoadingState {
  Loading = 'Loading',
  Success = 'Success',
  Failed = 'Failed',
}

export class RemoteListComponent extends React.Component<
  RemoteListComponentProperties,
  RemoteListComponentState
> {
  constructor(props: RemoteListComponentProperties) {
    super(props);
    this.state = {
      remoteIds: [],
      loadingState: LoadingState.Loading,
    };
  }

  async componentDidMount(): Promise<void> {
    await this.reload();
  }

  private async reload() {
    this.setState({
      remoteIds: [],
      loadingState: LoadingState.Loading,
    });
    try {
      const remoteIds = await this.props.lirc.list();
      this.setState({
        remoteIds: remoteIds,
        loadingState: LoadingState.Success,
      });
    } catch (e) {
      console.log(`Failed to load remotes, error ${e}`);
      this.setState({
        remoteIds: [],
        loadingState: LoadingState.Failed,
      });
    }
  }

  render() {
    console.log('Rendering!');
    const remoteIds = this.state.remoteIds || [];
    const loadingState = this.state.loadingState;
    const clickListener = this.props.clickListener || (_ => {});

    let body: any;
    switch (loadingState) {
      case LoadingState.Loading:
        body = (
          <View style={styles.progress}>
            <Spinner type="Bounce" />
          </View>
        );
        break;
      case LoadingState.Success:
        body = (
          <FlatList
            style={styles.remoteList}
            data={remoteIds}
            renderItem={({item}) => (
              <Button title={item} onPress={() => clickListener(item)} />
            )}
            keyExtractor={item => item}
          />
        );
        break;
      case LoadingState.Failed:
        body = (
          <>
            <Text style={styles.errorText}>
              {strings('general.loadingFailed')}
            </Text>
            <View style={styles.button}>
              <Button
                title={strings('general.retry')}
                onPress={() => this.reload()}
              />
            </View>
          </>
        );
        break;
    }

    return (
      <>
        <Text style={styles.titleText}>
          {strings('component.remoteList.remotes')}
        </Text>
        {body}
      </>
    );
  }
}

const styles = StyleSheet.create({
  titleText: {
    fontSize: 30,
    margin: 10,
  },
  progress: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  remoteList: {
    flex: 1,
    margin: 5,
  },
  button: {
    margin: 5,
  },
  errorText: {
    margin: 10,
    fontSize: 18,
  },
});
