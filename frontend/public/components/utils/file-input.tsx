import * as React from 'react';
import * as classNames from 'classnames';
import { NativeTypes } from 'react-dnd-html5-backend';
import * as _ from 'lodash-es';
// eslint-disable-next-line no-unused-vars
import { DropTarget, ConnectDropTarget, DropTargetMonitor } from 'react-dnd';
import withDragDropContext from './drag-drop-context';
import { AsyncComponent } from './async';
import { safeLoad } from 'js-yaml';

// Maximal file size, in bytes, that user can upload
const maxFileUploadSize = 4000000;
const fileSizeErrorMsg = 'Maximum file size exceeded. File limit is 4MB.';

export class FileInput extends React.Component<FileInputProps, FileInputState> {
  constructor(props) {
    super(props);
    this.onDataChange = this.onDataChange.bind(this);
    this.onFileUpload = this.onFileUpload.bind(this);
  }
  onDataChange(event) {
    this.props.onChange({
      fileData: event.target.value
    });
  }
  readFile(file) {
    if (file.size > maxFileUploadSize) {
      this.props.onChange({
        errorMessage: fileSizeErrorMsg,
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const input = reader.result;
      this.props.onChange({
        fileData: input,
        fileName: file.name,
      });
    };
    reader.readAsText(file, 'UTF-8');
  }
  onFileUpload(event) {
    this.readFile(event.target.files[0]);
  }
  render() {
    const { connectDropTarget, isOver, canDrop, id, isRequired, isYaml = false } = this.props;
    const klass = classNames('co-file-dropzone-container', {'co-file-dropzone--drop-over': isOver});

    if (isYaml) {
      const obj = safeLoad(this.props.inputFileData);
      return (
        connectDropTarget(
          <div className="co-file-dropzone">
            {canDrop && <div className={klass}><p className="co-file-dropzone__drop-text">Drop file here</p></div>}
            <AsyncComponent loader={() => import('.././edit-yaml').then(c => c.EditYAML)} create={true}
              showHeader={false} dropped={!_.isEmpty(obj)} download={false} obj={obj} />
          </div>
        )
      );
    }
    return (
      connectDropTarget(
        <div className="co-file-dropzone">
          { canDrop && <div className={klass}><p className="co-file-dropzone__drop-text">Drop file here</p></div> }

          <div className="form-group">
            <label className="control-label" htmlFor={id}>{this.props.label}</label>
            <div className="modal-body__field">
              <div className="input-group">
                <input type="text"
                  className="form-control"
                  value={this.props.inputFileName}
                  aria-describedby={`${id}-help`}
                  readOnly
                  disabled />
                <span className="input-group-btn">
                  <span className="btn btn-default co-btn-file">
                    Browse&hellip;
                    <input type="file" onChange={this.onFileUpload} className="form-control" />
                  </span>
                </span>
              </div>
              <p className="help-block" id={`${id}-help`}>{this.props.inputFieldHelpText}</p>
              <textarea className="form-control co-file-dropzone__textarea"
                onChange={this.onDataChange}
                value={this.props.inputFileData}
                aria-describedby={`${id}-textarea-help`}
                required={isRequired}>
              </textarea>
              <p className="help-block" id={`${id}-textarea-help`}>{this.props.textareaFieldHelpText}</p>
              { this.props.errorMessage && <div className="text-danger">{this.props.errorMessage}</div> }
            </div>
          </div>
        </div>
      )
    );
  }
}

const boxTarget = {
  drop(props: FileInputProps, monitor: DropTargetMonitor) {
    if (props.onDrop && monitor.isOver()) {
      props.onDrop(props, monitor);
    }
  },
};

const FileInputComponent = DropTarget(NativeTypes.FILE, boxTarget, (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
}))(FileInput);

export const DroppableFileInput = withDragDropContext(class DroppableFileInput extends React.Component<DroppableFileInputProps, DroppableFileInputState>{
  constructor(props) {
    super(props);
    this.state = {
      inputFileName: '',
      inputFileData: this.props.inputFileData || '',
    };
    this.handleFileDrop = this.handleFileDrop.bind(this);
    this.onDataChange = this.onDataChange.bind(this);
  }
  handleFileDrop(item: any, monitor: DropTargetMonitor) {
    if (!monitor) {
      return;
    }
    const file = monitor.getItem().files[0];
    if (file.size > maxFileUploadSize) {
      this.setState({
        errorMessage: fileSizeErrorMsg,
        inputFileName: '',
        inputFileData: '',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const input = reader.result;
      this.setState({
        inputFileName: file.name,
        inputFileData: input,
        errorMessage: '',
      }, () => this.props.onChange(input));
    };
    reader.readAsText(file, 'UTF-8');
  }
  onDataChange(data) {
    const { fileData, fileName, errorMessage } = data;
    this.setState({
      inputFileData: fileData || '',
      inputFileName: fileName || '',
      errorMessage: errorMessage || '',
    }, () => this.props.onChange(this.state.inputFileData));
  }
  render() {
    return <FileInputComponent
      {...this.props}
      errorMessage={this.state.errorMessage}
      onDrop={this.handleFileDrop}
      onChange={this.onDataChange}
      inputFileData={this.state.inputFileData}
      inputFileName={this.state.inputFileName} />;
  }
});

/* eslint-disable no-undef */
export type DroppableFileInputProps = {
  inputFileData: string,
  onChange: Function,
  label: string,
  id: string,
  inputFieldHelpText: string,
  textareaFieldHelpText: string,
  isRequired: boolean,
};
export type DroppableFileInputState = {
  inputFileData: string,
  inputFileName: string,
  errorMessage?: any,
};
export type FileInputState = {
  inputFileData: string,
  inputFileName: string,
};
export type FileInputProps = {
  errorMessage: string,
  connectDropTarget?: ConnectDropTarget,
  isOver?: boolean,
  canDrop?: boolean,
  onDrop: (props: FileInputProps, monitor: DropTargetMonitor) => void,
  inputFileData: string,
  inputFileName: string,
  onChange: Function,
  label: string,
  id: string,
  inputFieldHelpText: string,
  textareaFieldHelpText: string,
  isRequired: boolean,
  isYaml?: boolean,
};
/* eslint-enable no-undef */
