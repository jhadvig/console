import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Heading } from './utils';

export const ConfigMapAndSecretData = ({data, decode}) => {
  decode = decode || (v => v);

  const dl = [];
  Object.keys(data || []).sort().forEach(k => {
    dl.push(<dt key={`${k}-k`}>{k}</dt>);
    dl.push(<dd key={`${k}-v`}><pre className="co-pre-wrap">{decode(data[k])}</pre></dd>);
  });

  return <dl>{dl}</dl>;
};

export const SecretData = ({data, decode, type, showSecret}) => {
  const dl = [];
  Object.keys(data).sort().forEach(k => {
    dl.push(<dt key={`${k}-k`}>{k}</dt>);
    dl.push(<dd key={`${k}-v`}><pre className="co-pre-wrap">{showSecret ? decode(data[k]) : '*****'}</pre></dd>);
  });
  return <dl>{dl}</dl>;
};

SecretData.propTypes = {
	data: PropTypes.object,
	decode: PropTypes.func,
	showSecret: PropTypes.bool
};

SecretData.defaultProps = {
	data: [],
	decode: (v => v),
	showSecret: false
};

export class ToggleSecretData extends React.PureComponent {
  constructor(props) {
  	super(props);
  	this.state = { showSecret: false };
  	this.toggleSecret = this.toggleSecret.bind(this);
  }

  toggleSecret() {
  	this.setState({ showSecret: !this.state.showSecret })
  }

  render() {
  	return <React.Fragment>
			<Heading text="Data" >
				<a className="btn btn-link" onClick={this.toggleSecret}>Reveal Secret</a>
			</Heading>
			<SecretData data={this.props.data} type={this.props.type} decode={this.props.decode} showSecret={this.state.showSecret} />
  	</React.Fragment>
  }
};

ToggleSecretData.propTypes = {
	data: SecretData.propTypes.data,
	decode: SecretData.propTypes.decode
};

ToggleSecretData.defaultProps = {
	data: SecretData.defaultProps.data,
	decode: SecretData.defaultProps.decode
};

export default {
	ConfigMapAndSecretData,
	SecretData
}