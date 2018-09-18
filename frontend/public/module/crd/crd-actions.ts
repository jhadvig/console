// import { coFetchJSON } from '../../co-fetch';
// import { Map as ImmutableMap } from 'immutable';
import { CustomResourceDefinitionModel } from '../../models';
import { k8sList } from '../k8s/resource';
import { getActiveNamespace } from '../../ui/ui-actions'

export const formatNamespacedRouteForResource = (resource, activeNamespace=getActiveNamespace()) => {
  const crdRef = referenceForCRD(crd)
  return activeNamespace === ALL_NAMESPACES_KEY
    ? `/k8s/all-namespaces/customresourcedefinitions/${crdRef}`
    : `/k8s/ns/${activeNamespace}/customresourcedefinitions/${crdRef}`;
};

const types = {
  initiate: 'initiate',
  crdList: 'crdList',
}

const actions = {
  getCRDs: () => dispatch => {
    dispatch({type: types.initiate})
    k8sList(CustomResourceDefinitionModel, {}, true).then((response) => {
      dispatch({type: types.crdList, items: response});
    });
  }
};

export {types};
export default actions;