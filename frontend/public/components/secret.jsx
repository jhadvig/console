import * as _ from 'lodash-es';
import * as React from 'react';
import { Helmet } from 'react-helmet';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

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
import { CreateSecret } from './secrets/create-secret'
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

export {SecretsList, SecretsPage, SecretsDetailsPage};
