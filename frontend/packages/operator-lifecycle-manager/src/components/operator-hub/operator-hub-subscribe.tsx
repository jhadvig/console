import * as React from 'react';
import * as _ from 'lodash';
import { Helmet } from 'react-helmet';
import { match } from 'react-router';
import { ActionGroup, Alert, Button, Checkbox, Tooltip } from '@patternfly/react-core';
import {
  // Dropdown,
  Firehose,
  history,
  NsDropdown,
  BreadCrumbs,
  MsgBox,
  StatusBox,
  ResourceIcon,
  resourceListPathFromModel,
} from '@console/internal/components/utils';
import {
  referenceForModel,
  k8sCreate,
  k8sGet,
  apiVersionForModel,
  kindForReference,
  apiVersionForReference,
  k8sListPartialMetadata,
} from '@console/internal/module/k8s';
import { RadioGroup, RadioInput } from '@console/internal/components/radio';
import { fromRequirements } from '@console/internal/module/k8s/selector';
import {
  SubscriptionModel,
  OperatorGroupModel,
  PackageManifestModel,
  ClusterServiceVersionModel,
} from '../../models';
import { NamespaceModel } from '@console/internal/models';
import { K8sResourceCommon } from '@console/internal/module/k8s';
import {
  OperatorGroupKind,
  PackageManifestKind,
  SubscriptionKind,
  InstallPlanApproval,
  InstallModeType,
} from '../../types';
import {
  defaultChannelFor,
  supportedInstallModesFor,
  ClusterServiceVersionLogo,
  providedAPIsForChannel,
  referenceForProvidedAPI,
  iconFor,
} from '../index';
import { installedFor, supports, providedAPIsFor, isGlobal } from '../operator-group';
import { CRDCard } from '../clusterserviceversion';
import './../../style.scss';

export const OperatorHubSubscribeForm: React.FC<OperatorHubSubscribeFormProps> = (props) => {
  const [targetNamespace, setTargetNamespace] = React.useState(null);
  const [watchNamespace, setWatchNamespace] = React.useState(null);

  const [updateChannel, setUpdateChannel] = React.useState(null);
  const [approval, setApproval] = React.useState(InstallPlanApproval.Automatic);
  const [cannotResolve, setCannotResolve] = React.useState(false);
  const [editNamespace, setEditNamespace] = React.useState(false);
  const [targetNamespaceExists, setTargetNamespaceExists] = React.useState(false);
  const [namespaceError, setNamespaceError] = React.useState('');
  const [useRecommendedNamespace, setUseRecommendedNamespace] = React.useState(false)
  const [enableMonitoring, setEnableMonitoring] = React.useState(false);
  const [error, setError] = React.useState('');

  const { name: pkgName } = props.packageManifest.data[0].metadata;
  const {
    provider,
    channels = [],
    packageName,
    catalogSource,
    catalogSourceNamespace,
  } = props.packageManifest.data[0].status;

  const selectedUpdateChannel = updateChannel || defaultChannelFor(props.packageManifest.data[0]);
  const selectedInstallMode = supportedInstallModesFor(props.packageManifest.data[0])(selectedUpdateChannel).reduce(
    (preferredInstallMode, mode) =>
      mode.type === InstallModeType.InstallModeTypeAllNamespaces
        ? InstallModeType.InstallModeTypeAllNamespaces
        : preferredInstallMode,
    InstallModeType.InstallModeTypeOwnNamespace,
  );

  const suggestedTargetNamespace = _.get(props, ['packageManifest', 'data', '0', 'metadata', 'annotations', 'operatorframework.io/suggested-namespace']);
  // const suggestedTargetNamespace = "openshift-test"

  // let selectedTargetNamespace = targetNamespace || props.targetNamespace;
  let selectedTargetNamespace = targetNamespace;
  let selectedWatchNamespace = null;

  if (selectedInstallMode === InstallModeType.InstallModeTypeAllNamespaces) {
    selectedTargetNamespace = _.get(props.operatorGroup, 'data', [] as OperatorGroupKind[]).find(
      (og) => og.metadata.name === 'global-operators',
    ).metadata.namespace;
    selectedWatchNamespace = selectedTargetNamespace;
    if (suggestedTargetNamespace && !useRecommendedNamespace) {
      selectedTargetNamespace = null
    }
  }

  if (suggestedTargetNamespace && useRecommendedNamespace) {
    selectedTargetNamespace = suggestedTargetNamespace;
    selectedWatchNamespace = suggestedTargetNamespace;
  }

  const selectedApproval = approval || InstallPlanApproval.Automatic;

  const [installMode, setInstallMode] = React.useState(selectedInstallMode);
  React.useEffect(() => {
    if (suggestedTargetNamespace) {
      setWatchNamespace(suggestedTargetNamespace);
      setUseRecommendedNamespace(true);
    } else {
      setWatchNamespace(null);
      // setWatchNamespace(installMode === InstallModeType.InstallModeTypeAllNamespaces ? selectedTargetNamespace : null);
    }
  }, [installMode])

  React.useEffect(() => {
    if (suggestedTargetNamespace) {
      setTargetNamespace(suggestedTargetNamespace);
    } else {
      setTargetNamespace(selectedTargetNamespace);
    }
  }, [watchNamespace])

  React.useEffect(() => {
    if (suggestedTargetNamespace) {
      k8sGet(NamespaceModel, targetNamespace).then(
        () => {
          setTargetNamespaceExists(true);
          setNamespaceError('');
        }
      ).catch(err => {
        if (_.get(err, 'response.status') === 404) {
          setEditNamespace(true);
          setTargetNamespaceExists(false);
        }
        setNamespaceError(err.message);
      });
    } else {
      setTargetNamespaceExists(true);
    }

    k8sListPartialMetadata(PackageManifestModel, {
      ns: targetNamespace,
      fieldSelector: `metadata.name=${pkgName}`,
      labelSelector: fromRequirements([
        { key: 'catalog', operator: 'Equals', values: [catalogSource] },
        { key: 'catalog-namespace', operator: 'Equals', values: [catalogSourceNamespace] },
      ]),
    })
      .then((list) => setCannotResolve(_.isEmpty(list)))
      .catch(() => setCannotResolve(true))

  }, [
    catalogSource,
    catalogSourceNamespace,
    pkgName,
    props.packageManifest.data,
    targetNamespace,
    useRecommendedNamespace,
  ]);

  const { installModes } = channels.find((ch) => ch.name === selectedUpdateChannel).currentCSVDesc;
  const singleInstallMode = installModes.find(
    (m) => m.type === InstallModeType.InstallModeTypeSingleNamespace,
  );
  const supportsSingle = singleInstallMode && singleInstallMode.supported;
  /////////////
  const ownInstallMode = installModes.find(
    (m) => m.type === InstallModeType.InstallModeTypeOwnNamespace,
  );
  const supportsOwn = ownInstallMode && ownInstallMode.supported;
  /////////////
  const globalInstallMode = installModes.find(
    (m) => m.type === InstallModeType.InstallModeTypeAllNamespaces,
  );
  const supportsGlobal = globalInstallMode && globalInstallMode.supported;

  const operatorGroupsNamespaces: string[] = _.map(props.operatorGroup.data, (og) => og.metadata.namespace);

  const watchNamespacesOperatorGroupNames: string[] = _.reduce(props.operatorGroup.data, (acc, og: OperatorGroupKind) => {
    if (og.status.namespaces.length != 1 && og.status.namespaces[0] != '') {
      acc.push(og.metadata.name);
    }
    return acc;
  }, []);

  const getSelectedWatchNamespaceConfiguredOperatorGroup = (): string[] => _.reduce(props.operatorGroup.data, (acc, og: OperatorGroupKind) => {
    _.includes(og.status.namespaces, watchNamespace) && acc.push(og.metadata.name);
    return acc;
  }, []); 

  const watchAllNamespacesOperatorGroupNames: string[] = _.reduce(props.operatorGroup.data, (acc, og: OperatorGroupKind) => {
    if (og.status.namespaces.length == 1 && og.status.namespaces[0] == '') {
      acc.push(og.metadata.name);
    }
    return acc;
  }, []); 

  const installNamespaceFilter = () => {
    const installModesMapping = installModes.reduce((installModesMap, installMode) => {installModesMap[installMode.type]=installMode.supported; return installModesMap}, {})

    switch(true) {
      case _.isMatch(installModesMapping, {AllNamespaces: true, SingleNamespace: true, OwnNamespace: true}):
      case _.isMatch(installModesMapping, {AllNamespaces: true, SingleNamespace: false, OwnNamespace: false}):
      case _.isMatch(installModesMapping, {AllNamespaces: true, SingleNamespace: true, OwnNamespace: false}):
      case _.isMatch(installModesMapping, {AllNamespaces: true, SingleNamespace: false, OwnNamespace: true}):
        if (selectedInstallMode == InstallModeType.InstallModeTypeAllNamespaces) {
          return function(namespace: K8sResourceCommon){
            const namespacesWithoutOperatorGroup = _.remove(operatorGroupsNamespaces, (ogNamespace) => {
              return _.includes(watchAllNamespacesOperatorGroupNames, ogNamespace)
            })
        
            if (_.includes(namespacesWithoutOperatorGroup, namespace.metadata.name)) {
              return false;
            }
            return true;
          }
        }

        return function(namespace: K8sResourceCommon){
          const namespacesWithoutOperatorGroup = _.remove(operatorGroupsNamespaces, (ogNamespace) => {
            const selectedWatchNamespaceConfiguredOperatorGroup = getSelectedWatchNamespaceConfiguredOperatorGroup();
            return _.includes(selectedWatchNamespaceConfiguredOperatorGroup, ogNamespace)
          })

          if (_.includes(namespacesWithoutOperatorGroup, namespace.metadata.name)) {
            return false;
          }
          return true;
        }
      case _.isMatch(installModesMapping, {AllNamespaces: false, SingleNamespace: true, OwnNamespace: true}):
        return function(namespace: K8sResourceCommon){
          const namespacesWithoutOperatorGroup = _.remove(operatorGroupsNamespaces, (ogNamespace) => {
            const selectedWatchNamespaceConfiguredOperatorGroup = getSelectedWatchNamespaceConfiguredOperatorGroup();
            return _.includes(selectedWatchNamespaceConfiguredOperatorGroup, ogNamespace)
          })

          if (_.includes(namespacesWithoutOperatorGroup, namespace.metadata.name)) {
            return false;
          }
          return true;
        }

      case _.isMatch(installModesMapping, {AllNamespaces: false, SingleNamespace: false, OwnNamespace: true}):

      default:
        return function(namespace: K8sResourceCommon){
          const namespacesWithoutOperatorGroup = _.remove(operatorGroupsNamespaces, (ogNamespace) => {
            return _.includes(watchAllNamespacesOperatorGroupNames, ogNamespace)
          })
      
          if (_.includes(namespacesWithoutOperatorGroup, namespace.metadata.name)) {
            return false;
          }
          return true;
        }
    }
  };

  if (!supportsSingle && !supportsOwn &&  !supportsGlobal) {
    return (
      <MsgBox
        title={`${_.get(channels, '[0].currentCSVDesc.displayName')} can't be installed`}
        detail="The operator does not support single namespace or global installation modes."
      />
    );
  }

  const descFor = (mode: InstallModeType) => {
    if (mode === InstallModeType.InstallModeTypeAllNamespaces && supportsGlobal) {
      return 'Operator will be available in all namespaces.';
    }
    if (mode === InstallModeType.InstallModeTypeSingleNamespace && supportsSingle) {
      return 'Operator will be available in a single namespace only.';
    }
    if (mode === InstallModeType.InstallModeTypeOwnNamespace && supportsOwn) {
      return 'Operator will be available in his own namespace only.';
    }
    return 'This mode is not supported by this Operator';
  };
  const subscriptionExists = (ns: string) =>
    installedFor(props.subscription.data)(props.operatorGroup.data)(
      props.packageManifest.data[0].status.packageName,
    )(ns);
  const namespaceSupports = (ns: string) => (mode: InstallModeType) => {
    const operatorGroup = props.operatorGroup.data.find((og) => og.metadata.namespace === ns);
    if (!operatorGroup || !ns) {
      return true;
    }
    return supports([{ type: mode, supported: true }])(operatorGroup);
  };
  const conflictingProvidedAPIs = (ns: string) => {
    const operatorGroups = props.operatorGroup.data.filter(
      (og) => og.status.namespaces.includes(ns) || isGlobal(og),
    );
    if (_.isEmpty(operatorGroups)) {
      return [];
    }
    const existingAPIs = _.flatMap(operatorGroups, providedAPIsFor);
    const providedAPIs = providedAPIsForChannel(props.packageManifest.data[0])(
      selectedUpdateChannel,
    ).map((desc) => referenceForProvidedAPI(desc));

    return _.intersection(existingAPIs, providedAPIs);
  };

  const createNamespaceIfNecessary = () => {
    const newNamespace: K8sResourceCommon = {
      metadata: {
        name: selectedTargetNamespace,
        labels: {
          'openshift.io/cluster-monitoring': `${enableMonitoring}`,
        }
      },
    };

    return !targetNamespaceExists
      ? k8sCreate(NamespaceModel, newNamespace)
      : Promise.resolve()
  }

  const submit = () => {
    // Clear any previous errors.
    setError('');
    const operatorGroup: OperatorGroupKind = {
      apiVersion: apiVersionForModel(OperatorGroupModel) as OperatorGroupKind['apiVersion'],
      kind: 'OperatorGroup',
      metadata: {
        generateName: `${selectedTargetNamespace}-`,
        namespace: selectedTargetNamespace,
      },
      spec: {
        targetNamespaces: [selectedTargetNamespace],
      },
    };

    const subscription: SubscriptionKind = {
      apiVersion: apiVersionForModel(SubscriptionModel) as SubscriptionKind['apiVersion'],
      kind: 'Subscription',
      metadata: {
        name: packageName,
        namespace: selectedTargetNamespace,
      },
      spec: {
        source: catalogSource,
        sourceNamespace: catalogSourceNamespace,
        name: packageName,
        startingCSV: channels.find((ch) => ch.name === selectedUpdateChannel).currentCSV,
        channel: selectedUpdateChannel,
        installPlanApproval: selectedApproval,
      },
    };

    return createNamespaceIfNecessary().then(
      () => {
        (props.operatorGroup.data.some(
          (group) => group.metadata.namespace === selectedTargetNamespace,
        )
          ? Promise.resolve()
          : k8sCreate(OperatorGroupModel, operatorGroup)
        )
          .then(() => k8sCreate(SubscriptionModel, subscription))
          .then(() =>
            history.push(
              resourceListPathFromModel(
                ClusterServiceVersionModel,
                targetNamespace || props.targetNamespace || selectedTargetNamespace,
              ),
            ),
          )
          .catch(({ message = 'Could not create operator subscription.' }) => setError(message));

      }
    ).catch(({ message = 'Could not create namespace.' }) => setError(message));
  };
  
  const canEnableMonitoring = namespace => {
    if (
      _.startsWith(namespace, "openshift-") ||
      _.startsWith(namespace, "kube-") ||
      _.includes(["default", "logging"], namespace)
    ) {
      return true;
    }
    return false;
  };
  
  const monitoringCheckbox = () => {
    return <div className="co-namespace-monitoring__checkbox">
      <Checkbox
        id={selectedTargetNamespace}
        label="Enable operator recommended cluster monitoring on this namespace"
        onChange={setEnableMonitoring}
        isChecked={enableMonitoring}
        name="enableNamespaceMonitoring"
      />
      <span className="text-muted">Note: Enabling monitoring will allow any operator or workload running on this namespace to contribute metrics to the cluster metric set.</span>
    </div>
  }

  const formValid = () =>
    [selectedUpdateChannel, selectedInstallMode, selectedTargetNamespace, selectedApproval].some(
      (v) => _.isNil(v) || _.isEmpty(v),
    ) ||
    subscriptionExists(selectedTargetNamespace) ||
    !namespaceSupports(selectedTargetNamespace)(selectedInstallMode) ||
    (selectedTargetNamespace && cannotResolve) ||
    !_.isEmpty(conflictingProvidedAPIs(selectedTargetNamespace));

  const formError = () => {
    return (
      (error && (
        <Alert
          isInline
          className="co-alert co-alert--scrollable"
          variant="danger"
          title="An error occurred"
        >
          <div className="co-pre-line">{error}</div>
        </Alert>
      )) ||
      (!namespaceSupports(selectedTargetNamespace)(selectedInstallMode) && (
        <Alert
          isInline
          className="co-alert"
          variant="danger"
          title="Namespace does not support install modes for this Operator"
        />
      )) ||
      (subscriptionExists(selectedTargetNamespace) && (
        <Alert
          isInline
          className="co-alert"
          variant="danger"
          title={`Operator subscription for namespace '${selectedTargetNamespace}' already exists`}
        />
      )) ||
      (!_.isEmpty(conflictingProvidedAPIs(selectedTargetNamespace)) && (
        <Alert isInline className="co-alert" variant="danger" title="Operator conflicts exist">
          Installing Operator in selected namespace would cause conflicts with another Operator
          providing these APIs:
          <ul>
            {conflictingProvidedAPIs(selectedTargetNamespace).map((gvk) => (
              <li key={gvk}>
                <strong>{kindForReference(gvk)}</strong> <i>({apiVersionForReference(gvk)})</i>
              </li>
            ))}
          </ul>
        </Alert>
      )) ||
      (selectedTargetNamespace && cannotResolve && (
        <Alert
          isInline
          className="co-alert"
          variant="danger"
          title="Operator not available for selected namespaces"
        />
      ))
    );
  };

  const showWatchNamespaceDropdown = () => {
    return installMode !== InstallModeType.InstallModeTypeAllNamespaces && (supportsSingle || supportsOwn);
  }

  const showInstallNamespaceDropdown = () => {
    return editNamespace;
  }

  const showEditInstallNamespace =() => {
    return (watchNamespace && !editNamespace)
  }

  return (
    <div className="row">
      <div className="col-xs-6">
        <>
          <div className="form-group co-create-subscription">
            <h5 className="co-required">Operator Namespace Availability</h5>
            <div>
              <RadioInput
                onChange={(e) => {
                  setInstallMode(e.target.value);
                  // setTargetNamespace(null);
                  // setWatchNamespace(null);
                  // setCannotResolve(false);
                }}
                value={InstallModeType.InstallModeTypeAllNamespaces}
                checked={installMode === InstallModeType.InstallModeTypeAllNamespaces}
                disabled={!supportsGlobal}
                title="All namespaces on the cluster"
                subTitle="(default)"
              >
                <div className="co-m-radio-desc">
                <p className="text-muted">
                    {descFor(InstallModeType.InstallModeTypeAllNamespaces)}
                  </p>
                </div>
              </RadioInput>
            </div>
            <div>
              <RadioInput
                onChange={(e) => {
                  setInstallMode(e.target.value);
                  // setTargetNamespace(null);
                  // setWatchNamespace(null);
                  // setCannotResolve(false);
                }}
                value={supportsOwn ? InstallModeType.InstallModeTypeOwnNamespace : InstallModeType.InstallModeTypeSingleNamespace}
                checked={installMode === InstallModeType.InstallModeTypeOwnNamespace}
                disabled={!supportsSingle && !supportsOwn}
                title="A specific namespace on the cluster"
              >
                <div className="co-m-radio-desc">
                  <p className="text-muted">
                    {descFor(InstallModeType.InstallModeTypeOwnNamespace)}
                  </p>
                </div>
              </RadioInput>

              {showWatchNamespaceDropdown() && <div className="co-namespace-creation__actions">
                <NsDropdown
                  id="watch-namespace-dropdown"
                  additionalKeys={['openshift-test']}
                  selectedKey={watchNamespace}
                  disabled={installMode === InstallModeType.InstallModeTypeAllNamespaces && !useRecommendedNamespace}
                  onChange={(ns) => {
                    setWatchNamespace(ns)
                  }}
                />
              </div>}

            </div>
          </div>
          <div className="form-group co-create-subscription">
            <h5 className="co-required">Installed Namespace</h5>
            {showEditInstallNamespace() && <div>
              <ResourceIcon kind="Project" />
              {targetNamespace}
              &nbsp;&nbsp;
              <Button
                variant="link"
                className="btn-link--no-btn-default-values"
                onClick={() => setEditNamespace(!editNamespace)}
                isInline
                >
                Edit
              </Button>
            </div>}
            {(editNamespace && suggestedTargetNamespace) && <div style={{ marginBottom: '20px' }}>
              <RadioInput
                onChange={(e) => {
                  setUseRecommendedNamespace(true)
                  setTargetNamespace(suggestedTargetNamespace);
                }}
                value={suggestedTargetNamespace}
                checked={useRecommendedNamespace}
                title="Operator recommended namespace:"
              >
                &nbsp;&nbsp;
                <ResourceIcon kind="Project" />
                <b>{suggestedTargetNamespace}</b>
              </RadioInput>
              {(useRecommendedNamespace && !targetNamespaceExists) && <div className="co-namespace-creation__actions">
                <Alert
                  isInline
                  className="co-alert co-alert--scrollable"
                  variant="info"
                  title="Namespace creation"
                >
                  <div className="co-pre-line">Namespace <b>{suggestedTargetNamespace}</b> does not exist and will be created.</div>
                </Alert>
                {canEnableMonitoring(selectedTargetNamespace) && monitoringCheckbox()}

              </div>}
              <RadioInput
                onChange={(e) => {
                  setUseRecommendedNamespace(false)
                  setTargetNamespace(null);
                }}
                value={suggestedTargetNamespace}
                checked={!useRecommendedNamespace}
                title="Other namespaces"
              ></RadioInput>
            </div>}

            {showInstallNamespaceDropdown() && <div className="co-namespace-creation__actions"> 
              <NsDropdown
                id="install-namespace-dropdown"
                selectedKey={selectedTargetNamespace}
                dataFilter={installNamespaceFilter()}
                // disabled={selectedInstallMode === InstallModeType.InstallModeTypeAllNamespaces && !useRecommendedNamespace}
                onChange={(ns) => {
                  setTargetNamespace(ns)
                }}
              />
              {canEnableMonitoring(selectedTargetNamespace) && monitoringCheckbox()}
              </div>}
            <br ></br>
            selectedWatchNamespace- {selectedWatchNamespace}
            <br ></br>
            watchNamespace- {watchNamespace}
            <br ></br><br ></br>
            selectedTargetNamespace- {selectedTargetNamespace}
            <br ></br>
            targetNamespace- {targetNamespace}
            <br ></br> <br ></br>
            suggestedTargetNamespace- {suggestedTargetNamespace}
            <br ></br>
            useRecommendedNamespace- {`${useRecommendedNamespace}`}
            <br ></br>
            editNamespace- {`${editNamespace}`}
            <br ></br>
            enableMonitoring- {`${enableMonitoring}`}
            <br ></br>
            targetNamespaceExists- {`${targetNamespaceExists}`}
            <br ></br>
            installMode- {installMode}

          </div>
          <div className="form-group">
            <Tooltip content="The channel to track and receive the updates from.">
              <h5 className="co-required">Update Channel</h5>
            </Tooltip>
            <RadioGroup
              currentValue={selectedUpdateChannel}
              items={channels.map((ch) => ({ value: ch.name, title: ch.name }))}
              onChange={(e) => {
                setUpdateChannel(e.currentTarget.value);
                setInstallMode(null);
                setTargetNamespace(null);
                setCannotResolve(false);
              }}
            />
          </div>
          <div className="form-group">
            <Tooltip content="The strategy to determine either manual or automatic updates.">
              <h5 className="co-required">Approval Strategy</h5>
            </Tooltip>
            <RadioGroup
              currentValue={selectedApproval}
              items={[
                { value: InstallPlanApproval.Automatic, title: 'Automatic' },
                { value: InstallPlanApproval.Manual, title: 'Manual' },
              ]}
              onChange={(e) => setApproval(e.currentTarget.value)}
            />
          </div>
        </>
        <div className="co-form-section__separator" />
        {formError()}
        <ActionGroup className="pf-c-form">
          <Button onClick={() => submit()} isDisabled={formValid()} variant="primary">
            Subscribe
          </Button>
          <Button variant="secondary" onClick={() => history.push('/operatorhub')}>
            Cancel
          </Button>
        </ActionGroup>
      </div>
      <div className="col-xs-6">
        <ClusterServiceVersionLogo
          displayName={_.get(channels, '[0].currentCSVDesc.displayName')}
          icon={iconFor(props.packageManifest.data[0])}
          provider={provider}
        />
        <h4>Provided APIs</h4>
        <div className="co-crd-card-row">
          {_.isEmpty(
            providedAPIsForChannel(props.packageManifest.data[0])(selectedUpdateChannel),
          ) ? (
            <span className="text-muted">No Kubernetes APIs are provided by this Operator.</span>
          ) : (
            providedAPIsForChannel(props.packageManifest.data[0])(
              selectedUpdateChannel,
            ).map((api) => (
              <CRDCard key={referenceForProvidedAPI(api)} canCreate={false} crd={api} csv={null} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const OperatorHubSubscribe: React.FC<OperatorHubSubscribeFormProps> = (props) => (
  <StatusBox data={props.packageManifest.data[0]} loaded={props.loaded} loadError={props.loadError}>
    <OperatorHubSubscribeForm {...props} />
  </StatusBox>
);

export const OperatorHubSubscribePage: React.SFC<OperatorHubSubscribePageProps> = (props) => {
  const search = new URLSearchParams({
    'details-item': `${new URLSearchParams(window.location.search).get(
      'pkg',
    )}-${new URLSearchParams(window.location.search).get('catalogNamespace')}`,
  });

  return (
    <>
      <Helmet>
        <title>OperatorHub Subscription</title>
      </Helmet>
      <div className="co-m-nav-title co-m-nav-title--breadcrumbs">
        <BreadCrumbs
          breadcrumbs={[
            { name: 'OperatorHub', path: `/operatorhub?${search.toString()}` },
            { name: 'Operator Subscription', path: props.match.url },
          ]}
        />
        <h1 className="co-m-pane__heading">Create Operator Subscription</h1>
        <p className="co-help-text">
          Install your Operator by subscribing to one of the update channels to keep the Operator up
          to date. The strategy determines either manual or automatic updates.
        </p>
      </div>
      <div className="co-m-pane__body">
        <Firehose
          resources={[
            {
              isList: true,
              kind: referenceForModel(OperatorGroupModel),
              prop: 'operatorGroup',
            },
            {
              isList: true,
              kind: referenceForModel(PackageManifestModel),
              namespace: new URLSearchParams(window.location.search).get('catalogNamespace'),
              fieldSelector: `metadata.name=${new URLSearchParams(window.location.search).get(
                'pkg',
              )}`,
              selector: {
                matchLabels: {
                  catalog: new URLSearchParams(window.location.search).get('catalog'),
                },
              },
              prop: 'packageManifest',
            },
            {
              isList: true,
              kind: referenceForModel(SubscriptionModel),
              prop: 'subscription',
            },
          ]}
        >
          {/* FIXME(alecmerdler): Hack because `Firehose` injects props without TypeScript knowing about it */}
          <OperatorHubSubscribe
            {...(props as any)}
            targetNamespace={
              new URLSearchParams(window.location.search).get('targetNamespace') || null
            }
          />
        </Firehose>
      </div>
    </>
  );
};

export type OperatorHubSubscribeFormProps = {
  loaded: boolean;
  loadError?: any;
  namespace: string;
  targetNamespace?: string;
  operatorGroup: { loaded: boolean; data: OperatorGroupKind[] };
  packageManifest: { loaded: boolean; data: PackageManifestKind[] };
  subscription: { loaded: boolean; data: SubscriptionKind[] };
};

export type OperatorHubSubscribePageProps = {
  match: match;
};

OperatorHubSubscribe.displayName = 'OperatorHubSubscribe';
OperatorHubSubscribeForm.displayName = 'OperatorHubSubscribeForm';
OperatorHubSubscribePage.displayName = 'OperatorHubSubscribePage';
