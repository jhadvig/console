import * as React from 'react';

import {createModalLauncher, ModalTitle, ModalBody, ModalSubmitFooter} from '../factory/modal';
import {PromiseComponent} from '../utils';

export class PromoteCrdModal extends PromiseComponent {
  constructor(props) {
    super(props);
    this._submit = this._submit.bind(this);
  }
  _submit(event) {
    event.preventDefault();

    this.props.close
  }
  render() {
    return <form onSubmit={this._submit} name="form">
      <ModalTitle>{this.props.title}</ModalTitle>
      <ModalBody>{this.props.message}</ModalBody>
      <ModalSubmitFooter errorMessage={this.state.errorMessage} inProgress={this.state.inProgress} submitText={this.props.btnText || 'Confirm'} cancel={this.props.cancel.bind(this)} />
    </form>;
  }
}

export const promoteCrdModal = createModalLauncher(PromoteCrdModal);