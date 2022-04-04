import { Keyring } from '@polkadot/api';
import { creditcoinApi } from './connection';
import { registerAddressAsync } from './extrinsics/register-address';

const main = async () => {
    const api = await creditcoinApi('wss://testnet.creditcoin.network');
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri('//Alice');

    const address = await registerAddressAsync(api, '0x12345678901234567890123456789d01234564810', 'Ethereum', signer);
    console.log(address);

    api.disconnect();
};

main().catch(console.error);
