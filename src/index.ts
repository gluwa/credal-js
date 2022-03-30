import { Keyring } from '@polkadot/api';
import { creditcoinApi } from './connection';
import { registerAddress } from './extrinsics/register-address';

const main = async () => {
    const api = await creditcoinApi('wss://testnet.creditcoin.network');
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri('//Alice');

    await registerAddress(
        api,
        '0x1234567890123456789012345678901234567890',
        'Ethereum',
        signer,
        () => api.disconnect(),
        () => api.disconnect(),
    );
};

main().catch(console.error);
