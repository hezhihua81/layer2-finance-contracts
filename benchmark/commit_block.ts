import '@nomiclabs/hardhat-ethers';

import fs from 'fs';
import { ethers } from 'hardhat';
import path from 'path';

import { Wallet } from '@ethersproject/wallet';

import { deployContracts, loadFixture } from '../test/common';

const GAS_USAGE_DIR = 'gas_usage/';
const GAS_USAGE_LOG = path.join(GAS_USAGE_DIR, 'commit_block.txt');

describe('Benchmark commitBlock', async function () {
  if (!fs.existsSync(GAS_USAGE_DIR)) {
    fs.mkdirSync(GAS_USAGE_DIR, { recursive: true });
  }
  fs.rmSync(GAS_USAGE_LOG, { force: true });
  fs.appendFileSync(GAS_USAGE_LOG, 'transitions, gas cost per block\n\n');

  async function fixture([admin]: Wallet[]) {
    const {
      registry,
      rollupChain,
      strategyDummy,
      testERC20
    } = await deployContracts(admin);
    const tokenAddress = testERC20.address;
    await registry.registerAsset(tokenAddress);
    await rollupChain.setNetDepositLimit(
      tokenAddress,
      ethers.utils.parseEther('10000')
    );
    return {
      admin,
      registry,
      rollupChain,
      strategyDummy,
      testERC20
    };
  }

  async function doBenchmark(txType: string, data: string, maxNum: number) {
    it(
      'one rollup block with up to ' + maxNum + ' ' + txType + ' transitions',
      async function () {
        this.timeout(20000 + 100 * maxNum);

        fs.appendFileSync(GAS_USAGE_LOG, '-- ' + txType + ' --\n');
        for (
          let numTxs = 1;
          numTxs <= maxNum;
          numTxs += numTxs >= 10 ? 10 : 1
        ) {
          const { rollupChain } = await loadFixture(fixture);
          let txs = [];
          for (let i = 0; i < numTxs; i++) {
            txs.push(data);
          }
          const gasUsed = (
            await (
              await rollupChain.commitBlock(0, txs, {
                gasLimit: 9500000 // TODO: Remove once estimateGas() works correctly
              })
            ).wait()
          ).gasUsed;
          fs.appendFileSync(
            GAS_USAGE_LOG,
            numTxs.toString() + '\t' + gasUsed + '\n'
          );
        }
        fs.appendFileSync(GAS_USAGE_LOG, '\n');
      }
    );
  }

  await doBenchmark(
    'sync commitment',
    '0x000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000737461746520726f6f7400000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000000',
    10
  );

  await doBenchmark(
    'commit',
    '0x000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000737461746520726f6f740000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000102030000000000000000000000000000000000000000000000000000000000bc614e00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000005f313238013934696600383629677c3f6a0e467d0439a600383707394901383180113901383889063887a5003933339f203f71540501266d4a8b06380f02380039376c4a0938277f1d00393065299a703400393375003830350e361b577d8c0000',
    200
  );

  await doBenchmark(
    'withdraw',
    '0x000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000737461746520726f6f7400000000000000000000000000000000000000000000000000000000000012340000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000102030000000000000000000000000000000000000000000000000000000000bc614e0000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000005f313238013934696600383629677c3f6a0e467d0439a600383707394901383180113901383889063887a5003933339f203f71540501266d4a8b06380f02380039376c4a0938277f1d00393065299a703400393375003830350e361b577d8c0000',
    10
  );
});
