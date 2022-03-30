import { Keyring } from '@polkadot/api';
import { creditcoinApi } from './connection';
import { registerAddress, registerAddressAsync } from './extrinsics/register-address';

const main = async () => {
    const api = await creditcoinApi('ws://localhost:9944');
    const keyring = new Keyring({ type: 'sr25519' });
    const signer = keyring.addFromUri('//Alice');

    const address = await registerAddressAsync(api, '0x1234567890123456789012345678901234564810', 'Ethereum', signer);
    console.log(address);
};

main().catch(console.error);
