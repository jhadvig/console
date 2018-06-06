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
import { SecretDataForm, WebhookSecretSubform, GenericSecretSubform, SecretAuthenticationTypeSubform, 
  RegistryCredentialsAuthenticationSubform, RegistryConfigFileAuthenticationSubform, 
  SecretSSHAuthenticationSubform , SecretBasicAuthenticationSubform} from './forms'

export const secretsInitialMetadata =  {
  secretType: 'source',
  secretName: '',
  secretData: null,
};

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