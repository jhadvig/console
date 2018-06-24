import * as _ from 'lodash-es';
import * as React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

import { k8sCreate, k8sUpdate, K8sResourceKind } from '../../module/k8s';
import { ButtonBar, Firehose, history, kindObj, StatusBox, DropableFileInput } from '../utils';
import { formatNamespacedRouteForResource } from '../../ui/ui-actions';
import { WebHookSecretKey } from '../secret';

enum SecretTypeAbstraction {
  generic = 'generic',
  source = 'source',
  webhook = 'webhook',
}

export enum SecretType {
  basicAuth = 'kubernetes.io/basic-auth',
  sshAuth = 'kubernetes.io/ssh-auth',
  opaque = 'Opaque'
}

const determineDefaultSecretType = (typeAbstraction) => {
  if (typeAbstraction === 'source'){
    return SecretType.basicAuth;
  }
  return SecretType.opaque;
};

const determineSecretTypeAbstraction = (data) => {
  return _.has(data, WebHookSecretKey) ? SecretTypeAbstraction.webhook : SecretTypeAbstraction.source;
};

const generateSecret = () => {
  // http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + s4() + s4();
};

// secretForm returns SubformComponent which is a Higher Order Component for all the types of secret forms.
const secretForm = (SubformComponent) => class SecretFormComponent extends React.Component<BaseEditSecretProps_, BaseEditSecretState_> {
  constructor (props) {
    super(props);
    const inputObj = _.get(props.obj, 'data');
    const existingSecret = _.pick(inputObj, ['metadata', 'type']);
    const defaultSecretType = determineDefaultSecretType(this.props.secretTypeAbstraction);
    const secret = _.defaultsDeep({}, props.fixed, existingSecret, {
      apiVersion: 'v1',
      data: {},
      kind: 'Secret',
      metadata: {
        name: '',
      },
      type: defaultSecretType,
    });

    this.state = {
      secretTypeAbstraction: this.props.secretTypeAbstraction,
      secret: secret,
      inProgress: false,
      type: defaultSecretType,
      stringData: _.mapValues(_.get(inputObj, 'data'), window.atob),
    };
    this.onDataChanged = this.onDataChanged.bind(this);
    this.onNameChanged = this.onNameChanged.bind(this);
    this.save = this.save.bind(this);
  }
  onDataChanged (secretsData) {
    this.setState({
      stringData: {...secretsData.stringData},
      type: secretsData.authenticationType,
    });
  }
  onNameChanged (event) {
    let secret = {...this.state.secret};
    secret.metadata.name = event.target.value;
    this.setState({secret});
  }
  save (e) {
    e.preventDefault();
    const { kind, metadata } = this.state.secret;
    this.setState({ inProgress: true });

    const newSecret = _.assign({}, this.state.secret, {stringData: this.state.stringData}, {type: this.state.type});
    const ko = kindObj(kind);
    (this.props.isCreate
      ? k8sCreate(ko, newSecret)
      : k8sUpdate(ko, newSecret, metadata.namespace, newSecret.metadata.name)
    ).then(() => {
      this.setState({inProgress: false});
      history.push(formatNamespacedRouteForResource('secrets'));
    }, err => this.setState({error: err.message, inProgress: false}));
  }
  render () {
    const title = `${this.props.titleVerb} ${_.upperFirst(this.state.secretTypeAbstraction)} Secret`;
    const { saveButtonText } = this.props;

    const explanation = this.state.secretTypeAbstraction === 'source'
      ? 'Source secrets allow you to authenticate against the SCM server.'
      : 'Webhook secrets allow you to authenticate a webhook trigger.';

    return <div className="co-m-pane__body">
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <form className="co-m-pane__body-group create-secret-form" onSubmit={this.save}>
        <h1 className="co-m-pane__heading">{title}</h1>
        <p className="co-m-pane__explanation">{explanation}</p>

        <fieldset disabled={!this.props.isCreate}>
          <div className="form-group">
            <label className="control-label">Secret Name</label>
            <div>
              <input className="form-control" type="text" onChange={this.onNameChanged} value={this.state.secret.metadata.name} required id="test--subject-name" />
              <p className="help-block">Unique name of the new secret.</p>
            </div>
          </div>
        </fieldset>
        <SubformComponent onChange={this.onDataChanged.bind(this)} stringData={this.state.stringData} secretType={this.state.secret.type} isCreate={this.props.isCreate} />
        <ButtonBar errorMessage={this.state.error} inProgress={this.state.inProgress} >
          <button type="submit" className="btn btn-primary" id="create-secret">{saveButtonText || 'Create'}</button>
          <Link to={formatNamespacedRouteForResource('secrets')} className="btn btn-default">Cancel</Link>
        </ButtonBar>
      </form>
    </div>;
  }
}

class WebHookSecretSubform extends React.Component<WebHookSecretSubformProps, WebHookSecretSubformState> {
  constructor(props) {
    super(props);
    this.state = {
      stringData: {WebHookSecretKey: this.props.stringData.WebHookSecretKey || ''}
    };
    this.changeWebHookSecretkey = this.changeWebHookSecretkey.bind(this);
    this.generateWebHookSecret = this.generateWebHookSecret.bind(this);
  }
  changeWebHookSecretkey(event) {
    this.setState({
      stringData: { WebHookSecretKey: event.target.value }
    }, () => this.props.onChange(this.state));
  }
  generateWebHookSecret() {
    this.setState({
      stringData: { WebHookSecretKey: generateSecret() }
    }, () => this.props.onChange(this.state));
  }
  render () {
    return <div className="form-group">
      <label className="control-label" htmlFor="webhook-secret-key">Webhook Secret Key</label>
      <div className="input-group">
        <input className="form-control" id="webhook-secret-key" type="text" name="webhookSecretKey" onChange={this.changeWebHookSecretkey} value={this.state.stringData.WebHookSecretKey} required/>
        <span className="input-group-btn">
          <button type="button" onClick={this.generateWebHookSecret} className="btn btn-default">Generate</button>
        </span>
      </div>
      <p className="help-block">Value of the secret will be supplied when invoking the webhook. </p>
    </div>;
  }
}

class SourceSecretSubform extends React.Component<SourceSecretSubformProps, SourceSecretSubformState> {
  constructor (props) {
    super(props);
    this.state = {
      authenticationType: this.props.secretType,
      stringData: this.props.stringData || {},
    };
    this.changeAuthenticationType = this.changeAuthenticationType.bind(this);
  }
  changeAuthenticationType(event) {
    this.setState({
      authenticationType: event.target.value
    }, () => this.props.onChange(this.state));
  }
  onDataChanged (secretsData) {
    this.setState({
      stringData: {...secretsData},
    }, () => this.props.onChange(this.state));
  }
  render () {
    return <React.Fragment>
      {this.props.isCreate
        ? <div className="form-group">
            <label className="control-label">Authentication Type</label>
            <div className="modal-body__field">
              <select onChange={this.changeAuthenticationType} value={this.state.authenticationType} className="form-control">
                <option key="kubernetes.io/basic-auth" value="kubernetes.io/basic-auth">Basic Authentication</option>
                <option key="kubernetes.io/ssh-auth" value="kubernetes.io/ssh-auth">SSH Key</option>
              </select>
            </div>
          </div>
        : null
      }
      { this.state.authenticationType === 'kubernetes.io/basic-auth'
        ? <BasicAuthSubform onChange={this.onDataChanged.bind(this)} stringData={this.state.stringData}/>
        : <SSHAuthSubform onChange={this.onDataChanged.bind(this)} stringData={this.state.stringData}/> 
      }
    </React.Fragment>;
  }
}

const secretFormFactory = secretType => {
  switch(secretType) {
    case 'webhook':
      return secretForm(WebHookSecretSubform);
    default:
      return secretForm(SourceSecretSubform);
  }
}

class BasicAuthSubform extends React.Component<BasicAuthSubformProps, BasicAuthSubformState> {
  constructor (props) {
    super(props);
    this.state = {
      username: this.props.stringData.username || '',
      password: this.props.stringData.password || '',
    };
    this.changeData = this.changeData.bind(this);
  }
  changeData(event) {
    this.setState({
      [event.target.name]: event.target.value
    }, () => this.props.onChange(this.state));
  }
  render() {
    return <React.Fragment>
      <div className="form-group">
        <label className="control-label" htmlFor="username">Username</label>
        <div className="modal-body__field">
          <input className="form-control" id="username" type="text" name="username" onChange={this.changeData} value={this.state.username} required/>
          <p className="help-block text-muted">Optional username for Git authentication.</p>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="password">Password or Token</label>
        <div className="modal-body__field">
          <input className="form-control" id="password" type="password" name="password" onChange={this.changeData} value={this.state.password} required/>
          <p className="help-block text-muted">Password or token for Git authentication. Required if a ca.crt or .gitconfig file is not specified.</p>
        </div>
      </div>
    </React.Fragment>;
  }
}

class SSHAuthSubform extends React.Component<SSHAuthSubformProps, SSHAuthSubformState> {
  constructor (props) {
    super(props);
    this.state = {
      'ssh-privatekey': this.props.stringData['ssh-privatekey'] || '',
    };
    this.changeData = this.changeData.bind(this);
  }
  changeData(data) {
    this.setState({
      'ssh-privatekey': data
    }, () => this.props.onChange(this.state));
  }
  render() {
    return <DropableFileInput 
      label='SSH Private Key'
      inputFieldHelpText='Upload your private SSH key file.'
      textareaFieldHelpText='Private SSH key file for Git authentication.'
      inputData={this.state['ssh-privatekey']}
      onChange={this.changeData.bind(this)}
    />
  }
}

const SecretLoadingWrapper = props => {
  const secretTypeAbstraction = determineSecretTypeAbstraction(_.get(props.obj.data, 'data'));
  const SecretFormComponent = secretFormFactory(secretTypeAbstraction);
  const fixed = _.reduce(props.fixedKeys, (acc, k) => ({...acc, k: _.get(props.obj.data, k)}), {});
  return <StatusBox {...props.obj}>
    <SecretFormComponent
      secretTypeAbstraction={secretTypeAbstraction}
      obj={props.obj.data}
      fixed={fixed}
      {...props}
    />
  </StatusBox>;
};

export const CreateSecret = ({match: {params}}) => {
  const SecretFormComponent = secretFormFactory(params.type);
  return <SecretFormComponent fixed={{ metadata: { namespace: params.ns } }}
    secretTypeAbstraction={params.type}
    titleVerb="Create"
    isCreate={true}
  />
};

export const EditSecret = ({match: {params}, kind}) => <Firehose resources={[{kind: kind, name: params.name, namespace: params.ns, isList: false, prop: 'obj'}]}>
  <SecretLoadingWrapper fixedKeys={['kind', 'metadata']} titleVerb="Edit" saveButtonText="Save Changes" />
</Firehose>;


export type BaseEditSecretState_ = {
  secretTypeAbstraction?: SecretTypeAbstraction,
  secret: K8sResourceKind,
  inProgress: boolean,
  type: string,
  stringData: {[key: string]: string},
  error?: any,
};

export type BaseEditSecretProps_ = {
  obj?: K8sResourceKind,
  fixed: any,
  kind?: string,
  isCreate: boolean,
  titleVerb: string,
  secretTypeAbstraction?: SecretTypeAbstraction,
  saveButtonText?: string,
};

export type BasicAuthSubformState = {
  username: string,
  password: string,
};

export type BasicAuthSubformProps = {
  onChange: Function,
  stringData: {[key: string]: string},
};

export type SSHAuthSubformState = {
  'ssh-privatekey': string,
};

export type SSHAuthSubformProps = {
  onChange: Function;
  stringData: {[key: string]: string},
};

export type SourceSecretSubformState = {
  authenticationType: SecretType,
  stringData: {[key: string]: string},
};

export type SourceSecretSubformProps = {
  onChange: Function;
  stringData: {[key: string]: string},
  secretType: SecretType,
  isCreate: boolean,
};

export type WebHookSecretSubformState = {
  stringData: {[key: string]: string},
};

export type WebHookSecretSubformProps = {
  onChange: Function;
  stringData: {[WebHookSecretKey: string]: string},
};
