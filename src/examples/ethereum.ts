import { ContractFactory, ethers, Signer, Wallet } from 'ethers';
import { TestToken } from './ethless/typechain';
import TestTokenArtifact from './ethless/contracts/TestToken.sol/TestToken.json';
import { JsonRpcProvider } from '@ethersproject/providers';

import dotenv from 'dotenv';
dotenv.config();

const signTransfer = async (
    domain: number,
    chainId: number,
    tokenAddress: string,
    from: Signer,
    to: string,
    amount: BigInt,
    fee: number,
    nonce: BigInt,
) => {
    const fromAddress = await from.getAddress();
    const hash = ethers.utils.solidityKeccak256(
        ['uint8', 'uint256', 'address', 'address', 'address', 'uint256', 'uint256', 'uint256'],
        [domain, chainId, tokenAddress, fromAddress, to, amount, fee, nonce],
    );
    return from.signMessage(ethers.utils.arrayify(hash));
};

const deployTestToken = async (deployer: Signer) => {
    const factory = new ContractFactory(TestTokenArtifact.abi, TestTokenArtifact.bytecode, deployer);
    const testToken = (await factory.deploy()) as TestToken;
    return testToken;
};

const fundAccount = (token: TestToken, minter: Signer, recipient: string, amount: number) =>
    token
        .connect(minter)
        .mint(recipient, amount)
        .then((tx) => tx.wait());

const ethlessTransfer = async (
    signer: Signer,
    domain: number,
    token: TestToken,
    fromSigner: Signer,
    to: string,
    amount: BigInt,
    fee: number,
    nonce: BigInt,
) => {
    const chainId = await token.chainID();
    const fromAddress = await fromSigner.getAddress();
    const signature = await signTransfer(domain, chainId.toNumber(), token.address, fromSigner, to, amount, fee, nonce);

    const receipt = await token
        .connect(signer)
        ['transfer(address,address,uint256,uint256,uint256,bytes)'](
            fromAddress,
            to,
            amount.valueOf(),
            fee,
            nonce.valueOf(),
            signature,
        )
        .then((tx) => tx.wait());
    return receipt;
};

export const lendOnEth = async (lender: Wallet, borrower: string, dealOrderId: string, amount: BigInt) => {
    const provider = new JsonRpcProvider('http://localhost:8545');

    const minter = new Wallet(process.env.PK1 || '', provider);
    const testToken = await deployTestToken(minter);

    await fundAccount(testToken, minter, lender.address, 1_000_000);

    const nonce = BigInt(dealOrderId);

    const transferReceipt = await ethlessTransfer(minter, 3, testToken, lender, borrower, amount, 1, nonce);

    console.log(transferReceipt);
    return [testToken.address, transferReceipt.transactionHash];
};
