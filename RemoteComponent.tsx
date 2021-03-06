import {ButtonId, LircClient, RemoteId} from './Lirc';
import React from 'react';
import {
  Button,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {strings} from './i18n';
import Spinner from 'react-native-spinkit';
import SimpleToast from 'react-native-simple-toast';

export type RemoteComponentProps = {
  remoteId: RemoteId;
  lirc: LircClient;
  onBack: () => void;
};

type RemoteComponentState = {
  loadingState: LoadingState;
  buttonIds: ButtonId[];
};

enum LoadingState {
  Loading = 'Loading',
  Success = 'Success',
  Failed = 'Failed',
}

const holdRepeats = 10;

export class RemoteComponent extends React.Component<
  RemoteComponentProps,
  RemoteComponentState
> {
  private holding: boolean = false;

  constructor(props: RemoteComponentProps) {
    super(props);
    this.state = {
      loadingState: LoadingState.Loading,
      buttonIds: [],
    };
  }

  async componentDidMount(): Promise<void> {
    await this.reload();
  }

  private async reload() {
    this.setState({
      loadingState: LoadingState.Loading,
      buttonIds: [],
    });
    try {
      const buttonIds = await this.props.lirc.listButtons(this.props.remoteId);
      this.setState({
        buttonIds: buttonIds,
        loadingState: LoadingState.Success,
      });
    } catch (e) {
      console.log(
        `Failed to load buttons for ${this.props.remoteId}, error ${e}`,
      );
      this.setState({
        buttonIds: [],
        loadingState: LoadingState.Failed,
      });
    }
  }

  private async invokeButton(buttonId: ButtonId) {
    try {
      await this.props.lirc.sendOnce(this.props.remoteId, buttonId);
    } catch (e) {
      console.log(`Failed to invoke button ${buttonId}, error ${e}`);
      SimpleToast.show(strings('component.remote.buttonInvokeFailed'));
    }
  }

  private async startHold(buttonId: ButtonId) {
    this.holding = true;
    while (this.holding) {
      try {
        await this.props.lirc.sendOnce(
          this.props.remoteId,
          buttonId,
          holdRepeats,
        );
      } catch (e) {
        console.log(`Failed to repeatedly send button ${buttonId}, error ${e}`);
      }
    }
  }

  private async stopHold() {
    this.holding = false;
  }

  render() {
    const buttonIds = this.state.buttonIds;

    let body: any;
    switch (this.state.loadingState) {
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
            numColumns={2}
            data={buttonIds}
            renderItem={({item}) => (
              <View style={styles.remoteButtonContainer}>
                <TouchableOpacity
                  onLongPress={() => this.startHold(item)}
                  onPressOut={() => this.stopHold()}
                  onPress={() => this.invokeButton(item)}>
                  <Text style={styles.remoteButton}>{'\n' + item + '\n'}</Text>
                </TouchableOpacity>
              </View>
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
        <Text style={styles.titleText}>{this.props.remoteId}</Text>
        <View style={styles.body}>{body}</View>
        <View style={styles.backButton}>
          <Button title={strings('general.back')} onPress={this.props.onBack} />
        </View>
      </>
    );
  }
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  titleText: {
    fontSize: 30,
    margin: 10,
  },
  remoteButtonContainer: {
    margin: 5,
    flex: 1,
    flexDirection: 'column',
  },
  remoteButton: {
    backgroundColor: 'rgb(29,202,246)',
    color: 'white',
    textAlign: 'center',
  },
  backButton: {
    justifyContent: 'flex-end',
    marginBottom: 5,
    marginStart: 5,
    marginEnd: 5,
  },
  progress: {
    flex: 1,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  errorText: {
    margin: 10,
    fontSize: 18,
  },
  button: {
    margin: 5,
  },
});
