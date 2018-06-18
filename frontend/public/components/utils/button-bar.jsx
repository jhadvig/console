import * as _ from 'lodash-es';
import * as React from 'react';
import * as classNames from 'classnames';
import * as PropTypes from 'prop-types';

import { LoadingInline } from './status-box';

const injectDisabled = (children, disabled) => {
  return React.Children.map(children, c => {
    if (!_.isObject(c) || c.type !== 'button') {
      return c;
    }

    return React.cloneElement(c, { disabled: c.props.disabled || disabled });
  });
};

const ErrorMessage = ({message}) => <div className="alert alert-danger"><span className="pficon pficon-error-circle-o"></span>{message}</div>;
const InfoMessage = ({message}) => <div className="alert alert-info"><span className="pficon pficon-info"></span>{message}</div>;

// NOTE: DO NOT use <a> elements within a ButtonBar.
// They don't support the disabled attribute, and therefore
// can't be disabled during a pending promise/request.
export const ButtonBar = (props) => {
  return <div className={classNames(props.className, 'co-m-btn-bar')}>
    {props.errorMessage && <ErrorMessage message={props.errorMessage} />}
    {injectDisabled(props.children, props.inProgress)}
    {props.inProgress && <LoadingInline />}
    {props.infoMessage && <InfoMessage message={props.infoMessage} />}
  </div>;
};

ButtonBar.propTypes = {
  children: PropTypes.node.isRequired,
  errorMessage: PropTypes.string,
  infoMessage: PropTypes.string,
  inProgress: PropTypes.bool.isRequired,
  className: PropTypes.string,
};
