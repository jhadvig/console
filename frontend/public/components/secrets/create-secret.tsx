/* eslint-disable no-undef */
import * as _ from 'lodash-es';
import * as React from 'react';
import { Helmet } from 'react-helmet';
// import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import { k8sCreate, k8sUpdate, K8sResourceKind } from '../../module/k8s';
import { ButtonBar, Firehose, history, kindObj, StatusBox } from '../utils';
import { formatNamespacedRouteForResource } from '../../ui/ui-actions';
// import { SafetyFirst } from '../safety-first';
import { WebHookSecretKey } from '../secret';

export enum SecretTypes {
  webhook = 'webhook',
  generic = 'generic',
}

const generateSecret = () => {
  // http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + s4() + s4();
};

const determineSecretTypeAbstraction = (data) => {
  return _.has(data, WebHookSecretKey) ? SecretTypes.webhook : SecretTypes.generic;
};

const secretForm = (SubformComponent) => class SecretFormHOC extends React.Component<BaseEditSecretProps_, BaseEditSecretState_> {
  constructor (props) {
    super(props);
    const inputObj = _.get(props.obj, 'data');
    const existingSecret = _.pick(inputObj, ['metadata', 'type']);
    const existingSecretData = _.get(inputObj, 'data');
    const secret = _.defaultsDeep({}, props.fixed, existingSecret, {
      apiVersion: 'v1',
      data: {},
      kind: 'Secret',
      metadata: {
        name: '',
      },
      type: 'Opaque',
    });

    this.state = {
      secretType: this.props.secretType || determineSecretTypeAbstraction(existingSecretData),
      secret: secret,
      inProgress: false,
      type: secret.type,
      stringData: _.mapValues(existingSecretData, window.atob),
    };
    this.onDataChanged = this.onDataChanged.bind(this);
    this.onNameChanged = this.onNameChanged.bind(this);
    this.save = this.save.bind(this);
  }
  onDataChanged (secretsData) {
    this.setState({stringData: {...secretsData}});
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

    const newSecret = _.assign({}, this.state.secret, {stringData: this.state.stringData});
    const ko = kindObj(kind);
    (this.props.isCreate
      ? k8sCreate(ko, newSecret)
      : k8sUpdate(ko, newSecret, metadata.namespace, newSecret.metadata.name)
    ).then(() => {
      this.setState({inProgress: false});
      history.push(formatNamespacedRouteForResource('secrets'));
    },
    err => this.setState({error: err.message, inProgress: false})
    );
  }
  render () {
    const title = `${this.props.titleVerb} ${_.upperFirst(this.state.secretType)} Secret`;
    const { saveButtonText } = this.props;

    const explanation = 'Webhook secrets allow you to authenticate a webhook trigger.';

    return <div className="co-m-pane__body">
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <form className="co-m-pane__body-group" onSubmit={this.save}>
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
        <SubformComponent onChange={this.onDataChanged.bind(this)} stringData={this.state.stringData} />
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
    this.state = {WebHookSecretKey: this.props.stringData.WebHookSecretKey || ''};
    this.changeWebHookSecretkey = this.changeWebHookSecretkey.bind(this);
    this.generateWebHookSecret = this.generateWebHookSecret.bind(this);
  }
  changeWebHookSecretkey(event) {
    this.setState({
      WebHookSecretKey: event.target.value
    }, () => this.props.onChange(this.state));
  }
  generateWebHookSecret() {
    this.setState({
      WebHookSecretKey: generateSecret()
    }, () => this.props.onChange(this.state));
  }
  render () {
    return <div className="form-group">
      <label className="control-label" htmlFor="webhook-secret-key">Webhook Secret Key</label>
      <div className="input-group">
        <input className="form-control" id="webhook-secret-key" type="text" name="webhookSecretKey" onChange={this.changeWebHookSecretkey} value={this.state.WebHookSecretKey} required/>
        <span className="input-group-btn">
          <button type="button" onClick={this.generateWebHookSecret} className="btn btn-default">Generate</button>
        </span>
      </div>
      <p className="help-block">Value of the secret will be supplied when invoking the webhook. </p>
    </div>;
  }
}



const secretFormFactory = secretType => {
  switch(secretType) {
    case 'webhook':
      return secretForm(WebHookSecretSubform);
    default:
      return secretForm(WebHookSecretSubform);
  }
}

const SecretLoadingWrapper = props => {
  // props.obj.data = {kind: "Secret", apiVersion: "v1", metadata: {…}, data: {…}, type: "Opaque"}
  const SecretFormHOC = secretFormFactory('webhook');
  const fixed = _.reduce(props.fixedKeys, (acc, k) => ({...acc, k: _.get(props.obj.data, k)}), {});
  return <StatusBox {...props.obj}>
    <SecretFormHOC
      // secretTypeAbstraction={SecretTypeAbstraction.webhook}
      obj={props.obj.data}
      fixed={fixed}
      {...props}
    />
  </StatusBox>;
};


export const CreateSecret = ({match: {params}}) => {
  // params = {ns: "myproject", type: "webhook"}
  const SecretFormHOC = secretFormFactory(params.type);
  return <SecretFormHOC fixed={{ metadata: {namespace: 'myproject'} }}
    metadata={{ namespace: 'myproject' }}
    // secretTypeAbstraction={SecretTypeAbstraction.webhook}
    // secretType={params.type}
    titleVerb="Create"
    isCreate={true}
  />
};

export const EditSecret = ({match: {params}, kind}) => <Firehose resources={[{kind: kind, name: params.name, namespace: params.ns, isList: false, prop: 'obj'}]}>
  <SecretLoadingWrapper fixedKeys={['kind', 'metadata']} titleVerb="Edit" saveButtonText="Save Changes" />
</Firehose>;





export type BaseEditSecretState_ = {
  secretType?: string,
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
  // setActiveNamespace: Function,
  secretType?: string,
  saveButtonText?: string,
  metadata: any,
};

export type WebHookSecretSubformState = {
  WebHookSecretKey: string;
};

export type WebHookSecretSubformProps = {
  onChange: Function;
  stringData: {[WebHookSecretKey: string]: string};
};
/* eslint-enable no-undef */
