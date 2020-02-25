import * as _ from 'lodash-es';

export const enum AlertStates {
  Firing = 'firing',
  Silenced = 'silenced',
  Pending = 'pending',
  NotFiring = 'not-firing',
}

export const enum SilenceStates {
  Active = 'active',
  Pending = 'pending',
  Expired = 'expired',
}

export const alertState = (a) => _.get(a, 'state', AlertStates.NotFiring);
export const silenceState = (s) => _.get(s, 'status.state');

// Sort alerts and silences by their state (sort first by the state itself, then by the timestamp relevant to the state)
export const alertStateOrder = (alert) => [
  [AlertStates.Firing, AlertStates.Silenced, AlertStates.Pending, AlertStates.NotFiring].indexOf(
    alertState(alert),
  ),
  alertState(alert) === AlertStates.Silenced
    ? _.max(_.map(alert.silencedBy, 'endsAt'))
    : _.get(alert, 'activeAt'),
];
export const silenceStateOrder = (silence) => [
  [SilenceStates.Active, SilenceStates.Pending, SilenceStates.Expired].indexOf(
    silenceState(silence),
  ),
  _.get(silence, silenceState(silence) === SilenceStates.Pending ? 'startsAt' : 'endsAt'),
];

// Determine if an Alert is silenced by a Silence (if all of the Silence's matchers match one of the Alert's labels)
export const isSilenced = (alert, silence) =>
  [AlertStates.Firing, AlertStates.Silenced].includes(alert.state) &&
  _.every(silence.matchers, (m) => {
    const alertValue = _.get(alert.labels, m.name);
    return (
      alertValue !== undefined &&
      (m.isRegex ? new RegExp(`^${m.value}$`).test(alertValue) : alertValue === m.value)
    );
  });
