// import { coFetchJSON } from '../../co-fetch';
// import { Map as ImmutableMap } from 'immutable';
import { CustomResourceDefinitionModel } from '../../models';
import { k8sList } from '../k8s/resource';

const types = {
  initiate: 'initiate',
  crdList: 'crdList',
}

const getList = async () => {
  const response = await k8sList(CustomResourceDefinitionModel, {}, true);
  return response;
};


const actions = {
  getCRDs: () => dispatch => {
    dispatch({type: types.initiate})
    return dispatch({type: types.crdList, items: getList()});
  }
};

export {types};
export default actions;