import * as _ from 'lodash-es';
import * as React from 'react';
import { connect } from 'react-redux';

import { ColHead, DetailsPage, List, ListHeader, ListPage } from './factory';
import { fromNow } from './utils/datetime';
import { referenceFor, kindForReference } from '../module/k8s';
import { ResourceOverviewHeading } from './overview';
import { connectToModel } from '../kinds';
import {
  Cog,
  kindObj,
  navFactory,
  ResourceCog,
  ResourceLink,
  ResourceSummary,
  SectionHeading
} from './utils';


const menuActions = [Cog.factory.ModifyLabels, Cog.factory.ModifyAnnotations, Cog.factory.Edit, Cog.factory.Delete];

const Header = props => {
  console.log(props)
  return <ListHeader>
    <ColHead {...props} className="col-xs-6 col-sm-4" sortField="metadata.name">Name</ColHead>
    <ColHead {...props} className="col-xs-6 col-sm-4" sortField="metadata.namespace">Namespace</ColHead>
    <ColHead {...props} className="col-sm-4 hidden-xs" sortField="metadata.creationTimestamp">Created</ColHead>
  </ListHeader>;
};

const CustomHeader_ = props => {
  console.log(props)
  const columnsExtension = _.get(props, ['consoleExtensions'])[0].spec.additionalPrinterColumns;
  const columnsNumber = _.size(columnsExtension) + 1;
  const columnsSize = Math.floor(12 / columnsNumber);
  const builtColumns = _.map(columnsExtension, ext => {
    return <ColHead {...props} key={_.uniqueId()} className={"col-xs-" + columnsSize} sortField={ext.JSONPath.substr(1)}>{ext.name}</ColHead>
  })
  return <ListHeader>
    <ColHead {...props} className={"col-xs-" + columnsSize} sortField="metadata.name">Name</ColHead>
    {builtColumns}
  </ListHeader>;
};

const stateToProps = ({k8s}) => {
  const consoleExtensions = k8s.getIn(['consoleextensions', 'data']).toArray().map(p => p.toJSON());
  return {consoleExtensions};
}

const CustomHeader = connect(stateToProps)(CustomHeader_);


const RowForKind = kind => function RowForKind_ ({obj}) {
  return <div className="row co-resource-list__item">
    <div className="col-xs-6 col-sm-4 co-resource-link-wrapper">
      <ResourceCog actions={menuActions} kind={referenceFor(obj) || kind} resource={obj} />
      <ResourceLink kind={kind} name={obj.metadata.name} namespace={obj.metadata.namespace} title={obj.metadata.name} />
    </div>
    <div className="col-xs-6 col-sm-4 co-break-word">
      { obj.metadata.namespace
        ? <ResourceLink kind="Namespace" name={obj.metadata.namespace} title={obj.metadata.namespace} />
        : 'None'
      }
    </div>
    <div className="col-xs-6 col-sm-4 hidden-xs">
      { fromNow(obj.metadata.creationTimestamp) }
    </div>
  </div>;
};

const DetailsForKind = kind => function DetailsForKind_ ({obj}) {
  return <React.Fragment>
    <div className="co-m-pane__body">
      <SectionHeading text={`${kindForReference(kind)} Overview`} />
      <ResourceSummary resource={obj} podSelector="spec.podSelector" showNodeSelector={false} />
    </div>
  </React.Fragment>;
};

const DefaultList_ = props => {
  const { kinds } = props;

  let additionalColumns =  [];
  let extension = {};
  _.each(props.consoleExtensions, ext => {
    if (ext.spec.reference === props.kinds[0]) {
      additionalColumns = ext.spec.additionalPrinterColumns;
      extension = ext;
    }
  });

  const Row = RowForKind(kinds[0]);
  Row.displayName = 'RowForKind';
  return <List {...props} Header={Header} Row={Row} />; 

  // if (_.isEmpty(additionalColumns)) {
  //   const Row = RowForKind(kinds[0]);
  //   Row.displayName = 'RowForKind';
  //   return <List {...props} Header={Header} Row={Row} />; 
  // }
  // // const customHeader = <CustomHeader {...props} />;
  // const Row = RowForKind(kinds[0]);
  // Row.displayName = 'RowForKind';
  // return <List {...props} Header={CustomHeader} Row={Row} />;  
};

const consoleExtensionsStateToProps = ({k8s}) => {
  const consoleExtensions = k8s.getIn(['consoleextensions', 'data']).toArray().map(p => p.toJSON());
  return {consoleExtensions};
}

export const DefaultList = connect(consoleExtensionsStateToProps)(DefaultList_);

DefaultList.displayName = DefaultList;

export const DefaultPage = props => {
  return <ListPage {...props} ListComponent={DefaultList} canCreate={props.canCreate || _.get(kindObj(props.kind), 'crd')} />;
}

DefaultPage.displayName = 'DefaultPage';


export const DefaultDetailsPage = props => {
  const pages = [navFactory.details(DetailsForKind(props.kind)), navFactory.editYaml()];
  return <DetailsPage {...props} menuActions={menuActions} pages={pages} />;
};

export const DefaultOverviewPage = connectToModel( ({kindObj: kindObject, resource}) =>
  <div className="co-m-pane resource-overview">
    <ResourceOverviewHeading
      actions={menuActions}
      kindObj={kindObject}
      resource={resource}
    />
    <div className="co-m-pane__body resource-overview__body">
      <div className="resource-overview__summary">
        <ResourceSummary resource={resource} />
      </div>
    </div>
  </div>
);

DefaultDetailsPage.displayName = 'DefaultDetailsPage';
