import * as _ from 'lodash-es';
import * as React from 'react';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import { k8sCreate, k8sUpdate } from '../../module/k8s';
import { ButtonBar, Firehose, history, kindObj, StatusBox } from '../utils';
import { getActiveNamespace, formatNamespacedRouteForResource, UIActions } from '../../ui/ui-actions';
import { SafetyFirst } from '../safety-first';
import { WebHookSecretSubform } from './subforms';

const determineSecretTypeAbstraction = (secret) => {
  const { type, data } = secret;
  switch (type) {
    case 'kubernetes.io/dockerconfigjson':
    case 'kubernetes.io/dockercfg':
      return 'image';
    case 'kubernetes.io/basic-auth':
    case 'kubernetes.io/ssh-auth':
      return 'source';
    case 'Opaque':
    case 'kubernetes.io/tls':
    case 'kubernetes.io/service-account-token':
      if (_.includes(_.keys(data), 'WebhookSecretKey')) {
        return 'webhook';
      }
      return 'generic';
    default:
      return 'generic';
  }
};

const BaseEditSecret = connect(null, {setActiveNamespace: UIActions.setActiveNamespace})(
  class BaseEditSecret_ extends SafetyFirst {
    constructor (props) {
      super(props);
      const kind = 'Secret';
      const existingData = _.pick(props.obj, ['metadata.name', 'metadata.namespace', 'data']);
      existingData.kind = kind;
      const secret = _.defaultsDeep({}, props.fixed, existingData, {
        apiVersion: 'v1',
        data: {},
        kind: 'Secret',
        metadata: {
          name: '',
        },
        type: 'Opaque',
      });

      this.state = {
        secretType: this.props.secretType || determineSecretTypeAbstraction(secret),
        secret: secret,
        inProgress: false,
        type: secret.type,
        stringData: _.mapValues(secret.data, (v) => window.atob(v)),
      };
      this.changeSecretName = this.changeSecretName.bind(this);
      this.save = this.save.bind(this);
    }
    dataCallback (secretsData) {
      let stringData = {...this.state.stringData};
      stringData = secretsData;
      this.setState({stringData});
    }
    changeSecretName (event) {
      let secret = {...this.state.secret};
      secret.metadata.name = event.target.value;
      this.setState({secret});
    }
    save (e) {
      e.preventDefault();
      const { kind, metadata } = this.state.secret;
      this.setState({ inProgress: true });
      const newSecretObject = _.assign(this.state.secret, {stringData: this.state.stringData});

      const ko = kindObj(kind);
      (this.props.isCreate
        ? k8sCreate(ko, newSecretObject)
        : k8sUpdate(ko, newSecretObject, metadata.namespace, newSecretObject.metadata.name)
      ).then(
        () => {
          this.setState({inProgress: false});
          if (metadata.namespace) {
            this.props.setActiveNamespace(metadata.namespace);
          }
          history.push(formatNamespacedRouteForResource('secrets'));
        },
        err => this.setState({error: err.message, inProgress: false})
      );
    }
    render () {
      const title = `${this.props.titleVerb} ${_.upperFirst(this.state.secretType)} Secret`;
      const { saveButtonText } = this.props;
      let subform, explanation = null;
      switch (this.state.secretType) {
        case 'source':
        case 'image':
        case 'generic':
        case 'webhook':
          explanation = 'Webhook secret allow you to authenticate a webhook trigger.';
          subform = <WebHookSecretSubform callbackForMetadata={this.dataCallback.bind(this)} stringData={this.state.stringData} />;
          break;
        default:
          break;
      }

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
              <div className="modal-body__field">
                <input className="form-control" type="text" onChange={this.changeSecretName} value={this.state.secret.metadata.name} required id="test--subject-name" />
                <p className="help-block text-muted">Unique name of the new secret.</p>
              </div>
            </div>
          </fieldset>
          {subform}
          <div className="separator"></div>
          <ButtonBar errorMessage={this.state.error} inProgress={this.state.inProgress}>
            <button type="submit" className="btn btn-primary" id="create-secret">{saveButtonText || 'Create'}</button>
            <Link to={formatNamespacedRouteForResource('secrets')} className="btn btn-default">Cancel</Link>
          </ButtonBar>
        </form>
      </div>;
    }
  }
);

const BindingLoadingWrapper = props => {
  const fixed = _.reduce(props.fixedKeys, (acc, k) => ({...acc, k: _.get(props.obj.data, k)}), {});
  return <StatusBox {...props.obj}>
    <BaseEditSecret {...props} obj={props.obj.data} fixed={fixed} />
  </StatusBox>;
};

export const CreateSecret = ({match: {params}}) => <BaseEditSecret
  metadata={{
    namespace: getActiveNamespace(),
  }}
  fixed={{
    kind: 'Secret',
    metadata: {namespace: params.ns},
  }}
  secretType={params.type}
  titleVerb="Create"
  isCreate={true}
/>;

export const EditSecret = ({match: {params}, kind}) => <Firehose resources={[{kind: kind, name: params.name, namespace: params.ns, isList: false, prop: 'obj'}]}>
  <BindingLoadingWrapper fixedKeys={['kind', 'metadata']} titleVerb="Edit" saveButtonText="Save Changes" />
</Firehose>;

export const CopySecret = ({match: {params}, kind}) => <Firehose resources={[{kind: kind, name: params.name, namespace: params.ns, isList: false, prop: 'obj'}]}>
  <BindingLoadingWrapper isCreate={true} titleVerb="Duplicate" />
</Firehose>;
