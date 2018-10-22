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

const computeColumnSizes = (columns, isResourceNamespaced) => {
  const columnsNumber = isResourceNamespaced ? _.size(columns) + 1 : _.size(columns);
  const columnsSize = Math.floor(12 / columnsNumber);
  const fistColumnSize = 12 - (columnsSize * (columnsNumber-1));
  return {
    fistColumnSize,
    columnsSize
  };
};

const Header_ = props => {
  if (!_.get(props, 'tableHeader')) {
    return null;
  }
  const { tableHeader } = props;
  const { fistColumnSize, columnsSize } = computeColumnSizes(tableHeader);
  const columnHeaders = _.map(tableHeader, (column, index) => {
    if (index === 0) {
      return <ColHead {...props} key={index} className={`col-xs-${fistColumnSize}`} sortField={`metadata.${_.lowerFirst(column.name)}`}>{column.name}</ColHead>;
    }
    return <ColHead {...props} key={index} className={`col-xs-${columnsSize}`} sortField={`metadata.${_.lowerFirst(column.name)}`}>{column.name}</ColHead>;
  });
  return <ListHeader>
    {columnHeaders}
  </ListHeader>;
};

const stateToProps = ({k8s}) => {
  const tableHeader = k8s.get('tableHeader').toJSON();
  return {tableHeader};
};

const Header = connect(stateToProps)(Header_);

// const RowForKind = (kind, rows, isNamespaced) => function RowForKind_ ({obj, index}) {
//   if (!rows || !rows[index]) {
//     return null;
//   }
//   const row = rows[index];
//   const { cells } = row;
//   const namespace = _.get(row, 'object.metadata.namespace');
//   const { fistColumnSize, columnsSize } = computeColumnSizes(cells, isNamespaced);
//   const renderedRows = _.map(cells, (column, i) => {
//     if (i === 0 ) {
//       return <div key={i} className={`col-xs-${fistColumnSize} co-resource-link-wrapper`}>
//         <ResourceCog actions={menuActions} kind={referenceFor(obj) || kind} resource={obj} />
//         <ResourceLink kind={kind} name={obj.metadata.name} namespace={obj.metadata.namespace} title={obj.metadata.name} />
//       </div>;
//     }
//     return <div key={isNamespaced ? i + 1 : i} className={`col-xs-${columnsSize} co-break-word`}>{column}</div>;
//   });
//   isNamespaced && renderedRows.splice(1, 0, (<div key={1} className={`col-xs-${columnsSize} co-break-word`}>{namespace}</div>));
//   return <div className="row co-resource-list__item">
//     {renderedRows}
//   </div>;
// };
const RowForKind = kind => function RowForKind_ ({obj}) {
  const tableHeader = store.getState().k8s.get('tableHeader').toJSON();
  if (!tableHeader) {
    return null;
  }
  const { fistColumnSize, columnsSize } = computeColumnSizes(tableHeader);

  const rows = _.map(tableHeader, (column, index) => {
    if (index === 0 && column.name === "Name") {
      return <div className={`col-xs-${fistColumnSize} co-resource-link-wrapper`} key={index}>
        <ResourceCog actions={menuActions} kind={referenceFor(obj) || kind} resource={obj} />
        <ResourceLink kind={kind} name={obj.metadata.name} namespace={obj.metadata.namespace} title={obj.metadata.name} />
      </div>;
    } else if (index === 1 && column.name === "Namespace") {
      return <div className={`col-xs-${columnsSize} co-break-word`} key={index}>
        { obj.metadata.namespace
          ? <ResourceLink kind="Namespace" name={obj.metadata.namespace} title={obj.metadata.namespace} />
          : 'None'
        }
      </div>;
    } else {
      const field = _.lowerFirst(column.name)
      return <div className={`col-xs-${columnsSize} co-break-word`} key={index}>
        { obj.metadata[field] }
      </div>
    }
  });
  return <div className="row co-resource-list__item">
    {rows}
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
  return <List {...props} Header={Header} Row={Row} kindObj={kindObj(kinds[0])}/>;
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
