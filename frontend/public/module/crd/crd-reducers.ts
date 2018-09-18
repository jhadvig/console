import * as _ from 'lodash-es';
import { Map as ImmutableMap, fromJS } from 'immutable';

import { types } from './crd-actions';

const sortCRDs = (crdList) => {
  const scopeList = {
    namespaced: [],
    cluster: [],
  }
  _.each(crdList, crd => {
    crd.spec.scope === 'Namespaced' ? scopeList.namespaced.push(crd) : scopeList.cluster.push(crd);
  })
  return scopeList;
}

export default (state: ImmutableMap<string, any>, action) => {
  if (!state) {
    return fromJS({CRD_LIST: []});
  }

  switch (action.type) {
    case types.initiate:
      return state.setIn(['inFlight'], true);
    case types.crdList:
      return state.setIn(['inFlight'], false)
        .setIn(['sortedCrds'], sortCRDs(action.items.items));
    default:
      return state;
  }
}