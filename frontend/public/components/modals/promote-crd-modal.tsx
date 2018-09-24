import * as React from 'react';
import * as _ from 'lodash-es';

import { FLAGS } from '../../features';
import { createModalLauncher, ModalTitle, ModalBody, ModalSubmitFooter } from '../factory/modal';
import { k8sCreate, referenceForCRD } from '../../module/k8s/';
import { ConsoleExtensionModel } from '../../models';
import { PromiseComponent, Dropdown } from '../utils';


const constructConsoleExtensionInstance = (crd, navSection) => {
  const displayName = _.get(crd, ['metadata', 'annotations', 'displayName'], crd.spec.names.kind);
  return {
  "apiVersion": "config.openshift.io/v1",
  "kind": "ConsoleExtension",
  "metadata": {
    "name": `${crd.spec.names.singular}-console-extension`
  },
  "spec": {
    "navExtension": {
      "displayName": displayName,
      "navSection": navSection,
    },
    "scope": crd.spec.scope,
    "reference": referenceForCRD(crd),
  }
}
};

export class PromoteCrdModal extends PromiseComponent {
  constructor(props) {
    super(props);
    this.state.section = 'Home',
    this._submit = this._submit.bind(this);
    this._onSectionChange = this._onSectionChange.bind(this);
  }
  _submit(event) {
    event.preventDefault();
    const consoleExtension = constructConsoleExtensionInstance(this.props.crd, this.state.section);
    this.handlePromise(k8sCreate(ConsoleExtensionModel, consoleExtension)).then(() => this.props.close());
  }
  _onSectionChange(section) {
    this.setState({
      section: section
    })
  }
  render() {
    const sections = ['Home', 'Operators', 'Workloads', 'Networking', 'Storage', 'Builds', 'Service Catalog', 'Monitoring', 'Administration'];
    const sectionsObject = _.reduce(sections, (acc, section) => {
      if (section === 'Operators' && !FLAGS.OPERATOR_LIFECYCLE_MANAGER) {
        return;
      }
      if (section === 'Builds' && !FLAGS.OPENSHIFT) {
        return;
      }
      if (section === 'Service Catalog' && !FLAGS.SERVICE_CATALOG) {
        return;
      }
      // TODO -> MONITORING
      return _.assign(acc, {[section]: section});
    }, {});
    return <form onSubmit={this._submit} name="form">
      <ModalTitle>{this.props.title}</ModalTitle>
      <ModalBody>
        {this.props.message}
        Select navigation bar section where the <b>{this.props.crd.spec.names.kind}</b> should be placed.
        <Dropdown title="Home" items={sectionsObject} dropDownClassName="dropdown--full-width" id="dropdown-selectbox" onChange={this._onSectionChange} />
      </ModalBody>
      <ModalSubmitFooter errorMessage={this.state.errorMessage} inProgress={this.state.inProgress} submitText={this.props.btnText || 'Confirm'} cancel={this.props.cancel.bind(this)} />
    </form>;
  }
}

export const promoteCrdModal = createModalLauncher(PromoteCrdModal);
