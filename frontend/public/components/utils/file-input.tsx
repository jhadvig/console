import * as _ from 'lodash-es';
import * as React from 'react';
import Dropzone from 'react-dropzone'

export class DropableFileInput extends React.Component<DropableFileInputProps, DropableFileInputState> {
  constructor(props) {
    super(props);
    this.state = {
      inputFileName: '',
      inputFileData: this.props.inputData || '',
      dropzoneActive: false,
    }
    this.onFileChange = this.onFileChange.bind(this);
    this.changeData = this.changeData.bind(this);
  }
  changeData(event) {
    this.setState({
      inputFileData: event.target.value
    }, () => this.props.onChange(this.state.inputFileData));
  }
  onFileChange(event) {
    this.setState({ dropzoneActive: false });
    const file = _.has(event, 'target') ? event.target.files[0] : event[0];
    this.setState({ inputFileName: file.name });
    const reader = new FileReader();
    reader.onload = e => {
      const input = reader.result;
      this.setState({
        inputFileData: input
      }, () => this.props.onChange(this.state.inputFileData));
    };
    reader.readAsText(file, 'UTF-8');
  }
  activeDragZone() {
    this.setState({ dropzoneActive: true });
  }
  deactiveDragZone() {
    this.setState({ dropzoneActive: false });
  }
  render() {
    return (
      <Dropzone
        onDrop={this.onFileChange}
        disableClick
        style={{position: "relative"}}
        onDragEnter={this.activeDragZone.bind(this)}
        onDragLeave={this.deactiveDragZone.bind(this)}
      >
        { this.state.dropzoneActive && <div className="file-input"><div className="drop-text">Drop file here</div></div> }
        <div className="form-group">
          <label className="control-label" htmlFor="ssh-privatekey">{this.props.label}</label>
          <div className="modal-body__field">
            <div className="input-group">
              <input type="text" className="form-control" value={this.state.inputFileName} readOnly disabled/>
              <span className="input-group-btn">
                <span className="btn btn-default btn-file">
                  Browse&hellip;
                  <input type="file" onChange={this.onFileChange} className="form-control"/>
                </span>
              </span>
            </div>
            <p className="help-block text-muted">{this.props.inputFieldHelpText}</p>
            <textarea className="form-control form-textarea"
              id="ssh-privatekey"
              name="privateKey"
              onChange={this.changeData}
              value={this.state.inputFileData}
              required>
            </textarea>
            <p className="help-block text-muted">{this.props.textareaFieldHelpText}</p>
          </div>
        </div>
      </Dropzone>
    );
  }
}

type DropableFileInputState = {
  inputFileData: string,
  inputFileName: string,
  dropzoneActive: boolean,
}

type DropableFileInputProps = {
  inputData: string,
  onChange: Function,
  label: string,
  inputFieldHelpText: string,
  textareaFieldHelpText: string,
}
