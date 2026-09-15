import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';
import { Alert } from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router';
import { PodConnectLoader } from '@console/internal/components/pod';
import { getBreadcrumbPath } from '@console/internal/components/utils/breadcrumbs';
import { ConnectedPageHeading } from '@console/internal/components/utils/headings';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { LoadingBox } from '@console/internal/components/utils/status-box';
import type { ContainerStatus, PodKind } from '@console/internal/module/k8s';
import { DocumentTitle } from '@console/shared/src/components/document-title/DocumentTitle';
import PaneBody from '@console/shared/src/components/layout/PaneBody';
import { resourcePath } from './utils/resource-link';

const EphemeralDebugTerminalError: FC<EphemeralDebugTerminalErrorProps> = ({
  error,
  description,
}) => (
  <PaneBody>
    <Alert variant="danger" isInline title={error}>
      {description ? <p>{description}</p> : null}
    </Alert>
  </PaneBody>
);

const getEphemeralContainerStatus = (
  pod: PodKind,
  debugContainerName: string,
): ContainerStatus | undefined =>
  pod?.status?.ephemeralContainerStatuses?.find((status) => status.name === debugContainerName);

const getTerminalPod = (pod: PodKind, debugContainerName: string): PodKind => ({
  ...pod,
  spec: {
    ...pod.spec,
    containers: [{ name: debugContainerName }],
    initContainers: [],
  },
});

export const EphemeralDebugTerminalPage: FC = () => {
  const { t } = useTranslation('public');
  const params = useParams();
  const { pathname: url } = useLocation();
  const { debugContainerName, name, ns, podName } = params;
  const [podData, loaded, err] = useK8sWatchResource<PodKind>({
    isList: false,
    kind: 'Pod',
    name: podName,
    namespace: ns,
  });

  const infoMessage = useMemo(
    () => (
      <Alert
        variant="warning"
        isInline
        title={t("Ephemeral containers can't be removed after they are created.")}
      />
    ),
    [t],
  );

  const terminalPod = useMemo(
    () =>
      loaded && podData && debugContainerName ? getTerminalPod(podData, debugContainerName) : null,
    [debugContainerName, loaded, podData],
  );

  let content: ReactNode = <LoadingBox />;
  if (err) {
    content = <EphemeralDebugTerminalError error={err.message || String(err)} />;
  } else if (loaded && podData && debugContainerName) {
    const containerStatus = getEphemeralContainerStatus(podData, debugContainerName);
    const terminatedMessage =
      containerStatus?.state?.terminated?.message ||
      containerStatus?.state?.terminated?.reason ||
      podData.status?.message;

    if (containerStatus?.state?.terminated) {
      content = (
        <EphemeralDebugTerminalError
          error={t('The debug container failed.')}
          description={terminatedMessage}
        />
      );
    } else if (containerStatus?.state?.running && terminalPod) {
      content = (
        <PodConnectLoader
          obj={terminalPod}
          attach
          initialContainer={debugContainerName}
          infoMessage={infoMessage}
        />
      );
    }
  }

  return (
    <div>
      <DocumentTitle>{t('Debug {{name}}', { name })}</DocumentTitle>
      <ConnectedPageHeading
        title={t('Debug {{name}}', { name })}
        kind="Pod"
        obj={{ data: podData }}
        breadcrumbs={[
          { name: t('Pods'), path: getBreadcrumbPath(params, 'pods') },
          {
            name: podName,
            path: resourcePath('Pod', podName, ns),
          },
          {
            name: t('Container details'),
            path: `${resourcePath('Pod', podName, ns)}/containers/${name}`,
          },
          { name: t('Debug container'), path: url },
        ]}
      />
      {content}
    </div>
  );
};

type EphemeralDebugTerminalErrorProps = {
  error: ReactNode;
  description?: string;
};
