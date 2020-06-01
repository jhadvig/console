import * as React from 'react';
import { Helmet } from 'react-helmet';
import { ActionGroup, Button } from '@patternfly/react-core';

import { ClusterVersionModel } from '../../models';
import { K8sResourceKind } from '../../module/k8s';
import { ButtonBar, Firehose, PromiseComponent, history } from '../utils';
import { connect } from 'react-redux';
// import { IDPNameInput } from './idp-name-input';
// import { IDPCAFileInput } from './idp-cafile-input';

export class ConfigureDisconnectedForm extends PromiseComponent<ConfigureDisconnectedFormProps, ConfigureDisconnectedFormState> {

  render() {
    const { name, htpasswdFileContent } = this.state;
    const title = 'Configure Disconnected';

    return (
      <div className="co-m-pane__body">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        <form onSubmit={this.submit} name="form" className="co-m-pane__body-group co-m-pane__form">
          <h1 className="co-m-pane__heading">{title}</h1>
          <p className="co-m-pane__explanation">
            HTPasswd validates usernames and passwords against a flat file generated using the
            htpasswd command.
          </p>
          <IDPNameInput value={name} onChange={this.nameChanged} />
          <div className="form-group">
            <DroppableFileInput
              onChange={this.htpasswdFileChanged}
              inputFileData={htpasswdFileContent}
              id="htpasswd-file"
              label="HTPasswd File"
              inputFieldHelpText="Upload an HTPasswd file created using the htpasswd command."
              isRequired
              hideContents
            />
          </div>
          <ButtonBar errorMessage={this.state.errorMessage} inProgress={this.state.inProgress}>
            <ActionGroup className="pf-c-form">
              <Button type="submit" variant="primary">
                Add
              </Button>
              <Button type="button" variant="secondary" onClick={history.goBack}>
                Cancel
              </Button>
            </ActionGroup>
          </ButtonBar>
        </form>
      </div>
    );
  }
}

export type ConfigureDisconnectedFormState = {
  updateType: UpdateType;
  url: string;
};

export enum UpdateType {
  Version = 'version',
  image = 'image',
}

export type ConfigureDisconnectedFormProps = {
  obj?: { loaded: boolean; data: K8sResourceKind };
};

export const StorageClassForm = (props) => (
  <Firehose resources={[
    { kind: ClusterVersionModel.kind, name: 'version', isList: false, prop: 'obj' }
  ]}>
    <ConfigureDisconnectedForm {...props} />
  </Firehose>
);

// ConfigureDisconnectedForm.displayName = 'ConfigureDisconnectedForm';