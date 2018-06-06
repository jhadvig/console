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

import { secretsInitialMetadata } from './create-secret';
// import { Cog, ResourceCog, ResourceLink, ResourceSummary, detailsPage, navFactory } from './utils';
import { ButtonBar, Cog, Dropdown, Firehose, history, kindObj, LoadingInline, MsgBox,
  OverflowYFade, ResourceCog, ResourceName, ResourceLink, ResourceSummary, detailsPage, navFactory,
  resourceObjPath, StatusBox, getQueryArgument } from './utils';
import { getActiveNamespace, formatNamespacedRouteForResource, UIActions } from './../ui/ui-actions';
import { fromNow } from './utils/datetime';
import { SafetyFirst } from './safety-first';
import { registerTemplate } from '../yaml-templates';
import { NameValueEditor, NAME, VALUE } from '../utils/name-value-editor';

export class SecretDataForm extends React.PureComponent {
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

export class SecretBasicAuthenticationSubform extends React.PureComponent {
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

export class SecretSSHAuthenticationSubform extends React.PureComponent {
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

export class RegistryConfigFileAuthenticationSubform extends React.PureComponent {
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



export class RegistryCredentialsAuthenticationSubform extends React.PureComponent {
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


export class SecretAuthenticationTypeSubform extends React.PureComponent {
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

export class GenericSecretSubform extends React.PureComponent {
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

export class WebhookSecretSubform extends React.PureComponent {
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