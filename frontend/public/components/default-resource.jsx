import * as _ from 'lodash-es';
import * as React from 'react';
import { connect } from 'react-redux';

import store from '../redux';
import { ColHead, DetailsPage, List, ListHeader, ListPage } from './factory';
import { fromNow } from './utils/datetime';
import { referenceFor, kindForReference } from '../module/k8s';
import {
  Cog,
  kindObj,
  navFactory,
  ResourceCog,
  ResourceLink,
  ResourceSummary,
  SectionHeading
} from './utils';

const { common } = Cog.factory;
const menuActions = [...common];

const computeColumnSizes = (columns) => {
  const columnsNumber = _.size(columns);
  const columnsSize = Math.floor(12 / columnsNumber);
  const fistColumnSize = 12 - (columnsSize * (columnsNumber-1));
  return {
    fistColumnSize,
    columnsSize
  };
};

const Header_ = props => {
  if (!_.get(props, 'additionalPrinterColumns')) {
    return null;
  }
  const additionalPrinterColumns = props.additionalPrinterColumns.toJSON();
  const { fistColumnSize, columnsSize } = computeColumnSizes(additionalPrinterColumns);
  const columnHeaders = _.map(additionalPrinterColumns, (column, index) => {
    return <ColHead {...props} key={index} className={index === 0 ? `col-xs-${fistColumnSize}` : `col-xs-${columnsSize}`} sortField={_.trimStart(column.JSONPath, '.')}>{column.name}</ColHead>;
  });
  return <ListHeader>
    {columnHeaders}
  </ListHeader>;
};

const stateToProps = ({k8s}) => {
  const additionalPrinterColumns = k8s.get('additionalPrinterColumns');
  return {additionalPrinterColumns};
};

const Header = connect(stateToProps)(Header_);

const RowForKind = kind => function RowForKind_ ({obj}) {
  let printerColumns = store.getState().k8s.get('additionalPrinterColumns');
  if (!printerColumns) {
    return null;
  }
  printerColumns = printerColumns.toJSON();
  const { fistColumnSize, columnsSize } = computeColumnSizes(printerColumns);
  const row = _.map(printerColumns, (column, index) => {
    if (index === 0 && column.name === 'Name') {
      return <div className={`col-xs-${fistColumnSize} co-resource-link-wrapper`} key={index}>
        <ResourceCog actions={menuActions} kind={referenceFor(obj) || kind} resource={obj} />
        <ResourceLink kind={kind} name={obj.metadata.name} namespace={obj.metadata.namespace} title={obj.metadata.name} />
      </div>;
    } else if (column.name === 'Namespace' && column.JSONPath === '.metadata.namespace') {
      return <div className={`col-xs-${columnsSize} co-break-word`} key={index}>
        <ResourceLink kind="Namespace" name={obj.metadata.namespace} title={obj.metadata.namespace} />
      </div>;
    }
    const data = _.get(obj, _.trimStart(column.JSONPath, '.'));
    return <div className={`col-xs-${columnsSize} co-break-word`} key={index}>
      { column.type === 'date' ? fromNow(data) : data }
    </div>;
  });
  return <div className="row co-resource-list__item">
    {row}
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

export const DefaultList = props => {
  const { kinds } = props;
  const Row = RowForKind(kinds[0]);
  Row.displayName = 'RowForKind';
  return <List {...props} Header={Header} Row={Row} />;
};
DefaultList.displayName = DefaultList;

export const DefaultPage = props =>
  <ListPage {...props} ListComponent={DefaultList} canCreate={props.canCreate || _.get(kindObj(props.kind), 'crd')} />;
DefaultPage.displayName = 'DefaultPage';


export const DefaultDetailsPage = props => {
  const pages = [navFactory.details(DetailsForKind(props.kind)), navFactory.editYaml()];
  return <DetailsPage {...props} menuActions={menuActions} pages={pages} />;
};
DefaultDetailsPage.displayName = 'DefaultDetailsPage';
