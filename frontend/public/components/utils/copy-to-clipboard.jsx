import * as React from 'react';

import { CopyToClipboard as CTC } from 'react-copy-to-clipboard';

export const CopyToClipboard = ({value, visibleValue}) => {
  return <React.Fragment>
    <div className="copy-to-clipboard">
      <pre className="co-pre-wrap">{visibleValue}</pre>
      <CTC text={value}>
        <button className="btn btn-default copy-btn" type="button"><i className="fa fa-clipboard" aria-hidden="true"></i></button>
      </CTC>
    </div>
  </React.Fragment>;
};
