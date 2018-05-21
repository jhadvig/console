import * as _ from 'lodash-es';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import { Heading } from './utils';

import {CopyToClipboard} from 'react-copy-to-clipboard';

export const MaskedData = () => {
  return <React.Fragment>
    <span className="sr-only">value hidden</span>
    <span aria-hidden="true">&bull;&bull;&bull;&bull;&bull;</span>
  </React.Fragment>;
}

export const ConsoleCopyToClipboard = ({value, visibleValue}) => {
  return <React.Fragment>
    <div className="input-group">
      <input className="form-control co-pre-wrap" value={visibleValue ? visibleValue : value} disabled/>
      <CopyToClipboard text={value}>
        <span className="input-group-btn"><button className="btn btn-default" type="button"><i className="fa fa-clipboard" aria-hidden="true"></i></button></span>
      </CopyToClipboard>
    </div>
  </React.Fragment>;

  // return <React.Fragment>
  //   <div className="input-group">
  //     <input className="form-control" value={value} disabled/>
  //     <span className="input-group-btn">
  //       <button className="btn btn-default" type="button"><i className="fa fa-clipboard" aria-hidden="true"></i></button>
  //     </span>
  //   </div>
  // </React.Fragment>;
}

export const SharedData = ({data, showSecret}) => {
  const dl = [];
  Object.keys(data || {}).sort().forEach(k => {
    const value = _.isNil(showSecret) ? data[k] : window.atob(data[k]);
    const visibleValue = showSecret ? value : "*****" ;
    dl.push(<dt key={`${k}-k`}>{k}</dt>);
    dl.push(<dd key={`${k}-v`}><ConsoleCopyToClipboard value={value} visibleValue={visibleValue}/></dd>);
    // dl.push(<dd key={`${k}-v`}><pre className="co-pre-wrap">{showSecret ? value : <MaskedData /> }<CopyButton /></pre></dd>);
  });
  return <dl>{dl}</dl>;
};

export const ConfigMapData = ({data}) => {
  return <SharedData data={data}/>;
};

export const Icon = ({showSecret}) => {
  return showSecret ? <span className="show-values"><i className="fa fa-eye-slash"></i></span> : <span className="hide-values"><i className="fa fa-eye"></i></span>
}

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
    return <React.Fragment>
      <Heading text="Data">
        <button className="btn btn-link" type="button" onClick={this.toggleSecret}><Icon showSecret={showSecret}/> {showSecret ? 'Hide Values' : 'Reveal Values'}</button>
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
