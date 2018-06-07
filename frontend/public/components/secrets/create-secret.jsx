import * as _ from 'lodash-es';
import * as React from 'react';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

// import { Cog, ResourceCog, ResourceLink, ResourceSummary, detailsPage, navFactory } from './utils';
import { ButtonBar, Cog, Dropdown, Firehose, history, kindObj, LoadingInline, MsgBox,
  OverflowYFade, ResourceCog, ResourceName, ResourceLink, ResourceSummary, detailsPage, navFactory,
  resourceObjPath, StatusBox, getQueryArgument } from '../utils';
import { getActiveNamespace, formatNamespacedRouteForResource, UIActions } from '../../ui/ui-actions';
import { SafetyFirst } from '../safety-first';
import { SourceSecretSubform, ImageSecretSubform, SecretDataForm, WebhookSecretSubform, GenericSecretSubform, SecretAuthenticationTypeSubform, 
  RegistryCredentialsAuthenticationSubform, RegistryConfigFileAuthenticationSubform, 
  SecretSSHAuthenticationSubform , SecretBasicAuthenticationSubform} from './subforms'

export const secretsInitialMetadata =  {
  secretType: 'source',
  secretName: '',
  secretData: null,
};

const BaseEditSecret = connect(null, {setActiveNamespace: UIActions.setActiveNamespace})(
  class BaseEditSecret_ extends SafetyFirst {
    constructor (props) {
      super(props)
      const {kind, namespace } = this.props
      this.state = {
        kind: kind,
        namespace: namespace,
        secretType: 'source',
        secretName: '',
        data: {},
        inProgress: false,
      };
      this.getAuthenticationOptions = this.getAuthenticationOptions.bind(this);
      this.changeSecretType = this.changeSecretType.bind(this);
      this.changeSubjectName = this.changeSubjectName.bind(this);
      this.save = this.save.bind(this);
    }
    dataCallback = (secretsData) => {
      this.setState({ data: secretsData });
      // this.setState({ inProgress: true });
    }
    getAuthenticationOptions(type) {
      const authTypes = type;
    }
    changeSecretType (event) {
      this.setState({secretType: event.target.value});
    }
    changeSubjectName (event) {
      this.setState({secretName: event.target.value});
    }
    save (e) {
      e.preventDefault();
      const {kind, namespace } = this.props;
      console.log("SAVE!!!")
    }
    render () {
      const {kind, namespace} = this.props;
      const title = `${this.props.titleVerb} ${kindObj(kind).label}`;
      // const {fixed, saveButtonText} = this.props;
      let subform = null;
      switch(this.state.secretType) {
        case 'source':
          subform = <SourceSecretSubform callbackForMetadata={this.dataCallback.bind(this)} />
          break;
        case 'image':
          subform = <ImageSecretSubform callbackForMetadata={this.dataCallback.bind(this)} />
          break;
        case 'generic':
          subform = <GenericSecretSubform callbackForMetadata={this.dataCallback.bind(this)} />
          break;
        case 'webhook':
          subform = <WebhookSecretSubform callbackForMetadata={this.dataCallback.bind(this)} />
          break;
      }

      return <div className="co-m-pane__body">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        <form className="co-m-pane__body-group" onSubmit={this.save}>
          <h1 className="co-m-pane__heading">{title}</h1>
          <p className="co-m-pane__explanation">Secrets allow you to authenticate to a private Git repository, private image registry or a webhook trigger.</p>

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

          {subform}

          <div className="separator"></div>
          <ButtonBar errorMessage={this.state.error} inProgress={this.state.inProgress}>
            <button type="submit" className="btn btn-primary" id="create-secret">Create Secret</button>
            <Link to={formatNamespacedRouteForResource('secrets')} className="btn btn-default">Cancel</Link>
          </ButtonBar>
        </form>
      </div>
    }
  }
);

// const BaseEditSecret = connect(null, {setActiveNamespace: UIActions.setActiveNamespace})(
//   class BaseEditSecret_ extends SafetyFirst {
//     constructor (props) {
//       super(props)
//       const {kind, namespace } = this.props
//       this.state = {
//         kind: kind,
//         namespace: namespace,
//         data: secretsInitialMetadata,
//         inProgress: false,
//       };
//       this.getAuthenticationOptions = this.getAuthenticationOptions.bind(this);
//       this.save = this.save.bind(this);
//     }
//     dataCallback = (secretsData) => {
//       this.setState({ data: secretsData });
//       // this.setState({ inProgress: true });
//     }
//     getAuthenticationOptions(type) {
//       const authTypes = type;
//     }
//     save (e) {
//       e.preventDefault();
//       const {kind, namespace } = this.props;
//       console.log("SAVE!!!")
//     }
//     render () {
//       const {kind, namespace} = this.props;
//       const title = `${this.props.titleVerb} ${kindObj(kind).label}`;
//       // const {fixed, saveButtonText} = this.props;

//       return <div className="co-m-pane__body">
//         <Helmet>
//           <title>{title}</title>
//         </Helmet>
//         <form className="co-m-pane__body-group" onSubmit={this.save}>
//           <h1 className="co-m-pane__heading">{title}</h1>
//           <p className="co-m-pane__explanation">Secrets allow you to authenticate to a private Git repository, private image registry or a webhook trigger.</p>

//           <SecretDataForm callbackForMetadata={this.dataCallback.bind(this)}/>

//           <div className="separator"></div>
//           <ButtonBar errorMessage={this.state.error} inProgress={this.state.inProgress}>
//             <button type="submit" className="btn btn-primary" id="create-secret">Create Secret</button>
//             <Link to={formatNamespacedRouteForResource('secrets')} className="btn btn-default">Cancel</Link>
//           </ButtonBar>
//         </form>
//       </div>
//     }
//   }
// );

export const CreateSecret = ({match: {params}}) => <BaseEditSecret
  metadata={{namespace: params.ns || getActiveNamespace()}}
  kind='Secret'
  titleVerb="Create"
/>;
