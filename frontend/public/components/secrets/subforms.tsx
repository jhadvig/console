import * as React from 'react';

const generateSecret = () => {
  // http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4()+s4()+s4()+s4();
};

export class WebHookSecretSubform extends React.Component<WebHookSecretSubformProps, WebHookSecretSubformState> {
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

/* eslint-disable no-undef */
export type WebHookSecretSubformState = {
  WebHookSecretKey: string;
};

export type WebHookSecretSubformProps = {
  onChange: Function;
  stringData: {[WebHookSecretKey: string]: string};
};
/* eslint-enable no-undef */
