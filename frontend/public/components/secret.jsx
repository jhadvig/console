import * as _ from 'lodash-es';
import * as React from 'react';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import * as ace from 'brace';
import AceEditor from 'react-ace';
import 'brace/mode/text';
import 'brace/mode/json';
import 'brace/theme/github';

import { ColHead, DetailsPage, List, ListHeader, ListPage, ResourceRow } from './factory';
import { SecretData } from './configmap-and-secret-data';
// import { Cog, ResourceCog, ResourceLink, ResourceSummary, detailsPage, navFactory } from './utils';
import { ButtonBar, Cog, Dropdown, Firehose, history, kindObj, LoadingInline, MsgBox,
  OverflowYFade, ResourceCog, ResourceName, ResourceLink, ResourceSummary, detailsPage, navFactory,
  resourceObjPath, StatusBox, getQueryArgument } from './utils';
import { getActiveNamespace, formatNamespacedRouteForResource, UIActions } from './../ui/ui-actions';
import { fromNow } from './utils/datetime';
import { SafetyFirst } from './safety-first';
import { registerTemplate } from '../yaml-templates';
import { SecretAuthSubform } from './secrets/secrets'
import { NameValueEditor, NAME, VALUE } from './utils/name-value-editor';

registerTemplate('v1.Secret', `apiVersion: v1
kind: Secret
metadata:
  name: example
type: Opaque
data:
  username: YWRtaW4=
  password: MWYyZDFlMmU2N2Rm`);

const menuActions = Cog.factory.common;

const SecretHeader = props => <ListHeader>
  <ColHead {...props} className="col-md-3 col-sm-4 col-xs-6" sortField="metadata.name">Name</ColHead>
  <ColHead {...props} className="col-md-3 col-sm-4 col-xs-6" sortField="metadata.namespace">Namespace</ColHead>
  <ColHead {...props} className="col-md-3 col-sm-4 hidden-xs" sortField="type">Type</ColHead>
  <ColHead {...props} className="col-md-1 hidden-sm hidden-xs" sortFunc="dataSize">Size</ColHead>
  <ColHead {...props} className="col-md-2 hidden-sm hidden-xs" sortField="metadata.creationTimestamp">Created</ColHead>
</ListHeader>;

const SecretRow = ({obj: secret}) => {
  const data = _.size(secret.data);
  const age = fromNow(secret.metadata.creationTimestamp);

  return <ResourceRow obj={secret}>
    <div className="col-md-3 col-sm-4 col-xs-6">
      <ResourceCog actions={menuActions} kind="Secret" resource={secret} />
      <ResourceLink kind="Secret" name={secret.metadata.name} namespace={secret.metadata.namespace} title={secret.metadata.uid} />
    </div>
    <div className="col-md-3 col-sm-4 col-xs-6">
      <ResourceLink kind="Namespace" name={secret.metadata.namespace} title={secret.metadata.namespace} />
    </div>
    <div className="col-md-3 col-sm-4 hidden-xs">{secret.type}</div>
    <div className="col-md-1 hidden-sm hidden-xs">{data}</div>
    <div className="col-md-2 hidden-sm hidden-xs">{age}</div>
  </ResourceRow>;
};

const SecretDetails = ({obj: secret}) => {
  return <React.Fragment>
    <div className="co-m-pane__body">
      <ResourceSummary resource={secret} showPodSelector={false} showNodeSelector={false} />
    </div>
    <div className="co-m-pane__body">
      <SecretData data={secret.data} type={secret.type} />
    </div>
  </React.Fragment>;
};

const SecretsList = props => <List {...props} Header={SecretHeader} Row={SecretRow} />;
SecretsList.displayName = 'SecretsList';

const SecretsPage = props => <ListPage ListComponent={SecretsList} canCreate={true} {...props} />;
const SecretsDetailsPage = props => <DetailsPage
  {...props}
  menuActions={menuActions}
  pages={[navFactory.details(detailsPage(SecretDetails)), navFactory.editYaml()]}
/>;

const secretsInitialMetadata =  {
  secretType: 'source',
  secretName: '',
  secretData: null,
};

class SecretsInputComponent extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      value: ''
    }
  }
  changeHandler(event) {
    this.setState({ value: event.target.value});
  }
  render () {
    return
      <div className="form-group">
        <label className="control-label" htmlFor={purpose}>{name}</label>
        <div className="modal-body__field">
          <input className="form-control" id={purpose} type={purpose} name={purpose} onChange={this.changeHandler} value={this.state.data} required/>
        </div>
      </div>
  }
}

class SecretBasicAuthenticationSubform extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      username: '',
      password: ''
    }
    this.changeData = this.changeData.bind(this);
  }
  changeData(event) {
    this.setState({
      [event.target.name]: event.target.value
    }, () => this.props.callbackForInputData(this.state));
  }
  render () {
    return <React.Fragment>   
      <div className="form-group">
        <label className="control-label" htmlFor="username">Username</label>
        <div className="modal-body__field">
          <input className="form-control" id="username" type="text" name="username" onChange={this.changeData} value={this.state.data} required/>
          <p className="help-block text-muted">Optional username for Git authentication.</p>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="password">Password or Token</label>
        <div className="modal-body__field">
          <input className="form-control" id="password" type="password" name="password" onChange={this.changeData} value={this.state.data} required/>
          <p className="help-block text-muted">Password or token for Git authentication. Required if a ca.crt or .gitconfig file is not specified.</p>
        </div>
      </div>
    </React.Fragment>;
  }
}

class SecretSSHAuthenticationSubform extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      privateKey: '',
    }
    this.changeData = _.debounce(this.changeData.bind(this), 300);
  }
  changeData(value) {
    this.setState({
      privateKey: value
    }, () => this.props.callbackForInputData(this.state));
  }
  render () {
    return <div className="form-group">
      <label className="control-label" htmlFor="private-key">SSH Private Key</label>
      <div className="modal-body__field">
        <AceEditor
          mode="text"
          theme="github"
          onChange={this.changeData}
          name="private-key-editor"
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          height="300px"
          width="100%"
          value={this.state.privateKey}
          editorProps={{ $blockScrolling: true }}
          setOptions={{
            enableSnippets: false,
            showLineNumbers: true,
            tabSize: 2,
          }}
        />
        <p className="help-block text-muted">Private SSH key file for Git authentication.</p>
      </div>
    </div>
  }
}

class RegistryConfigFileAuthenticationSubform extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      configuration: '',
      isValidJSON: true
    }
    // this.changeData = this.changeData.bind(this);
    this.changeData = _.debounce(this.changeData.bind(this), 300);
  }
  changeData(value) {
    try {
      JSON.parse(value);
      this.setState({ isValidJSON: true})
    } catch (e) {
      this.setState({ isValidJSON: false})
    }
    this.setState({
      configuration: value
    }, () => this.props.callbackForInputData(this.state));
  }
  render () {
    return <React.Fragment>
      <div className="form-group">
        <label className="control-label" htmlFor="private-key">Configuration File</label>
        <div className="modal-body__field">
          <AceEditor
            mode="json"
            theme="github"
            onChange={this.changeData}
            name="private-key-editor"
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            height="300px"
            width="100%"
            value={this.state.configuration}
            editorProps={{ $blockScrolling: true }}
            setOptions={{
              enableSnippets: false,
              showLineNumbers: true,
              tabSize: 2,
            }}
          />
        </div>
        <p className="help-block text-muted">File with credentials and other configuration for connecting to a secured image registry.</p>
      </div>
      {!this.state.isValidJSON && <p className="text-warning">Configuration file should be in JSON format.</p>}
    </React.Fragment>
  }
}



class RegistryCredentialsAuthenticationSubform extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      serverAddress: '',
      username: '',
      password: '',
      email: '',
    }
    this.changeData = this.changeData.bind(this);
  }
  changeData(event) {
    this.setState({
      [event.target.name]: event.target.value
    }, () => this.props.callbackForInputData(this.state));
  }
  render () {
    return <React.Fragment>
      <div className="form-group">
        <label className="control-label" htmlFor="username">Image Registry Server Address</label>
        <div className="modal-body__field">
          <input className="form-control" id="serverAddress" type="text" name="serverAddress" onChange={this.changeData} value={this.state.data} required/>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="username">Username</label>
        <div className="modal-body__field">
          <input className="form-control" id="username" type="text" name="username" onChange={this.changeData} value={this.state.data} required/>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="password">Password</label>
        <div className="modal-body__field">
          <input className="form-control" id="password" type="password" name="password" onChange={this.changeData} value={this.state.data} required/>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="password">Email</label>
        <div className="modal-body__field">
          <input className="form-control" id="email" type="email" name="email" onChange={this.changeData} value={this.state.data} required/>
        </div>
      </div>
    </React.Fragment>;
  }
}


class SecretAuthenticationTypeSubform extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      authenticationType: 'kubernetes.io/basic-auth',
      authenticationData: {},
    }
    this.changeAuthenticationType = this.changeAuthenticationType.bind(this);
  }
  changeAuthenticationType(event) {
    this.setState({
      authenticationType: event.target.value
    }, () => this.props.callbackForMetadata(this.state));
  }
  componentDidUpdate(prevProps, prevState) {
    if (_.isEqual(prevProps.secretType, this.props.secretType)) {
      return;
    }
    let type;
    switch(this.props.secretType) {
      case 'source':
        type = 'kubernetes.io/basic-auth'
        break;
      case 'image':
        type = 'kubernetes.io/dockerconfigjson'
        break;
      case 'generic':
        type = 'Opaque'
        break;
    }
    this.setState({ authenticationType: type });
  }
  secretsAuthInputCallback = (secretsData) => {
    this.setState({
      authenticationData: secretsData
    }, () => this.props.callbackForMetadata(this.state));
  }
  render () {
    let options = []
    switch(this.props.secretType) {
      case "source":
        options.push(<option key='kubernetes.io/basic-auth' value='kubernetes.io/basic-auth'>Basic Authentication</option>)
        options.push(<option key='kubernetes.io/ssh-auth' value='kubernetes.io/ssh-auth'>SSH Key</option>)
        break;
      case "image":
        options.push(<option key='kubernetes.io/dockerconfigjson' value='kubernetes.io/dockerconfigjson'>Image Registry Credentials</option>)
        options.push(<option key='kubernetes.io/dockercfg' value='kubernetes.io/dockercfg'>Configuration File</option>)
        break;
    }


    let element = null;
    switch(this.state.authenticationType) {
      case 'kubernetes.io/basic-auth':
        element = <SecretBasicAuthenticationSubform callbackForInputData={this.secretsAuthInputCallback.bind(this)}/>
        break;
      case 'kubernetes.io/ssh-auth':
        element = <SecretSSHAuthenticationSubform callbackForInputData={this.secretsAuthInputCallback.bind(this)}/>
        break;
      case 'kubernetes.io/dockerconfigjson':
        element = <RegistryCredentialsAuthenticationSubform callbackForInputData={this.secretsAuthInputCallback.bind(this)}/>
        break;
      case 'kubernetes.io/dockercfg':
        element = <RegistryConfigFileAuthenticationSubform callbackForInputData={this.secretsAuthInputCallback.bind(this)}/>
        break;
    }
    return <React.Fragment>
      <div className="form-group">
        <label className="control-label">Authentication Type</label>
        <div className="modal-body__field">
          <select onChange={this.changeAuthenticationType} value={this.state.authenticationType} className="form-control">
            {options}
          </select>
        </div>
      </div>
      {element}
    </React.Fragment>;

  }
}

class GenericSecretSubform extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      authenticationType: 'Opaque',
      authenticationData: [[]],
    }
    this._updateValues = this._updateValues.bind(this);
  }
  _updateValues(tags) {
    // this.setState({
    //   authenticationData: tags.nameValuePairs
    // });
    this.setState({
      authenticationData: tags.nameValuePairs
    }, () => this.props.callbackForMetadata(this.state));
  }
  render () {
    return <div className="co-m-pane__body-group">
      <NameValueEditor nameValuePairs={this.state.authenticationData} updateParentData={this._updateValues} addString="Add Secret" nameString="Key" valueString="Secret" readOnly={false}/>
    </div>
  }
}

class WebhookSecretSubform extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      authenticationType: 'Opaque',
      authenticationData: {
        secretKey: ''
      },
    }
    this.changeSecretkey = this.changeSecretkey.bind(this);
  }
  changeSecretkey(event) {
    // this.setState({
    //   authenticationData: tags.nameValuePairs
    // });
    this.setState({
      authenticationData: {
        secretKey: event.target.value
      }
    }, () => this.props.callbackForMetadata(this.state));
  }
  render () {
    return <div className="form-group">
      <label className="control-label" htmlFor="webhook-secret-key">Webhook Secret Key</label>
      <div className="modal-body__field">
        <input className="form-control" id="webhook-secret-key" type="text" name="webhookSecretKey" onChange={this.changeSecretkey} value={this.state.authenticationData.secretKey} required/>
        <p className="help-block text-muted">Value of the secret will be supplied when invoking the webhook. </p>
      </div>
    </div>
  }
}

class SecretDataForm extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = secretsInitialMetadata;
    this.changeSecretType = this.changeSecretType.bind(this);
    this.changeSubjectName = this.changeSubjectName.bind(this);
  }
  changeSecretType (event) {
    this.setState({
      secretType: event.target.value
    }, () => this.props.callbackForMetadata(this.state));
  }
  changeSubjectName (event) {
    this.setState({
      secretName: event.target.value
    }, () => this.props.callbackForMetadata(this.state));
  }
  _updateValues(values) {
    this.setState({
      authenticationData: values.nameValuePairs
    });
  }
  secretsAuthdataCallback = (secretsData) => {
    this.setState({
      secretData: secretsData
    }, () => this.props.callbackForMetadata(this.state));
  }
  render () {
    let element = null;
    switch(this.state.secretType) {
      case 'source':
      case 'image':
        element = <SecretAuthenticationTypeSubform secretType={this.state.secretType} callbackForMetadata={this.secretsAuthdataCallback.bind(this)} />
        break;
      case 'generic':
        element = <GenericSecretSubform callbackForMetadata={this.secretsAuthdataCallback.bind(this)} />
        break;
      case 'webhook':
        element = <WebhookSecretSubform callbackForMetadata={this.secretsAuthdataCallback.bind(this)} />
        break;
    }
    return <React.Fragment>
      <div className="form-group">
        <label className="control-label">Secret Type</label>
        <div className="modal-body__field">
          <select onChange={this.changeSecretType} value={this.state.secretType} className="form-control">
            <option value='source'>Source Secret</option>
            <option value='image'>Image Secret</option>
            <option value='generic'>Generic Secret</option>
            <option value='webhook'>Wehook Secret</option>
          </select>
        </div>
      </div>      
      <div className="form-group">
        <label className="control-label">Secret Name</label>
        <div className="modal-body__field">
          <input className="form-control" type="text" onChange={this.changeSubjectName} value={this.state.secretName} required id="test--subject-name" />
          <p className="help-block text-muted">Unique name of the new secret.</p>
        </div>
      </div>
      {element}
    </React.Fragment>;
  }
}

const BaseEditSecret = connect(null, {setActiveNamespace: UIActions.setActiveNamespace})(
  class BaseEditSecret_ extends SafetyFirst {
    constructor (props) {
      super(props)
      const {kind, metadata } = this.props.fixed
      this.state = {
        kind: kind,
        namespace: metadata.namespace,
        data: secretsInitialMetadata,
        inProgress: false,
      };
      this.getAuthenticationOptions = this.getAuthenticationOptions.bind(this);
      this.save = this.save.bind(this);
    }
    dataCallback = (secretsData) => {
      this.setState({ data: secretsData });
      // this.setState({ inProgress: true });
    }
    getAuthenticationOptions(type) {
      const authTypes = type;
    }
    save (e) {
      e.preventDefault();
      const {kind, metadata } = this.props.fixed;
      console.log("SAVE!!!")
    }
    render () {
      const {kind, metadata} = this.props.fixed;
      const title = `${this.props.titleVerb} ${kindObj(kind).label}`;
      const {fixed, saveButtonText} = this.props;

      return <div className="co-m-pane__body">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        <form className="co-m-pane__body-group" onSubmit={this.save}>
          <h1 className="co-m-pane__heading">{title}</h1>
          <p className="co-m-pane__explanation">Secrets allow you to authenticate to a private Git repository, private image registry or a webhook trigger.</p>

          <SecretDataForm callbackForMetadata={this.dataCallback.bind(this)}/>

          <div className="separator"></div>
          <ButtonBar errorMessage={this.state.error} inProgress={this.state.inProgress}>
            <button type="submit" className="btn btn-primary" id="yaml-create">{saveButtonText || 'Create Secret'}</button>
            <Link to={formatNamespacedRouteForResource('secrets')} className="btn btn-default">Cancel</Link>
          </ButtonBar>
        </form>
      </div>
    }
  }
);

export const CreateSecret = ({match: {params}}) => <BaseEditSecret
  metadata={{
    namespace: getActiveNamespace(),
  }}
  fixed={{
    kind: 'Secret',
    metadata: {namespace: params.ns}
  }}
  isCreate={true}
  titleVerb="Create"
/>;


export {SecretsList, SecretsPage, SecretsDetailsPage};
