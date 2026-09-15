import { act, renderHook } from '@testing-library/react';
import { useOverlay } from '@console/dynamic-plugin-sdk/src/app/modal-support/useOverlay';
import { LazyEphemeralDebugModalOverlay } from '@console/internal/components/modals';
import type { PodKind } from '@console/internal/module/k8s';
import { useK8sModel } from '@console/shared/src/hooks/useK8sModel';
import { usePodActionsProvider } from '../pod-provider';

jest.mock('@console/dynamic-plugin-sdk/src/app/modal-support/useOverlay', () => ({
  useOverlay: jest.fn(),
}));

jest.mock('@console/internal/components/modals', () => ({
  LazyEphemeralDebugModalOverlay: Symbol('LazyEphemeralDebugModalOverlay'),
}));

jest.mock('@console/internal/components/utils/rbac', () => ({
  asAccessReview: jest.fn(() => ({ verb: 'patch', subresource: 'ephemeralcontainers' })),
}));

jest.mock('@console/internal/module/k8s', () => ({
  referenceFor: jest.fn(() => 'core~v1~Pod'),
}));

jest.mock('@console/internal/module/k8s/pods', () => ({
  isWindowsPod: jest.fn((pod) =>
    pod?.spec?.tolerations?.some((t) => t.key === 'os' && t.value === 'Windows'),
  ),
}));

jest.mock('@console/shared/src/hooks/useK8sModel', () => ({
  useK8sModel: jest.fn(),
}));

jest.mock('../../hooks/useCommonResourceActions', () => ({
  useCommonResourceActions: jest.fn(() => [{ id: 'delete-resource', label: 'Delete' }]),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const useOverlayMock = useOverlay as jest.Mock;
const useK8sModelMock = useK8sModel as jest.Mock;
const launchModalMock = jest.fn();

const runningPod: PodKind = {
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: { name: 'mypod', namespace: 'myns' },
  spec: { containers: [{ name: 'app' }] },
  status: { phase: 'Running' },
};

describe('usePodActionsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOverlayMock.mockReturnValue(launchModalMock);
    useK8sModelMock.mockReturnValue([
      { kind: 'Pod', plural: 'pods', apiGroup: '', namespaced: true },
      false,
    ]);
  });

  it('should prepend the debug container action for running pods', () => {
    const { result } = renderHook(() => usePodActionsProvider(runningPod));
    const [actions] = result.current;

    expect(actions[0]).toEqual(
      expect.objectContaining({
        id: 'debug-ephemeral-container',
        label: 'Debug container',
      }),
    );
    expect(actions[1]).toEqual(expect.objectContaining({ id: 'delete-resource' }));
  });

  it('should launch the ephemeral debug modal when the action is invoked', async () => {
    const { result } = renderHook(() => usePodActionsProvider(runningPod));
    const [actions] = result.current;

    await act(async () => {
      await (actions[0].cta as () => Promise<void>)();
    });

    expect(launchModalMock).toHaveBeenCalledWith(LazyEphemeralDebugModalOverlay, {
      resource: runningPod,
    });
  });

  it('should not add the debug action for non-running pods', () => {
    const { result } = renderHook(() =>
      usePodActionsProvider({
        ...runningPod,
        status: { phase: 'Pending' },
      }),
    );
    const [actions] = result.current;

    expect(actions).toEqual([expect.objectContaining({ id: 'delete-resource' })]);
  });

  it('should not add the debug action for windows pods', () => {
    const { result } = renderHook(() =>
      usePodActionsProvider({
        ...runningPod,
        spec: {
          ...runningPod.spec,
          tolerations: [{ key: 'os', value: 'Windows', effect: 'NoSchedule', operator: 'Equal' }],
        },
      }),
    );
    const [actions] = result.current;

    expect(actions).toEqual([expect.objectContaining({ id: 'delete-resource' })]);
  });
});
