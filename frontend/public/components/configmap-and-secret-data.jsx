import * as _ from 'lodash-es';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Heading } from './utils';

export const MaskedData = ({data}) => {
  return <React.Fragment>
    <span className="sr-only">value hidden</span>
    <span aria-hidden="true">&bull;&bull;&bull;&bull;&bull;</span>
  </React.Fragment>;
}

export const SharedData = ({data, showSecret}) => {
  const dl = [];
  Object.keys(data || {}).sort().forEach(k => {
    dl.push(<dt key={`${k}-k`}>{k}</dt>);
    if (_.isNil(showSecret)) {
      dl.push(<dd key={`${k}-v`}><pre className="co-pre-wrap">{data[k]}</pre></dd>);
    } else {
      dl.push(<dd key={`${k}-v`}><pre className="co-pre-wrap">{showSecret ? window.atob(data[k]) : <MaskedData />}</pre></dd>);
    }

    // const value = _.isNil(showSecret) ? window.atob(data[k]) : data[k] 
    // dl.push(<dt key={`${k}-k`}>{k}</dt>);
    // dl.push(<dd key={`${k}-v`}><pre className="co-pre-wrap">{showSecret ? <MaskedData /> : value }</pre></dd>);
  });
  return <dl>{dl}</dl>;
};

export const ConfigMapData = ({data}) => {
  return <SharedData data={data}/>;
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
    const { data } = this.props;
    const { showSecret } = this.state;
    const dl = [];
    return <React.Fragment>
      <Heading text="Data">
        <button className="btn btn-link" type="button" onClick={this.toggleSecret}>{showSecret ? 'Hide Values' : 'Reveal Values'}</button>
      </Heading>
      <SharedData data={data} showSecret={showSecret}/>
    </React.Fragment>;
  }
}

SecretData.propTypes = {
  data: PropTypes.object
};

SecretData.defaultProps = {
  data: {}
};
