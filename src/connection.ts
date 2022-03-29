import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { Blockchain } from './model';

export const creditcoinApi = (wsUrl: string) => {
    const provider = new WsProvider(wsUrl);
    return ApiPromise.create({ provider });
};
