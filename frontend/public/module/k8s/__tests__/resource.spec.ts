import * as coFetchModule from '@console/shared/src/utils/console-fetch';
import type { K8sKind, PodKind } from '../types';
import { k8sStrategicMergePatch } from '../resource';

jest.mock('@console/shared/src/utils/console-fetch', () => ({
  ...jest.requireActual('@console/shared/src/utils/console-fetch'),
  coFetchJSON: jest.fn(),
}));

const spyCoFetchJSON = jest.mocked(coFetchModule.coFetchJSON);

describe('resource', () => {
  const mockPodModel: K8sKind = {
    apiVersion: 'v1',
    label: 'Pod',
    plural: 'pods',
    abbr: 'P',
    namespaced: true,
    kind: 'Pod',
    id: 'pod',
    labelPlural: 'Pods',
  };

  const mockPod = {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: 'my-pod',
      namespace: 'my-namespace',
    },
    spec: {
      containers: [],
    },
  } as PodKind;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send a strategic merge patch to the requested subresource', async () => {
    const patch = {
      spec: {
        ephemeralContainers: [
          {
            name: 'debugger',
            image: 'registry.redhat.io/rhel9/support-tools',
          },
        ],
      },
    };

    spyCoFetchJSON.mockReturnValueOnce(Promise.resolve(mockPod));

    await k8sStrategicMergePatch(mockPodModel, mockPod, patch, { path: 'ephemeralcontainers' });

    expect(spyCoFetchJSON).toHaveBeenCalledTimes(1);
    expect(spyCoFetchJSON).toHaveBeenCalledWith(
      '/api/kubernetes/api/v1/namespaces/my-namespace/pods/my-pod/ephemeralcontainers',
      'PATCH',
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/strategic-merge-patch+json;charset=UTF-8',
        },
        body: JSON.stringify(patch),
      },
    );
  });
});
