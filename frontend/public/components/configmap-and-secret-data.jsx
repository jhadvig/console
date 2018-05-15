import * as _ from 'lodash-es';

import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Heading } from './utils';

export const ConfigMapData = ({data, decode}) => {
	decode = decode || (v => v);

	const dl = [];
	Object.keys(data || []).sort().forEach(k => {
		dl.push(<dt key={`${k}-k`}>{k}</dt>);
		dl.push(<dd key={`${k}-v`}><pre className="co-pre-wrap">{decode(data[k])}</pre></dd>);
	});

	return <dl>{dl}</dl>;
};

export class SecretData extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = { showSecret: false };
		this.toggleSecret = this.toggleSecret.bind(this);
	}

	toggleSecret() {
		this.setState({ showSecret: !this.state.showSecret })
	}

	render() {
		const { data, type, decode } = this.props;
		const { showSecret } = this.state;
		const dl = [];
		Object.keys(data).sort().forEach(k => {
			if (k === '.dockercfg' || k === ".dockerconfigjson") {
				const decodedData = JSON.parse(decode(data[k]));
				const serverAddresses = decodedData.auths ? _.keys(JSON.parse(decode(data[k])).auths) : _.keys(JSON.parse(decode(data[k])));
				_.forEach(serverAddresses, (address, index) => {
					const serverData = decodedData[address] || decodedData.auths[address];
					const serverCredentials = _.pick(serverData, ['email', 'username', 'password']);
					const setParams = _.spread(function(username, password) {
						serverCredentials.username = username;
						serverCredentials.password = password;
					});
					setParams(_.split(decode(serverData.auth), ':', 2));
					dl.push(<h3 style={{ marginTop: 0}} key={`address-${index}-v`}>{address}</h3>);
					_.forEach(serverCredentials, (param_value, param_key) => {
						dl.push(<dt key={`${param_key}-${index}-k`}>{param_key}</dt>);
						dl.push(<dd key={`${param_key}-${index}-v`}><pre className="co-pre-wrap">{showSecret ? serverCredentials[param_key] : '*****'}</pre></dd>);
					})
				})
			} else {
				dl.push(<dt key={`${k}-k`}>{k}</dt>);
				dl.push(<dd key={`${k}-v`}><pre className="co-pre-wrap">{showSecret ? decode(data[k]) : '*****'}</pre></dd>);
			}
		});

  	return <React.Fragment>
			<Heading text="Data" >
				<a className="btn btn-link" onClick={this.toggleSecret}>{showSecret ? 'Hide Secret' : 'Reveal Secret'}</a>
			</Heading>
			<dl>{dl}</dl>
		</React.Fragment>
	}
};

SecretData.propTypes = {
	data: PropTypes.object,
	decode: PropTypes.func,
	type: PropTypes.string.isRequired
};

SecretData.defaultProps = {
	data: [],
	decode: (v => v)
};

export default {
	ConfigMapData,
	SecretData
}