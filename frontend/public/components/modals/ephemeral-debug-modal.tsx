import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { OverlayComponent } from '@console/dynamic-plugin-sdk/src/app/modal-support/OverlayProvider';
import { ModalFooterWithAlerts } from '@console/shared/src/components/modals/ModalFooterWithAlerts';
import { usePromiseHandler } from '@console/shared/src/hooks/usePromiseHandler';
import type { ModalComponentProps } from '@console/shared/src/types/modal';
import type { PodKind } from '../../module/k8s';
import {
  addEphemeralDebugContainer,
  getDebugImage,
  getEphemeralDebugTerminalPath,
} from '../pod-debug-utils';
import { ContainerLabel, ContainerSelect } from '../utils/container-select';

const EphemeralDebugModal: FC<EphemeralDebugModalProps> = ({
  resource,
  initialContainer,
  close,
  cancel,
}) => {
  const { t } = useTranslation('public');
  const navigate = useNavigate();
  const [handlePromise, inProgress, errorMessage] = usePromiseHandler();
  const containers = useMemo(() => _.keyBy(resource?.spec?.containers ?? [], 'name'), [resource]);
  const defaultContainer =
    initialContainer ||
    resource.metadata?.annotations?.['kubectl.kubernetes.io/default-container'] ||
    resource.spec?.containers?.[0]?.name ||
    '';
  const [containerName, setContainerName] = useState(defaultContainer);
  const [image, setImage] = useState('');

  useEffect(() => {
    let ignore = false;
    getDebugImage().then((debugImage) => {
      if (!ignore) {
        setImage(debugImage);
      }
    });

    return () => {
      ignore = true;
    };
  }, []);

  const submit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmedImage = image.trim();

      handlePromise(addEphemeralDebugContainer(resource, containerName, trimmedImage))
        .then(({ debugContainer }) => {
          close();
          navigate(
            getEphemeralDebugTerminalPath(resource, containerName, debugContainer.name as string),
          );
        })
        .catch(() => {});
    },
    [image, handlePromise, resource, containerName, close, navigate],
  );

  return (
    <>
      <ModalHeader title={t('Debug container')} />
      <ModalBody>
        <Alert
          isInline
          variant="warning"
          title={t("Ephemeral containers can't be removed after they are created.")}
          className="pf-v6-u-mb-md"
          data-test="ephemeral-debug-warning"
        />
        <Form id="ephemeral-debug-form" onSubmit={submit}>
          <FormGroup label={t('Container')} isRequired fieldId="ephemeral-debug-container">
            {Object.keys(containers).length > 1 ? (
              <ContainerSelect
                containers={containers}
                currentKey={containerName}
                onChange={setContainerName}
              />
            ) : (
              <ContainerLabel name={containerName} />
            )}
          </FormGroup>
          <FormGroup label={t('Image')} isRequired fieldId="ephemeral-debug-image">
            <TextInput
              id="ephemeral-debug-image"
              value={image}
              onChange={(_event, value) => setImage(value)}
              aria-label={t('Image')}
              data-test="ephemeral-debug-image"
              isRequired
            />
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooterWithAlerts errorMessage={errorMessage}>
        <Button
          type="submit"
          variant="primary"
          isLoading={inProgress}
          isDisabled={inProgress || !containerName || !image.trim()}
          data-test="confirm-action"
          form="ephemeral-debug-form"
        >
          {t('Debug container')}
        </Button>
        <Button
          variant="link"
          onClick={cancel}
          data-test="modal-cancel-action"
          data-test-id="modal-cancel-action"
        >
          {t('Cancel')}
        </Button>
      </ModalFooterWithAlerts>
    </>
  );
};

type EphemeralDebugModalProps = {
  resource: PodKind;
  initialContainer?: string;
} & ModalComponentProps;

export const EphemeralDebugModalOverlay: OverlayComponent<EphemeralDebugModalProps> = (props) => {
  const [isOpen, setIsOpen] = useState(true);
  const handleClose = () => {
    setIsOpen(false);
    props.closeOverlay();
  };

  return isOpen ? (
    <Modal variant={ModalVariant.small} isOpen onClose={handleClose}>
      <EphemeralDebugModal {...props} cancel={handleClose} close={handleClose} />
    </Modal>
  ) : null;
};
