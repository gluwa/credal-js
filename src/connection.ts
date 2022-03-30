import { ApiPromise, WsProvider } from '@polkadot/api';

export const creditcoinApi = (wsUrl: string) => {
    const provider = new WsProvider(wsUrl);
    return ApiPromise.create({ provider });
};
