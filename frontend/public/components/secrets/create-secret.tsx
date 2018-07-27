/* eslint-disable no-undef */
import * as _ from 'lodash-es';
import * as React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

import { k8sCreate, k8sUpdate, K8sResourceKind } from '../../module/k8s';
import { ButtonBar, Firehose, history, kindObj, StatusBox, LoadingBox } from '../utils';
import { formatNamespacedRouteForResource } from '../../ui/ui-actions';
import { AsyncComponent } from '../utils/async';

enum SecretTypeAbstraction {
  generic = 'generic',
  source = 'source',
  image = 'image',
  webhook = 'webhook',
}

const AUTHS_KEY = 'auths';

export enum SecretType {
  basicAuth = 'kubernetes.io/basic-auth',
  sshAuth = 'kubernetes.io/ssh-auth',
  dockerconfigjsonAuth = 'kubernetes.io/dockerconfigjson',
  dockercfgAuth = 'kubernetes.io/dockercfg',
  opaque = 'Opaque'
}

export type BasicAuthSubformState = {
  username: string,
  password: string,
};

const secretFormExplanation = {
  [SecretTypeAbstraction.source]: 'Source secrets allow you to authenticate against the SCM server.',
  [SecretTypeAbstraction.image]: 'Image secrets allow you to authenticate against a private image registry.',
  [SecretTypeAbstraction.webhook]: 'Webhook secrets allow you to authenticate a webhook trigger.',
};

const determineDefaultSecretType = (typeAbstraction: SecretTypeAbstraction) => {
  switch (typeAbstraction) {
    case SecretTypeAbstraction.source:
      return SecretType.basicAuth;
    case SecretTypeAbstraction.image:
      return SecretType.dockerconfigjsonAuth;
    default:
      return SecretType.opaque;
  }
};


const determineSecretTypeAbstraction = (type) => {
  switch (type) {
    case (SecretType.basicAuth):
    case (SecretType.sshAuth):
      return SecretTypeAbstraction.source;
    case (SecretType.dockerconfigjsonAuth):
    case (SecretType.dockercfgAuth):
      return SecretTypeAbstraction.image;
    default:
      return SecretTypeAbstraction.webhook;
  }
};

const generateSecret = () => {
  // http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + s4() + s4();
};


// withSecretForm returns SubForm which is a Higher Order Component for all the types of secret forms.
const withSecretForm = (SubForm) => class SecretFormComponent extends React.Component<BaseEditSecretProps_, BaseEditSecretState_> {
  constructor(props) {
    super(props);
    const existingSecret = _.pick(props.obj, ['metadata', 'type']);
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
      stringData: _.mapValues(_.get(props.obj, 'data'), window.atob),
    };
    this.onDataChanged = this.onDataChanged.bind(this);
    this.onNameChanged = this.onNameChanged.bind(this);
    this.save = this.save.bind(this);
  }
  onDataChanged (secretsData) {
    this.setState({
      stringData: {...secretsData.stringData},
      type: secretsData.type,
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
    return <div className="co-m-pane__body">
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <form className="co-m-pane__body-group co-create-secret-form" onSubmit={this.save}>
        <h1 className="co-m-pane__heading">{title}</h1>
        <p className="co-m-pane__explanation">{this.props.explanation}</p>

        <fieldset disabled={!this.props.isCreate}>
          <div className="form-group">
            <label className="control-label" htmlFor="secret-name">Secret Name</label>
            <div>
              <input className="form-control"
                type="text"
                onChange={this.onNameChanged}
                value={this.state.secret.metadata.name}
                aria-describedby="secret-name-help"
                id="secret-name"
                required />
              <p className="help-block" id="secret-name-help">Unique name of the new secret.</p>
            </div>
          </div>
        </fieldset>
        <SubForm
          onChange={this.onDataChanged.bind(this)}
          stringData={this.state.stringData}
          secretType={this.state.secret.type}
          isCreate={this.props.isCreate}
        />
        <ButtonBar errorMessage={this.state.error} inProgress={this.state.inProgress}>
          <button type="submit" className="btn btn-primary" id="create-secret">{this.props.saveButtonText || 'Create'}</button>
          <Link to={formatNamespacedRouteForResource('secrets')} className="btn btn-default">Cancel</Link>
        </ButtonBar>
      </form>
    </div>;
  }
};

const getImageSecretKey = (secretType) => {
  switch (secretType) {
    case 'kubernetes.io/dockercfg':
      return '.dockercfg';
    case 'kubernetes.io/dockerconfigjson':
      return '.dockerconfigjson';
    default:
      return secretType;
  }
}

const getImageSecretType = (secretKey) => {
  switch (secretKey) {
    case '.dockercfg':
      return 'kubernetes.io/dockercfg';
    case '.dockerconfigjson':
      return 'kubernetes.io/dockerconfigjson';
    default:
      return secretKey;
  }
}

class ImageSecretForm extends React.Component<ImageSecretFormProps, ImageSecretFormState> {
  constructor(props) {
    super(props);
    const data = this.props.isCreate ? {'.dockerconfigjson': '{}'} : this.props.stringData;
    this.state = {
      type: this.props.secretType,
      dataKey: getImageSecretKey(this.props.secretType),
      stringData: _.mapValues(data, JSON.parse),
      uploadConfig: 'false',
    };

    this.onDataChanged = this.onDataChanged.bind(this);
    this.changeFormType = this.changeFormType.bind(this);
  }
  onDataChanged (secretData) {
    this.setState({
      stringData: {[this.state.dataKey]: secretData}
    }, () => this.props.onChange({
      stringData: _.mapValues(this.state.stringData, JSON.stringify),
      type: getImageSecretType(this.state.dataKey),
    }));
  }
  changeFormType(event) {
    this.setState({
      uploadConfig: event.target.value,
    });
  }
  render () {
    const data = _.get(this.state.stringData, this.state.dataKey);
    return <React.Fragment>
      {this.props.isCreate && <div className="form-group">
          <label className="control-label" htmlFor="secret-type">Authentication Type</label>
          <div>
            <select onChange={this.changeFormType} value={this.state.uploadConfig} className="form-control" id="secret-type">
              <option value="false">Image Registry Credentials</option>
              <option value="true">Upload Configuration File</option>
            </select>
          </div>
        </div>
      }
      { this.state.uploadConfig === 'false'
        ? <CreateConfigSubform onChange={this.onDataChanged} stringData={data} />
        : <UploadConfigSubform onChange={this.onDataChanged} stringData={data} />
      }
    </React.Fragment>;
  }
}

export type ConfigEntryFormState = {
  address: string,
  username: string,
  password: string,
  email: string,
  auth: string,
};

export type ConfigEntryFormProps = {
  id: number,
  entry: Object,
  onChange: Function,
};

class ConfigEntryForm extends React.Component<ConfigEntryFormProps, ConfigEntryFormState> {
  constructor(props) {
    super(props)
    this.state = {
      address: _.get(this.props.entry, 'address'),
      username: _.get(this.props.entry, 'username'),
      password: _.get(this.props.entry, 'password'),
      email: _.get(this.props.entry, 'email'),
      auth: _.get(this.props.entry, 'auth'),
    };
    this.changeData = this.changeData.bind(this);
  }
  // If 'username' or 'password' fields are update, 'auth' field has to be updated as well, else stays the same.
  updateAuth(updatedFieldName) {
    return _.includes(['username', 'password'], updatedFieldName)
      ? window.btoa(`${this.state.username}:${this.state.password}`)
      : this.state.auth
  }
  changeData(event) {
    this.setState({
      auth: this.updateAuth(event.target.name),
      [event.target.name]: event.target.value
    } as ConfigEntryFormState, () => this.props.onChange(this.state, this.props.id));
  }
  render() {
    return <div className='co-create-image-secret__form'>
      <div className="form-group">
        <label className="control-label" htmlFor={`${this.props.id}-address`}>Registry Server Address</label>
        <div>
          <input className="form-control"
            id={`${this.props.id}-address`}
            type="text"
            name="address"
            onChange={this.changeData}
            value={this.state.address}
            required />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor={`${this.props.id}-username`}>Username</label>
        <div>
          <input className="form-control"
            id={`${this.props.id}-username`}
            type="text"
            name="username"
            onChange={this.changeData}
            value={this.state.username}
            required />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor={`${this.props.id}-password`}>Password</label>
        <div>
          <input className="form-control"
            id={`${this.props.id}-password`}
            type="password"
            name="password"
            onChange={this.changeData}
            value={this.state.password}
            required />
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor={`${this.props.id}-email`}>Email</label>
        <div>
          <input className="form-control"
            id={`${this.props.id}-email`}
            type="text"
            name="email"
            onChange={this.changeData}
            value={this.state.email}
            required />
        </div>
      </div>
    </div>
  }
}

export type CreateConfigSubformState = {
  isDockerconfigjson: boolean,
  hasDuplicate: boolean,
  secretEntriesArray: {
    address: string,
    username: string,
    password: string,
    email: string,
    auth: string
  }[],
};

class CreateConfigSubform extends React.Component<CreateConfigSubformProps, CreateConfigSubformState> {
  constructor(props) {
    super(props);
    this.state = {
      // If user creates a new image secret by filling out the form a 'kubernetes.io/dockerconfigjson' secret will be created.
      isDockerconfigjson: _.isEmpty(this.props.stringData) || Object.keys(this.props.stringData)[0] === AUTHS_KEY,
      secretEntriesArray: this.imageSecretObjectToArray(this.props.stringData[AUTHS_KEY] || this.props.stringData),
      hasDuplicate: false,
    };
    this.onDataChanged = this.onDataChanged.bind(this);
  }
  newImageSecretEntry() {
    return {
      address: '',
      username: '',
      password: '',
      email: '',
      auth: '',
    };
  }
  imageSecretObjectToArray(imageSecretObject) {
    const imageSecretArray = [];
    if (_.isEmpty(imageSecretObject)) {
      return _.concat(imageSecretArray, this.newImageSecretEntry());
    }
    _.each(imageSecretObject, (v, k) => {
      // Decode and parse 'auth' in case 'username' and 'password' are not part of the secret.
      const decodedAuth = window.atob(_.get(v, 'auth', ''));
      const parsedAuth = _.isEmpty(decodedAuth) ? _.fill(Array(2), '') : _.split(decodedAuth, ':');
      imageSecretArray.push({
        address: k,
        username: _.get(v, 'username', parsedAuth[0]),
        password: _.get(v, 'password', parsedAuth[1]),
        email: _.get(v, 'email', ''),
        auth: _.get(v, 'auth', ''),
      });
    });
    return imageSecretArray;
  }
  imageSecretArrayToObject(imageSecretArray) {
    const imageSecretsObject = {};
    _.each(imageSecretArray, (entry) => {
      const entryCredentials = {
        username: entry.username,
        password: entry.password,
        auth: entry.auth,
        email: entry.email
      }
      imageSecretsObject[entry.address] = entryCredentials;
    });
    return imageSecretsObject
  }
  // Image secrets entry address can't be duplicate in the secret, else the first one will be deleted.
  checkEntryAddressForDuplicates(updatedEntryData, entryID) {
    let hasDuplicate = false;
    _.each(this.state.secretEntriesArray, (entry, index) => {
      // Don't check the same entry, continue.
      if (entryID === index) {
        return;
      }
      if (_.isEqual(entry.address, updatedEntryData.address)) {
        hasDuplicate = true;
        return false;
      }
    });
    return hasDuplicate;
  }
  onDataChanged (updatedEntryData, entryID) {
    const secretEntriesArray = this.state.secretEntriesArray;
    secretEntriesArray.splice(entryID, 1, updatedEntryData);
    this.setState({
      secretEntriesArray: secretEntriesArray,
      hasDuplicate: this.checkEntryAddressForDuplicates(updatedEntryData, entryID)
    }, () => {
      const imageSecretObject = this.imageSecretArrayToObject(this.state.secretEntriesArray);
      this.props.onChange(this.state.isDockerconfigjson ? {[AUTHS_KEY]: imageSecretObject} : imageSecretObject);
    });
  }
  render() {
    const secretEntriesList = [];
    _.each(this.state.secretEntriesArray, (entry, index) => {
      secretEntriesList.push(<ConfigEntryForm key={index} id={index} entry={entry} onChange={this.onDataChanged} />)
    });
    return (
      <React.Fragment>
        {secretEntriesList}
        { this.state.hasDuplicate && <div className="co-create-secret-warning">Updated <b>Registry Server Address</b> is duplicate. Remove it, or it will be removed upon saving.</div> }
      </React.Fragment>
    )
  }
}

class UploadConfigSubform extends React.Component<UploadConfigSubformProps, UploadConfigSubformState> {
  constructor(props) {
    super(props);
    this.state = {
      configFile: _.isEmpty(this.props.stringData) ? '' : JSON.stringify(this.props.stringData),
      parseError: false,
    };
    this.changeData = this.changeData.bind(this);
    this.onFileChange = this.onFileChange.bind(this);
  }
  changeData(event) {
    this.updateState(_.attempt(JSON.parse, event.target.value), event.target.value);
  }
  onFileChange(fileData) {
    this.updateState(_.attempt(JSON.parse, fileData), fileData);
  }
  updateState(parsedData, stringData) {
    this.setState({
      configFile: stringData,
      parseError: _.isError(parsedData),
    }, () => !_.isError(parsedData) && this.props.onChange(parsedData));
  }
  render() {
    return <React.Fragment>
      <DroppableFileInput
        onChange={this.onFileChange}
        inputFileData={this.state['configFile']}
        id="docker-config"
        label="Configuration File"
        inputFieldHelpText="Upload a .dockercfg or .docker/config.json file."
        textareaFieldHelpText="File with credentials and other configuration for connecting to a secured image registry." />
      { this.state.parseError && <div className="co-create-secret-warning">Configuration file should be in JSON format.</div> }
    </React.Fragment>
  }
}

class WebHookSecretForm extends React.Component<WebHookSecretFormProps, WebHookSecretFormState> {
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
        <input className="form-control"
          id="webhook-secret-key"
          type="text"
          name="webhookSecretKey"
          onChange={this.changeWebHookSecretkey}
          value={this.state.stringData.WebHookSecretKey}
          aria-describedby="webhook-secret-help"
          required />
        <span className="input-group-btn">
          <button type="button" onClick={this.generateWebHookSecret} className="btn btn-default">Generate</button>
        </span>
      </div>
      <p className="help-block" id="webhook-secret-help">Value of the secret will be supplied when invoking the webhook. </p>
    </div>;
  }
}

class SourceSecretForm extends React.Component<SourceSecretFormProps, SourceSecretFormState> {
  constructor(props) {
    super(props);
    this.state = {
      type: this.props.secretType,
      stringData: this.props.stringData || {},
    };
    this.changeAuthenticationType = this.changeAuthenticationType.bind(this);
    this.onDataChanged = this.onDataChanged.bind(this);
  }
  changeAuthenticationType(event) {
    this.setState({
      type: event.target.value
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
          <label className="control-label" htmlFor="secret-type">Authentication Type</label>
          <div>
            <select onChange={this.changeAuthenticationType} value={this.state.type} className="form-control" id="secret-type">
              <option value={SecretType.basicAuth}>Basic Authentication</option>
              <option value={SecretType.sshAuth}>SSH Key</option>
            </select>
          </div>
        </div>
        : null
      }
      { this.state.type === SecretType.basicAuth
        ? <BasicAuthSubform onChange={this.onDataChanged} stringData={this.state.stringData} />
        : <SSHAuthSubform onChange={this.onDataChanged} stringData={this.state.stringData} />
      }
    </React.Fragment>;
  }
}

export class BasicAuthSubform extends React.Component<BasicAuthSubformProps, BasicAuthSubformState> {
  constructor(props) {
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
    } as BasicAuthSubformState, () => this.props.onChange(this.state));
  }
  render() {
    return <React.Fragment>
      <div className="form-group">
        <label className="control-label" htmlFor="username">Username</label>
        <div>
          <input className="form-control"
            id="username"
            aria-describedby="username-help"
            type="text"
            name="username"
            onChange={this.changeData}
            value={this.state.username}
            required />
          <p className="help-block" id="username-help">Optional username for Git authentication.</p>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="password">Password or Token</label>
        <div>
          <input className="form-control"
            id="password"
            aria-describedby="password-help"
            type="password"
            name="password"
            onChange={this.changeData}
            value={this.state.password}
            required />
          <p className="help-block" id="password-help">Password or token for Git authentication. Required if a ca.crt or .gitconfig file is not specified.</p>
        </div>
      </div>
    </React.Fragment>;
  }
}

const DroppableFileInput = (props) => <AsyncComponent loader={() => import('../utils/file-input').then(c => c.DroppableFileInput)} {...props} />;

class SSHAuthSubform extends React.Component<SSHAuthSubformProps, SSHAuthSubformState> {
  constructor(props) {
    super(props);
    this.state = {
      'ssh-privatekey': this.props.stringData['ssh-privatekey'] || '',
    };
    this.changeData = this.changeData.bind(this);
    this.onFileChange = this.onFileChange.bind(this);
  }
  changeData(event) {
    this.setState({
      'ssh-privatekey': event.target.value
    }, () => this.props.onChange(this.state));
  }
  onFileChange(fileData) {
    this.setState({
      'ssh-privatekey': fileData
    }, () => this.props.onChange(this.state));
  }
  render() {
    return <DroppableFileInput
      onChange={this.onFileChange}
      inputFileData={this.state['ssh-privatekey']}
      id="ssh-privatekey"
      label="SSH Private Key"
      inputFieldHelpText="Drag and drop your private SSH key here or browse to upload it."
      textareaFieldHelpText="Private SSH key file for Git authentication." />;
  }
}

const secretFormFactory = secretType => {
  switch (secretType) {
    case SecretTypeAbstraction.source:
      return withSecretForm(SourceSecretForm);
    case SecretTypeAbstraction.image:
      return withSecretForm(ImageSecretForm);
    default:
      return withSecretForm(WebHookSecretForm);
  }
};

const SecretLoadingWrapper = props => {
  if (!props.obj.loaded) {
    return <LoadingBox />;
  }
  const secretTypeAbstraction = determineSecretTypeAbstraction(_.get(props.obj, 'data.type'));
  const SecretFormComponent = secretFormFactory(secretTypeAbstraction);
  const fixed = _.reduce(props.fixedKeys, (acc, k) => ({...acc, k: _.get(props.obj.data, k)}), {});
  return <StatusBox {...props.obj}>
    <SecretFormComponent {...props}
      secretTypeAbstraction={secretTypeAbstraction}
      obj={props.obj.data}
      fixed={fixed}
      explanation={secretFormExplanation[secretTypeAbstraction]}
    />
  </StatusBox>;
};

export const CreateSecret = ({match: {params}}) => {
  const SecretFormComponent = secretFormFactory(params.type);
  return <SecretFormComponent fixed={{ metadata: { namespace: params.ns } }}
    secretTypeAbstraction={params.type}
    explanation={secretFormExplanation[params.type]}
    titleVerb="Create"
    isCreate={true}
  />;
};

export const EditSecret = ({match: {params}, kind}) => <Firehose resources={[{kind: kind, name: params.name, namespace: params.ns, isList: false, prop: 'obj'}]}>
  <SecretLoadingWrapper fixedKeys={['kind', 'metadata']} titleVerb="Edit" saveButtonText="Save Changes" />
</Firehose>;

export type BaseEditSecretState_ = {
  secretTypeAbstraction?: SecretTypeAbstraction,
  secret: K8sResourceKind,
  inProgress: boolean,
  type: SecretType,
  stringData: {
    [key: string]: string
  },
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
  explanation: string,
};

export type BasicAuthSubformProps = {
  onChange: Function,
  stringData: {
    [key: string]: string
  },
};

export type ImageSecretFormState = {
  type: SecretType,
  stringData: {
    [key: string]: any,
  },
  uploadConfig: string,
  dataKey: string,
};

export type ImageSecretFormProps = {
  onChange: Function;
  stringData: {
    [key: string]: Object,
  },
  secretType: SecretType,
  isCreate: boolean,
};

export type CreateConfigSubformProps = {
  onChange: Function;
  stringData: {
    [key: string]: any,
  },
};

export type UploadConfigSubformState = {
  parseError: boolean,
  configFile: string,
};

export type UploadConfigSubformProps = {
  onChange: Function;
  stringData: {
    [key: string]: Object,
  },
};

export type SSHAuthSubformState = {
  'ssh-privatekey': string,
};

export type SSHAuthSubformProps = {
  onChange: Function,
  stringData: {
    [key: string]: string
  },
};

export type SourceSecretFormState = {
  type: SecretType,
  stringData: {
    [key: string]: string
  },
};

export type SourceSecretFormProps = {
  onChange: Function,
  stringData: {
    [key: string]: string
  },
  secretType: SecretType,
  isCreate: boolean,
};

export type WebHookSecretFormState = {
  stringData: {
    [key: string]: string
  },
};

export type WebHookSecretFormProps = {
  onChange: Function,
  stringData: {
    WebHookSecretKey: string
  },
};
/* eslint-enable no-undef */
