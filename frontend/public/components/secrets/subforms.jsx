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

export class SourceSecretSubform extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = this.state = {
      authenticationType: 'kubernetes.io/basic-auth',
      authenticationData: {
        username: '',
        password: '',
      },
    };
    this.changeData = this.changeData.bind(this);
    this.changeAuthenticationType = this.changeAuthenticationType.bind(this);
    this.changeAceData = _.debounce(this.changeAceData.bind(this), 300);
  }
  changeAuthenticationType(event) {
    this.setState({
      authenticationType: event.target.value
    }, () => this.props.callbackForMetadata(this.state));
  }
  changeData(event) {
    const updatedData = _.assign(this.state.authenticationData, {[event.target.name]: event.target.value})
    this.setState({
      authenticationData: updatedData
    }, () => this.props.callbackForMetadata(this.state));
  }
  changeAceData(value) {
    this.setState({
      authenticationData: {
        privateKey: value
      }
    }, () => this.props.callbackForMetadata(this.state));
  }
  render () {
    const basicAuthSubform = <React.Fragment>
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

    const sshAuthSubform = <div className="form-group">
      <label className="control-label" htmlFor="private-key">SSH Private Key</label>
      <div className="modal-body__field">
        <AceEditor
          mode="text"
          theme="github"
          onChange={this.changeAceData}
          name="private-key-editor"
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          height="300px"
          width="100%"
          value={this.state.authenticationData.privateKey}
          editorProps={{ $blockScrolling: true }}
          setOptions={{
            enableSnippets: false,
            showLineNumbers: true,
            tabSize: 2,
          }}
        />
        <p className="help-block text-muted">Private SSH key file for Git authentication.</p>
      </div>
    </div>;

    return <React.Fragment>
      <div className="form-group">
        <label className="control-label">Authentication Type</label>
        <div className="modal-body__field">
          <select onChange={this.changeAuthenticationType} value={this.state.authenticationType} className="form-control">
            <option key='kubernetes.io/basic-auth' value='kubernetes.io/basic-auth'>Basic Authentication</option>
            <option key='kubernetes.io/ssh-auth' value='kubernetes.io/ssh-auth'>SSH Key</option>
          </select>
        </div>
      </div>
      { this.state.authenticationType === 'kubernetes.io/basic-auth' ? basicAuthSubform : sshAuthSubform }
    </React.Fragment>
  }
}


export class ImageSecretSubform extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      authenticationType: 'kubernetes.io/dockerconfigjson',
      authenticationData: {
        serverAddress: '',
        username: '',
        password: '',
        email: '',
      },
      isValidJSON: true,
    }
    this.changeData = this.changeData.bind(this);
    this.changeAuthenticationType = this.changeAuthenticationType.bind(this);
    this.changeAceData = _.debounce(this.changeAceData.bind(this), 300);
  }
  changeAuthenticationType(event) {
    this.setState({
      authenticationType: event.target.value
    }, () => this.props.callbackForMetadata(this.state));
  }
  changeData(event) {
    const updatedData = _.assign(this.state.authenticationData, {[event.target.name]: event.target.value})
    this.setState({
      authenticationData: updatedData
    }, () => this.props.callbackForMetadata(this.state));
  }
  changeAceData(value) {
    try {
      JSON.parse(value);
      this.setState({ isValidJSON: true})
    } catch (e) {
      this.setState({ isValidJSON: false})
    }
    this.setState({
      authenticationData: {
        configuration: value
      }
    }, () => this.props.callbackForMetadata(this.state));
  }

  render () {
    const registryCredentials = <React.Fragment>
      <div className="form-group">
        <label className="control-label" htmlFor="username">Image Registry Server Address</label>
        <div className="modal-body__field">
          <input className="form-control" id="serverAddress" type="text" name="serverAddress" onChange={this.changeData.bind(this)} value={this.state.data} required/>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="username">Username</label>
        <div className="modal-body__field">
          <input className="form-control" id="username" type="text" name="username" onChange={this.changeData.bind(this)} value={this.state.data} required/>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="password">Password</label>
        <div className="modal-body__field">
          <input className="form-control" id="password" type="password" name="password" onChange={this.changeData.bind(this)} value={this.state.data} required/>
        </div>
      </div>
      <div className="form-group">
        <label className="control-label" htmlFor="password">Email</label>
        <div className="modal-body__field">
          <input className="form-control" id="email" type="email" name="email" onChange={this.changeData.bind(this)} value={this.state.data} required/>
        </div>
      </div>
    </React.Fragment>

    const registryConfig = <React.Fragment>
      <div className="form-group">
        <label className="control-label" htmlFor="private-key">Configuration File</label>
        <div className="modal-body__field">
          <AceEditor
            mode="json"
            theme="github"
            onChange={this.changeAceData}
            name="private-key-editor"
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            height="300px"
            width="100%"
            value={this.state.authenticationData.configuration}
            editorProps={{ $blockScrolling: Infinity }}
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

    return <React.Fragment>
      <div className="form-group">
        <label className="control-label">Authentication Type</label>
        <div className="modal-body__field">
          <select onChange={this.changeAuthenticationType} value={this.state.authenticationType} className="form-control">
            <option key='kubernetes.io/dockerconfigjson' value='kubernetes.io/dockerconfigjson'>Image Registry Credentials</option>
            <option key='kubernetes.io/dockercfg' value='kubernetes.io/dockercfg'>Configuration File</option>
          </select>
        </div>
      </div>
      { this.state.authenticationType === 'kubernetes.io/dockerconfigjson' ? registryCredentials : registryConfig }
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
