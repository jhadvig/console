import * as _ from 'lodash-es';
import * as React from 'react';

export class WebHookSecretSubform extends React.PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      WebHookSecretKey: this.props.stringData.WebHookSecretKey || '' ,
    }
    this.changeWebHookSecretkey = this.changeWebHookSecretkey.bind(this);
    this.generateWebHookSecret = this.generateWebHookSecret.bind(this);
  }
  changeWebHookSecretkey(event) {
    this.setState({
      WebHookSecretKey: event.target.value
    }, () => this.props.callbackForMetadata(this.state));
  }
  generateWebHookSecret() {
    this.setState({
      WebHookSecretKey: generateSecret()
    }, () => this.props.callbackForMetadata(this.state));
  }
  render () {
    return <React.Fragment>
      <div className="form-group">
        <label className="control-label" htmlFor="webhook-secret-key">Webhook Secret Key</label>
        <div className="input-group modal-body__field">
          <input className="form-control" id="webhook-secret-key" type="text" name="webhookSecretKey" onChange={this.changeWebHookSecretkey} value={this.state.WebHookSecretKey} required/>
          <span className="input-group-btn">
            <button type="button" onClick={this.generateWebHookSecret} className="btn btn-default">Generate</button>
          </span>
        </div>
        <p className="help-block text-muted">Value of the secret will be supplied when invoking the webhook. </p>
      </div>
    </React.Fragment>;
  }
}

const generateSecret = () => {
  //http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
  return s4()+s4()+s4()+s4();
}