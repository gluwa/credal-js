import { ApiPromise, WsProvider } from '@polkadot/api';
import { extrinsics } from './extrinsics/extrinsics';

export const creditcoinApi = async (wsUrl: string) => {
    const provider = new WsProvider(wsUrl);
    const api = await ApiPromise.create({ provider });

    return { api, extrinsics: extrinsics(api) };
};
