// @ts-ignore
import concreteSeqText from './concrete_acgih_construction.txt?raw';
// @ts-ignore
import concreteSumText from './concrete_acgih_summary.txt?raw';
// @ts-ignore
import pitchSeqText from './pitch_acgih_construction.txt?raw';
// @ts-ignore
import pitchSumText from './pitch_acgih_summary.txt?raw';
// @ts-ignore
import concreteEventsText from './concrete_acgih_events.txt?raw';
// @ts-ignore
import concreteMonthlyText from './concrete_acgih_monthly.txt?raw';
// @ts-ignore
import pitchEventsText from './pitch_acgih_events.txt?raw';
// @ts-ignore
import pitchMonthlyText from './pitch_acgih_monthly.txt?raw';

export const CONCRETE_ACGIH_CONSTRUCTION = JSON.parse(concreteSeqText);
export const CONCRETE_ACGIH_SUMMARY = JSON.parse(concreteSumText);
export const PITCH_ACGIH_CONSTRUCTION = JSON.parse(pitchSeqText);
export const PITCH_ACGIH_SUMMARY = JSON.parse(pitchSumText);

export const CONCRETE_ACGIH_EVENTS = JSON.parse(concreteEventsText);
export const CONCRETE_ACGIH_MONTHLY = JSON.parse(concreteMonthlyText);
export const PITCH_ACGIH_EVENTS = JSON.parse(pitchEventsText);
export const PITCH_ACGIH_MONTHLY = JSON.parse(pitchMonthlyText);

