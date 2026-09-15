import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Action } from '@console/dynamic-plugin-sdk';
import { useOverlay } from '@console/dynamic-plugin-sdk/src/app/modal-support/useOverlay';
import { LazyEphemeralDebugModalOverlay } from '@console/internal/components/modals';
import { asAccessReview } from '@console/internal/components/utils/rbac';
import { PodModel } from '@console/internal/models';
import type { PodKind } from '@console/internal/module/k8s';
import { referenceFor } from '@console/internal/module/k8s';
import { isWindowsPod } from '@console/internal/module/k8s/pods';
import { useK8sModel } from '@console/shared/src/hooks/useK8sModel';
import { useCommonResourceActions } from '../hooks/useCommonResourceActions';

export const usePodActionsProvider = (resource: PodKind) => {
  const { t } = useTranslation('public');
  const launchModal = useOverlay();
  const [kindObj, inFlight] = useK8sModel(referenceFor(resource));
  const commonActions = useCommonResourceActions(kindObj, resource);

  const podActions = useMemo<Action[]>(() => {
    if (resource?.status?.phase !== 'Running' || isWindowsPod(resource)) {
      return [];
    }

    return [
      {
        id: 'debug-ephemeral-container',
        label: t('Debug container'),
        cta: () => launchModal(LazyEphemeralDebugModalOverlay, { resource }),
        accessReview: asAccessReview(PodModel, resource, 'patch', 'ephemeralcontainers'),
      },
    ];
  }, [launchModal, resource, t]);

  const actions = useMemo(() => [...podActions, ...commonActions], [commonActions, podActions]);

  return [actions, !inFlight, undefined];
};
