import { SubmittableResult } from '@polkadot/api';

export type TxOnSuccess = (result: SubmittableResult) => void;
export type TxOnFail = (result: SubmittableResult | Error | undefined) => void;
