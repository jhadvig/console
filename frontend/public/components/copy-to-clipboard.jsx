import * as React from 'react';

import {CopyToClipboard} from 'react-copy-to-clipboard';

export const ConsoleCopyToClipboard = ({value, visibleValue}) => {
  return <React.Fragment>
    <div className="copy-to-clipboard">
      <pre className="co-pre-wrap">{visibleValue}</pre>
      <CopyToClipboard text={value}>
        <button className="btn btn-default copy-btn" type="button"><i className="fa fa-clipboard" aria-hidden="true"></i></button>
      </CopyToClipboard>
    </div>
  </React.Fragment>;
}
