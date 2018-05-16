import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Heading } from './utils';

export const ConfigMapData = ({data}) => {
  const dl = [];
  Object.keys(data || []).sort().forEach(k => {
    dl.push(<dt key={`${k}-k`}>{k}</dt>);
    dl.push(<dd key={`${k}-v`}><pre className="co-pre-wrap">{data[k]}</pre></dd>);
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
    this.setState({ showSecret: !this.state.showSecret });
  }

  render() {
    const { data, decode } = this.props;
    const { showSecret } = this.state;
    const dl = [];
    Object.keys(data).sort().forEach(k => {
      dl.push(<dt key={`${k}-k`}>{k}</dt>);
      dl.push(<dd key={`${k}-v`}><pre className="co-pre-wrap">{showSecret ? decode(data[k]) : '*****'}</pre></dd>);
    });
    return <React.Fragment>
      <Heading text="Data" >
        <a className="btn btn-link" onClick={this.toggleSecret}>{showSecret ? 'Hide Secret' : 'Reveal Secret'}</a>
      </Heading>
      <dl>{dl}</dl>
    </React.Fragment>;
  }
}

SecretData.propTypes = {
  data: PropTypes.object,
  decode: PropTypes.func
};

SecretData.defaultProps = {
  data: [],
  decode: (v => v)
};

export default {
  ConfigMapData,
  SecretData
};
