import * as React from 'react';

import { CopyToClipboard as CTC } from 'react-copy-to-clipboard';

export const CopyToClipboard = ({value, visibleValue = value}) => {
  return <React.Fragment>
    <div className="co-copy-to-clipboard">
      <pre className="co-pre-wrap">{visibleValue}</pre>
      <CTC text={value}>
        <button className="btn btn-default co-copy-btn" type="button">
          <i className="fa fa-clipboard" aria-hidden="true"></i>
          <span class="sr-only">Copy to Clipboard</span>
        </button>
      </CTC>
    </div>
  </React.Fragment>;
};
