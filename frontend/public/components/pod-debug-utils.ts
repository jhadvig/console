import * as _ from 'lodash';
import { ImageStreamTagModel, PodModel } from '../models';
import { k8sGet, k8sStrategicMergePatch } from '../module/k8s';
import type { PodKind } from '../module/k8s';
import { isWindowsPod } from '../module/k8s/pods';

const defaultDebugImage = 'registry.redhat.io/rhel8/support-tools';
const defaultDebugContainerName = 'debugger';

const getContainerNames = (pod: PodKind): string[] =>
  [
    ..._.map(pod?.spec?.containers, 'name'),
    ..._.map(pod?.spec?.initContainers, 'name'),
    ..._.map(pod?.spec?.ephemeralContainers, 'name'),
  ].filter(Boolean);

export const getDebugImage = async (): Promise<string> => {
  try {
    const istag = await k8sGet(ImageStreamTagModel, 'tools:latest', 'openshift');
    return istag?.image?.dockerImageReference || defaultDebugImage;
  } catch {
    return defaultDebugImage;
  }
};

export const getEphemeralDebugContainerName = (pod: PodKind): string => {
  const containerNames = new Set(getContainerNames(pod));
  if (!containerNames.has(defaultDebugContainerName)) {
    return defaultDebugContainerName;
  }

  let suffix = 1;
  while (containerNames.has(`${defaultDebugContainerName}-${suffix}`)) {
    suffix++;
  }

  return `${defaultDebugContainerName}-${suffix}`;
};

export const buildEphemeralDebugContainer = (
  pod: PodKind,
  targetContainerName: string,
  image: string,
  name = getEphemeralDebugContainerName(pod),
) => ({
  name,
  image,
  stdin: true,
  tty: true,
  targetContainerName,
  command: isWindowsPod(pod) ? ['cmd.exe'] : ['/bin/sh'],
});

export const addEphemeralDebugContainer = async (
  pod: PodKind,
  targetContainerName: string,
  image: string,
): Promise<{ debugContainer: Record<string, unknown>; pod: PodKind }> => {
  const debugContainer = buildEphemeralDebugContainer(pod, targetContainerName, image);
  const updatedPod = await k8sStrategicMergePatch(
    PodModel,
    pod,
    {
      spec: {
        ephemeralContainers: [debugContainer],
      },
    },
    { path: 'ephemeralcontainers' },
  );

  return { debugContainer, pod: updatedPod };
};

export const getEphemeralDebugTerminalPath = (
  pod: PodKind,
  containerName: string,
  debugContainerName: string,
): string =>
  `/k8s/ns/${encodeURIComponent(pod.metadata.namespace)}/pods/${encodeURIComponent(
    pod.metadata.name,
  )}/containers/${encodeURIComponent(containerName)}/ephemeral-debug/${encodeURIComponent(
    debugContainerName,
  )}`;
