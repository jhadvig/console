import { k8sGet, k8sStrategicMergePatch } from '../../module/k8s';
import type { PodKind } from '../../module/k8s';
import {
  addEphemeralDebugContainer,
  getDebugImage,
  getEphemeralDebugContainerName,
  getEphemeralDebugTerminalPath,
} from '../pod-debug-utils';

jest.mock('../../module/k8s', () => ({
  k8sGet: jest.fn(),
  k8sStrategicMergePatch: jest.fn(),
}));

const k8sGetMock = k8sGet as jest.Mock;
const k8sStrategicMergePatchMock = k8sStrategicMergePatch as jest.Mock;

const pod: PodKind = {
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: {
    name: 'my-pod',
    namespace: 'my-namespace',
  },
  spec: {
    containers: [{ name: 'app' }, { name: 'debugger' }],
    initContainers: [],
    ephemeralContainers: [{ name: 'debugger-1' }],
  },
};

describe('pod-debug-utils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the tools image when available', async () => {
    k8sGetMock.mockResolvedValue({
      image: { dockerImageReference: 'quay.io/example/debug:latest' },
    });

    await expect(getDebugImage()).resolves.toBe('quay.io/example/debug:latest');
  });

  it('should fall back to the support-tools image when imagestream lookup fails', async () => {
    k8sGetMock.mockRejectedValue(new Error('not found'));

    await expect(getDebugImage()).resolves.toBe('registry.redhat.io/rhel8/support-tools');
  });

  it('should generate a unique debug container name', () => {
    expect(getEphemeralDebugContainerName(pod)).toBe('debugger-2');
  });

  it('should add an ephemeral debug container via strategic merge patch', async () => {
    k8sStrategicMergePatchMock.mockResolvedValue(pod);

    const result = await addEphemeralDebugContainer(
      pod,
      'app',
      'registry.redhat.io/rhel8/support-tools',
    );

    expect(k8sStrategicMergePatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'Pod' }),
      pod,
      {
        spec: {
          ephemeralContainers: [
            {
              command: ['/bin/sh'],
              image: 'registry.redhat.io/rhel8/support-tools',
              name: 'debugger-2',
              stdin: true,
              targetContainerName: 'app',
              tty: true,
            },
          ],
        },
      },
      { path: 'ephemeralcontainers' },
    );
    expect(result.debugContainer.name).toBe('debugger-2');
  });

  it('should build the terminal route for the new debug container', () => {
    expect(getEphemeralDebugTerminalPath(pod, 'app', 'debugger-2')).toBe(
      '/k8s/ns/my-namespace/pods/my-pod/containers/app/ephemeral-debug/debugger-2',
    );
  });
});
