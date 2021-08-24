//const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    const deployerAddr = deployer.address;
  
    console.log("Deploying contracts with the account:", deployerAddr);
  
    console.log("Account ETH balance:", (await deployer.getBalance()).toString());
  
    const Comp = await ethers.getContractFactory("Comp");
    const comp = await Comp.deploy(deployerAddr);
  
    console.log("Comp address:", comp.address);

    const Creator = await ethers.getContractFactory("Creator");
    const creator = await Creator.deploy(comp.address);
  
    console.log("Creator address:", creator.address);

    const TokenAddr = await creator.tokenAdress();
    console.log("TokenAddr", TokenAddr);

    await comp.transfer(TokenAddr, "10000000000000000000000000", {from: deployerAddr});

    const TokenSale = await ethers.getContractFactory("TokenSale");
    const tokenSale = await TokenSale.deploy(creator.address);

  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });