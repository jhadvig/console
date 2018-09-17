import * as _ from 'lodash-es';
import { Map as ImmutableMap, fromJS } from 'immutable';

import { types } from './crd-actions';

export default (state: ImmutableMap<string, any>, action) => {
  if (!state) {
    return fromJS({CRD_LIST: []});
  }

  switch (action.type) {
    case types.initiate:
      return state.setIn(['CRD_LIST', 'inFlight'], true);
    case types.crdList:
      return state;
      // return action.resources.models
      //   .filter(model => !state.getIn(['RESOURCES', 'models']).has(referenceForModel(model)))
      //   .filter(model => {
      //     const existingModel = state.getIn(['RESOURCES', 'models', model.kind]);
      //     return !existingModel || referenceForModel(existingModel) !== referenceForModel(model);
      //   })
      //   .map(model => {
      //     model.namespaced ? namespacedResources.add(referenceForModel(model)) : namespacedResources.delete(referenceForModel(model));
      //     return model;
      //   })
      //   .reduce((prevState, newModel) => {
      //     // FIXME: Need to use `kind` as model reference for legacy components accessing k8s primitives
      //     const [modelRef, model] = allModels().findEntry(staticModel => !staticModel.crd && referenceForModel(staticModel) === referenceForModel(newModel))
      //       || [referenceForModel(newModel), newModel];
      //     return prevState.updateIn(['RESOURCES', 'models'], models => models.set(modelRef, model));
      //   }, state)
      //   // TODO: Determine where these are used and implement filtering in that component instead of storing in Redux
      //   .setIn(['RESOURCES', 'allResources'], action.resources.allResources)
      //   .setIn(['RESOURCES', 'safeResources'], action.resources.safeResources)
      //   .setIn(['RESOURCES', 'adminResources'], action.resources.adminResources)
      //   .setIn(['RESOURCES', 'namespacedSet'], action.resources.namespacedSet)
      //   .setIn(['RESOURCES', 'preferredVersions'], action.resources.preferredVersions)
      //   .setIn(['RESOURCES', 'inFlight'], false);


    default:
      return state;
  }
}