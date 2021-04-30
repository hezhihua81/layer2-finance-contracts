import * as dotenv from 'dotenv';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

dotenv.config();

const strategyContractName = 'StrategyAaveLendingPoolV2';
const strategyDeploymentName = 'StrategyV2AaveUSDC';

const deployFunc: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy(strategyContractName, {
    from: deployer,
    log: true,
    args: [process.env.AAVE_LENDING_POOL, 'USDC', process.env.USDC, process.env.AAVE_AUSDC, process.env.ROLLUP_CHAIN]
  });
};

deployFunc.tags = [strategyDeploymentName];
export default deployFunc;
