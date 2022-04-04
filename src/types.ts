import { SubmittableResult } from '@polkadot/api';

export type TxCallback = (result: SubmittableResult) => void;
