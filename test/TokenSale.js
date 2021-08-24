require('babel-polyfill');

require("@nomiclabs/hardhat-truffle5");

const BigNumber = require('bignumber.js');
const expectThrow = require('./helpers/expectThrow');

const TokenSale = artifacts.require('TokenSale');
//const TestTokenSale = artifacts.require('TestTokenSale');
const Creator = artifacts.require('Creator');
const Token = artifacts.require('Token');
const TokenEscrow = artifacts.require('TokenEscrow');
const Comp = artifacts.require('Comp');

const BENIFICIARY_ACCOUNT = '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720';
const UNSOLD_TOKENS_ACCOUNT = '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f';
const MARKETING_ACCOUNT = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
const TEAM_MEMBER_1_ACCOUNT = '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65';
const TEAM_MEMBER_2_ACCOUNT = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
const TEAM_MEMBER_3_ACCOUNT = '0x976EA74026E726554dB657fA54763abd0C3a0aa9';
const TEAM_MEMBER_4_ACCOUNT = '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955';
const REVPOP_FOUNDATION_ACCOUNT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const REVPOP_COMPANY_ACCOUNT = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

const TOTAL_SUPPLY            = '10000000000000000000000000'; // 2bn * 10^18
const MARKETING_SHARE         = '1000000000000000000000000'; // 200m * 10^18
const TEAM_MEMBER_1_SHARE     = '250000000000000000000000'; // 50m * 10^18 (2.50% from 200m)
const TEAM_MEMBER_2_SHARE     = '250000000000000000000000'; // 50m * 10^18 (2.50% from 200m)
const TEAM_MEMBER_3_SHARE     = '250000000000000000000000'; // 50m * 10^18 (2.50% from 200m)
const TEAM_MEMBER_4_SHARE     = '250000000000000000000000'; // 50m * 10^18 (2.50% from 200m)
const REVPOP_FOUNDATION_SHARE = '1000000000000000000000000'; // 200m * 10^18
const REVPOP_COMPANY_SHARE    = '1000000000000000000000000'; // 200m * 10^18
const TOTAL_SHARES = '4000000000000000000000000';
const TOTAL_SHARES_PLUS_ONE = '4000000000000000000000001';
const SELLABLE_TOKEN_AMOUNT = '6000000000000000000000000'; // TOTAL_SUPPLY - TOTAL_SHARES

const DEFAULT_TOKENS_IN_FIRST_PERIOD = '75000000000000000000000';
const DEFAULT_TOKENS_IN_OTHER_PERIOD = '25000000000000000000000';

const FIRST_PERIOD_DURATION_IN_SEC = 432000; // 5 days
const NUMBER_OF_OTHER_WINDOWS = 237;
const WINDOW_DURATION_IN_SEC = 82800; // 23 hours

let initializeTokenSale = async (tokenSale, accounts, customProps, customTokensPerPeriodProps) => {
    const token = await getTokenFromTokenSale(tokenSale);

    if ((await token.owner()) !== tokenSale.address) {
      await token.transferOwnership(tokenSale.address);
    }

    let startTime = new Date().getTime();

    let props = {
        totalSupply: TOTAL_SUPPLY,
        startTime: startTime,
        otherStartTime: startTime + FIRST_PERIOD_DURATION_IN_SEC,
        numberOfOtherWindows: NUMBER_OF_OTHER_WINDOWS,
        ...customProps
    };

    return tokenSale.initialize(
        props.totalSupply,
        props.startTime,
        props.otherStartTime,
        props.numberOfOtherWindows,
        { from: accounts[0] }
    );
};

let setTokensPerPeriod = async (tokenSale, accounts, customProps) => {
    let props = {
        firstPeriodTokens: DEFAULT_TOKENS_IN_FIRST_PERIOD,
        otherPeriodTokens: DEFAULT_TOKENS_IN_OTHER_PERIOD,
        from: accounts[0],
        ...customProps
    };

    return tokenSale.setTokensPerPeriods(
        props.firstPeriodTokens,
        props.otherPeriodTokens,
        { from: props.from }
    );
};

let createTokenSale = async (accounts, test=false) => {
    const comp = await Comp.new(accounts[0]);
    console.log("comp.address", comp.address);
    const newCreator = (await Creator.new(comp.address)).address;
    console.log("Creator", newCreator);
    if (test === true) {
        return TestTokenSale.new(newCreator);
    }

    const tokenSale = await TokenSale.new(newCreator);
    console.log("tokenSale", tokenSale.address);

    const token = await getTokenFromTokenSale(tokenSale);
    const tokenAddress = await tokenSale.token();
    // console.log("Token contract Address", tokenAddress);
    // console.log("comp token Address balance", String(await comp.balanceOf(tokenAddress)));
    // console.log("comp accounts[0] balance", accounts[0], String(await comp.balanceOf(accounts[0])));
    // console.log("comp tokenSale balance", String(await comp.balanceOf(tokenSale.address)));
    await comp.transfer(tokenAddress, "10000000000000000000000000", {from: accounts[0]});
    // console.log("comp Token Address 2 balance", String(await comp.balanceOf(tokenAddress)));
    // console.log("comp accounts[0] balance", accounts[0], String(await comp.balanceOf(accounts[0])));
    // console.log("comp tokenSale 2 balance", String(await comp.balanceOf(tokenSale.address)));
    return tokenSale;
};

let getEscrowFromTokenSale = async (tokenSale) => {
    return TokenEscrow.at(await tokenSale.tokenEscrow());
};

let getTokenFromTokenSale = async (tokenSale) => {
    return Token.at(await tokenSale.token());
};

let getBalanceByTokenSale = async (tokenSale, account) => {
    let token = await Token.at(await tokenSale.token());

    return token.balanceOf(account);
};

let wait = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

contract('TokenSale', accounts => {
    
    it("should have token with pausable exception for escrow contract", async () => {
        let tokenSale = await createTokenSale(accounts);
        let escrow = await getEscrowFromTokenSale(tokenSale);
        let token = await getTokenFromTokenSale(tokenSale);

        await initializeTokenSale(tokenSale, accounts);

        assert.equal(true, await token.hasException(escrow.address));
        assert.equal(true, await token.hasException(tokenSale.address));
        assert.equal(true, await token.hasException(MARKETING_ACCOUNT));
        assert.equal(false, await token.hasException(accounts[0]));
        assert.equal(false, await token.hasException(accounts[1]));
        assert.equal(false, await token.hasException(accounts[2]));
        assert.equal(false, await token.hasException(accounts[7]));
        assert.equal(false, await token.hasException('0x0000000000000000000000000000000000000000'));
    });

    it("should have token and escrow contracts with owner as TokenSale", async () => {
        let tokenSale = await createTokenSale(accounts);
        let escrow = await getEscrowFromTokenSale(tokenSale);
        let token = await getTokenFromTokenSale(tokenSale);

        await initializeTokenSale(tokenSale, accounts);

        assert.equal(tokenSale.address, await escrow.owner());
        assert.equal(tokenSale.address, await token.owner());
    });

    it("should initialize with given values", async () => {
        let tokenSale = await createTokenSale(accounts);
        let startTime = parseInt(new Date().getTime() / 1000, 10);
        let otherStartTime = startTime + FIRST_PERIOD_DURATION_IN_SEC;

        await initializeTokenSale(tokenSale, accounts, {
            startTime: startTime,
            otherStartTime: otherStartTime
        });

        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        let token = await getTokenFromTokenSale(tokenSale);

        assert.equal(TOTAL_SUPPLY, (await token.totalSupply.call()).toString(10));
        assert.equal(NUMBER_OF_OTHER_WINDOWS, await tokenSale.numberOfOtherWindows());
        assert.equal(TOTAL_SUPPLY, (await tokenSale.totalSupply()).toString(10));
        assert.equal(startTime, await tokenSale.firstWindowStartTime());
        assert.equal(otherStartTime, await tokenSale.otherWindowsStartTime());
        assert.equal(true, await tokenSale.initialized());
    });

    it("should allow to call setTokensPerPeriods only after initialized", async () => {
        let tokenSale = await createTokenSale(accounts);

        await expectThrow(
            setTokensPerPeriod(tokenSale, accounts),
            "initialized should be == true"
        );
    });

    it("should allow to call setTokensPerPeriods only by the owner of tokenSale", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await expectThrow(setTokensPerPeriod(tokenSale, accounts, {from: accounts[1]}), 'Ownable: caller is not the owner');
    });

    it("should allow to call setTokensPerPeriods multiple times but only before tokensale began", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);

        setTokensPerPeriod(tokenSale, accounts);

        await tokenSale.distributeShares({ from: accounts[0] });

        setTokensPerPeriod(tokenSale, accounts);

        await tokenSale.begin({ from: accounts[0] });

        await expectThrow(setTokensPerPeriod(tokenSale, accounts), 'began should be == false');
    });

    it("should have create per first/other window values after calling distributeShares (without bulk purchasers)", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });

        console.log(            
            new BigNumber(TOTAL_SUPPLY)
        .minus(new BigNumber(REVPOP_FOUNDATION_SHARE))
        .minus(new BigNumber(REVPOP_COMPANY_SHARE))
        .minus(new BigNumber(MARKETING_SHARE))
        .minus(new BigNumber(TEAM_MEMBER_1_SHARE))
        .minus(new BigNumber(TEAM_MEMBER_2_SHARE))
        .minus(new BigNumber(TEAM_MEMBER_3_SHARE))
        .minus(new BigNumber(TEAM_MEMBER_4_SHARE))
        .toString(10));

        let token = (await Token.at(await tokenSale.token())).address;

        assert.equal(
            new BigNumber(TOTAL_SUPPLY)
                .minus(new BigNumber(REVPOP_FOUNDATION_SHARE))
                .minus(new BigNumber(REVPOP_COMPANY_SHARE))
                .minus(new BigNumber(MARKETING_SHARE))
                .minus(new BigNumber(TEAM_MEMBER_1_SHARE))
                .minus(new BigNumber(TEAM_MEMBER_2_SHARE))
                .minus(new BigNumber(TEAM_MEMBER_3_SHARE))
                .minus(new BigNumber(TEAM_MEMBER_4_SHARE))
                .toString(10),
            (await getBalanceByTokenSale(tokenSale, token)).toString(10)
        );

        assert.equal(DEFAULT_TOKENS_IN_FIRST_PERIOD, (await tokenSale.createPerFirstWindow()).toString(10));
        assert.equal(DEFAULT_TOKENS_IN_OTHER_PERIOD, (await tokenSale.createPerOtherWindow()).toString(10));
    });

    it("should be able to call removePausableException() by the owner of tokenSale", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        let escrow = await getEscrowFromTokenSale(tokenSale);
        let escrowAddress = new String(escrow.address).valueOf();

        let token = await getTokenFromTokenSale(tokenSale);

        await tokenSale.removePausableException(escrowAddress, { from: accounts[0] });
        assert.equal(false, await token.hasException(escrowAddress));
        await expectThrow(tokenSale.removePausableException(escrowAddress, { from: accounts[1] }), 'Ownable: caller is not the owner');
    });

    it("should have proper distribution of tokens after calling distributeShares", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });

        assert.equal(true, await tokenSale.distributedShares());

        let escrow = await getEscrowFromTokenSale(tokenSale);
        let escrowAddress = new String(escrow.address).valueOf();

        assert.equal(
            new BigNumber(REVPOP_COMPANY_SHARE).plus(REVPOP_FOUNDATION_SHARE).toString(10),
            (await getBalanceByTokenSale(tokenSale, escrowAddress)).toString(10)
        );

        let escrowUnlockStart = (await escrow.unlockStart()).toNumber();
        let now = new Date().getTime() / 1000;

        // console.log(now, escrowUnlockStart);
        // console.log(now >= escrowUnlockStart);

        assert.equal(true, now >= escrowUnlockStart);
        assert.equal(100, await escrow.totalShare());
        
        let companyShare = await escrow.shares(REVPOP_COMPANY_ACCOUNT);

        assert.equal(50, companyShare[0].toNumber());
        assert.equal(10, companyShare[1].toNumber());
        assert.equal(31536000, companyShare[2].toNumber());
 
        let token = await getTokenFromTokenSale(tokenSale);

        assert.equal(TEAM_MEMBER_1_SHARE, (await token.balanceOf(TEAM_MEMBER_1_ACCOUNT)).toNumber());
        assert.equal(TEAM_MEMBER_2_SHARE, (await token.balanceOf(TEAM_MEMBER_2_ACCOUNT)).toNumber());
        assert.equal(TEAM_MEMBER_3_SHARE, (await token.balanceOf(TEAM_MEMBER_3_ACCOUNT)).toNumber());
        assert.equal(TEAM_MEMBER_4_SHARE, (await token.balanceOf(TEAM_MEMBER_4_ACCOUNT)).toNumber());
        assert.equal(MARKETING_SHARE, (await token.balanceOf(MARKETING_ACCOUNT)).toNumber());

        assert.equal(true, await token.paused());
    });

    it("initialize should be called only once", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await expectThrow(initializeTokenSale(tokenSale, accounts), "initialized should be == false");
    });

    it("should allow to call addBulkPurchasers only after initialized", async () => {
        let tokenSale = await createTokenSale(accounts);

        await expectThrow(
            tokenSale.addBulkPurchasers(
                [accounts[1], accounts[2]],
                ['100000000000000000000000', '100000000000000000000000'],
                { from: accounts[0] }
            ),
            "initialized should be == true"
        );
    });

    it("should allow to call distributeShares only after tokens per periods are set", async () => {
        let tokenSale = await createTokenSale(accounts);
        await initializeTokenSale(tokenSale, accounts);

        await expectThrow(
            tokenSale.distributeShares({ from: accounts[0] }),
            "tokensPerPeriodAreSet should be == true"
        );
    });

    it("should allow to call distributeShares only once", async () => {
        let tokenSale = await createTokenSale(accounts);
        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({from: accounts[0]});

        await expectThrow(
            tokenSale.distributeShares({ from: accounts[0] }),
            "distributedShares should be == false"
        );
    });

    it("should allow to call addBulkPurchasers only before setting tokens per periods", async () => {
        let tokenSale = await createTokenSale(accounts);
        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);

        await expectThrow(
            tokenSale.addBulkPurchasers(
                [accounts[1], accounts[2]],
                ['100000000000000000000000', '100000000000000000000000'],
                { from: accounts[0] }
            ),
            "tokensPerPeriodAreSet should be == false"
        );
    });

    it("should transfer tokens to bulk purchasers when addBulkPurchasers is called", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);

        await expectThrow(tokenSale.addBulkPurchasers(
            [accounts[1]],
            [0],
            { from: accounts[0] }
        ), "_tokens[i] should be > 0");

        const sellableTokenAmount = new BigNumber(SELLABLE_TOKEN_AMOUNT);
        const totalTokenAmount = new BigNumber(TOTAL_SUPPLY);

        // Try to add bulk purchase which is bigger on 1 than sellable token amount
        await expectThrow(tokenSale.addBulkPurchasers(
            [accounts[1], accounts[2]],
            [sellableTokenAmount.toString(10), '1'],
            { from: accounts[0] }),
            "token.balanceOf(address(token)) should be > totalReservedTokens() after bulk purchases"
        );

        await tokenSale.addBulkPurchasers(
            [accounts[1], accounts[2]],
            ['100000000000000000000001', '100000000000000000000000'],
            { from: accounts[0] }
        );

        let token = await getTokenFromTokenSale(tokenSale);

        assert.equal(
            (await getBalanceByTokenSale(tokenSale, token.address)).toString(10),
            totalTokenAmount.minus('100000000000000000000001').minus('100000000000000000000000').toString(10),
            'Expecting -' + sellableTokenAmount.minus('100000000000000000000001').minus('100000000000000000000000').toString(10)
        );


        assert.equal('100000000000000000000001', (await token.balanceOf(accounts[1])).toString(10));
        assert.equal('100000000000000000000000', (await token.balanceOf(accounts[2])).toString(10));
    });

    it("begin should be called only after shares are distributed", async () => {
        let tokenSale = await createTokenSale(accounts);

        await expectThrow(tokenSale.begin({ from: accounts[0] }), "distributedShares should be == true");
    });

    it("begin should be called only once", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        assert.equal(true, await tokenSale.began());

        await expectThrow(tokenSale.begin({ from: accounts[0] }), "began should be == false");
    });

    it("should have correct wallets set up", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        assert.equal(REVPOP_FOUNDATION_ACCOUNT, ethers.utils.getAddress(await tokenSale.wallets(0)));
        assert.equal(REVPOP_COMPANY_ACCOUNT, ethers.utils.getAddress(await tokenSale.wallets(1)));
        assert.equal(MARKETING_ACCOUNT, ethers.utils.getAddress(await tokenSale.wallets(2)));
        assert.equal(TEAM_MEMBER_1_ACCOUNT, ethers.utils.getAddress(await tokenSale.wallets(3)));
        assert.equal(TEAM_MEMBER_2_ACCOUNT, ethers.utils.getAddress(await tokenSale.wallets(4)));
        assert.equal(TEAM_MEMBER_3_ACCOUNT, ethers.utils.getAddress(await tokenSale.wallets(5)));
        assert.equal(TEAM_MEMBER_4_ACCOUNT, ethers.utils.getAddress(await tokenSale.wallets(6)));
        assert.equal(UNSOLD_TOKENS_ACCOUNT, ethers.utils.getAddress(await tokenSale.wallets(7)));
        assert.equal(BENIFICIARY_ACCOUNT, ethers.utils.getAddress(await tokenSale.wallets(8)));
    });

   
    it("should perform assertions while initializing", async () => {
        let tokenSale = await createTokenSale(accounts);

        await expectThrow(initializeTokenSale(tokenSale, accounts, { totalSupply: 0 }), '_totalSupply should be > 0');
        await expectThrow(initializeTokenSale(tokenSale, accounts, { totalSupply: TOTAL_SHARES }), '_totalSupply should be more than totalReservedTokens()');
        await expectThrow(initializeTokenSale(tokenSale, accounts, { startTime: 10, otherStartTime: 9 }), '_firstWindowStartTime should be < _otherWindowsStartTime');
        await expectThrow(initializeTokenSale(tokenSale, accounts, { numberOfOtherWindows: 0 }), '_numberOfOtherWindows should be > 0');

        // Check that at totalSupply bigger than all shares for at least on 1 token is OK
        await initializeTokenSale(tokenSale, accounts, { totalSupply: TOTAL_SHARES_PLUS_ONE });
    });

    it("should return correct token amount while calling createOnWindow()", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        assert.equal(DEFAULT_TOKENS_IN_FIRST_PERIOD, (await tokenSale.createOnWindow(0)).toString(10));
        assert.equal(DEFAULT_TOKENS_IN_OTHER_PERIOD, (await tokenSale.createOnWindow(1)).toString(10));
        assert.equal(DEFAULT_TOKENS_IN_OTHER_PERIOD, (await tokenSale.createOnWindow(180)).toString(10));
        assert.equal(DEFAULT_TOKENS_IN_OTHER_PERIOD, (await tokenSale.createOnWindow(360)).toString(10));
    });

    it("should return correct window while calling windowFor()", async () => {
        let tokenSale = await createTokenSale(accounts);
        let startTime = new Date().getTime();
        let otherStartTime = startTime + 100;

        await initializeTokenSale(tokenSale, accounts, {
            startTime: startTime,
            otherStartTime: otherStartTime,
            numberOfOtherWindows: 237
        });

        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        assert.equal(0, await tokenSale.windowFor(startTime));
        assert.equal(0, await tokenSale.windowFor(startTime + 50));
        assert.equal(0, await tokenSale.windowFor(startTime + 99));
        assert.equal(1, await tokenSale.windowFor(otherStartTime));
        assert.equal(2, await tokenSale.windowFor(otherStartTime + WINDOW_DURATION_IN_SEC));
        assert.equal(3, await tokenSale.windowFor(otherStartTime + WINDOW_DURATION_IN_SEC * 2));
        assert.equal(4, await tokenSale.windowFor(otherStartTime + WINDOW_DURATION_IN_SEC * 3));
    });

    it("should return 0 while calling today()", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        assert.equal(0, (await tokenSale.today()).toString(10));
    });

    it("should be able to call pauseTokenTransfer() by the owner of tokenSale", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        // First, need to unpause transfer, because it is already paused. Otherwise we will get an error.
        await tokenSale.unpauseTokenTransfer({ from: accounts[0] });

        await tokenSale.pauseTokenTransfer({ from: accounts[0] });
        await expectThrow(tokenSale.pauseTokenTransfer({ from: accounts[1] }), 'Ownable: caller is not the owner');

        let token = await getTokenFromTokenSale(tokenSale);

        assert.equal(true, await token.paused());

        // Check that it is impossible to call pause on token contract directly
        await expectThrow(token.pause({ from: accounts[0] }), 'Ownable: caller is not the owner');
    });

    it("should be able to call pauseTokenSale() by the owner of tokenSale", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        await tokenSale.pauseTokenSale({ from: accounts[0] });
        await expectThrow(tokenSale.pauseTokenSale({ from: accounts[1] }), 'Ownable: caller is not the owner');

        assert.equal(true, await tokenSale.tokenSalePaused());
    });

    it("should be able to call unpauseTokenSale() by the owner of tokenSale", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        await tokenSale.pauseTokenSale({ from: accounts[0] });
        assert.equal(true, await tokenSale.tokenSalePaused());

        await expectThrow(tokenSale.unpauseTokenSale({ from: accounts[1] }), 'Ownable: caller is not the owner');

        await tokenSale.unpauseTokenSale({ from: accounts[0] });
        assert.equal(false, await tokenSale.tokenSalePaused());
    });

    it("should be able to call unpauseTokenTransfer() by the owner of tokenSale", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        await tokenSale.unpauseTokenTransfer({ from: accounts[0] });
        await expectThrow(tokenSale.unpauseTokenTransfer({ from: accounts[1] }), 'Ownable: caller is not the owner');

        let token = await getTokenFromTokenSale(tokenSale);

        assert.equal(false, await token.paused());

        // Check that it is impossible to call unpause on token contract directly
        await expectThrow(token.unpause({ from: accounts[0] }), 'Ownable: caller is not the owner');
    });

    // it("should be able to call burnTokens() by the owner of tokenSale", async () => {
    //     let tokenSale = await createTokenSale(accounts);

    //     await initializeTokenSale(tokenSale, accounts);
    //     await setTokensPerPeriod(tokenSale, accounts);
    //     await tokenSale.distributeShares({ from: accounts[0] });
    //     await tokenSale.begin({ from: accounts[0] });

    //     await tokenSale.burnTokens(MARKETING_ACCOUNT, '1000', { from: accounts[0] });
    //     await expectThrow(tokenSale.burnTokens(MARKETING_ACCOUNT, '1000', { from: accounts[1] }), 'Ownable: caller is not the owner');

    //     let token = await getTokenFromTokenSale(tokenSale);

    //     assert.equal(
    //         new BigNumber(MARKETING_SHARE).minus(new BigNumber('1000')).toString(10),
    //         (await token.balanceOf(MARKETING_ACCOUNT)).toString(10)
    //     );

    //     // Check that it is impossible to call burn on token contract directly
    //     await expectThrow(token.burn(MARKETING_ACCOUNT, '1000', { from: accounts[0] }), 'Ownable: caller is not the owner');
    // });

    it("should not be able to transfer tokens while pause", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        let token = await getTokenFromTokenSale(tokenSale);

        await expectThrow(token.transfer(accounts[1], '1000'), 'Pausable: paused');

        // Check transferFrom
        await token.approve(accounts[1], '1000', { from: accounts[0] });
        await expectThrow(token.transferFrom(accounts[0], accounts[1], '1000', { from: accounts[0] }), 'Pausable: paused');
    });

    it("should not be able to call transfer on token contract directly", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        let token = await getTokenFromTokenSale(tokenSale);

        await expectThrow(token.transfer(accounts[1], '1000'), 'Ownable: caller is not the owner');
    });

    it("should not be able to call collect() while period 0", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        // also try to call from accounts[1], which is not the owner (it's ok to call by non-owner account)
        await expectThrow(tokenSale.collect({ from: accounts[1] }), 'today() should be > 0');
    });

    it("should be able to call collectUnsoldTokens() by the owner of tokenSale", async () => {
        let tokenSale = await createTokenSale(accounts);

        await initializeTokenSale(tokenSale, accounts);
        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        // also try to call from accounts[1], which is not the owner (it's ok to call by non-owner account)
        await expectThrow(tokenSale.collectUnsoldTokens(1, { from: accounts[1] }), 'today() should be > 0');
    });

    it("should perform assertions while buying tokens", async () => {
        let tokenSale = await createTokenSale(accounts);

        let startTime = parseInt((new Date().getTime() / 1000) - 1000, 10);
        let otherStartTime = startTime + FIRST_PERIOD_DURATION_IN_SEC;

        await initializeTokenSale(tokenSale, accounts, {
            startTime: startTime,
            otherStartTime: otherStartTime
        });

        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });

        await expectThrow(tokenSale.buy({ from: accounts[1], value: '1000000000000000000' }), 'began should be == true');
       
        await tokenSale.begin({ from: accounts[0] });

        await expectThrow(tokenSale.buy({ from: accounts[1], value: '99999999999999999' }), 'msg.value should be >= MIN_ETH');
        await expectThrow(tokenSale.buyWithLimit(999, 0, { from: accounts[1], value: '1000000000000000000' }), 'window should be <= numberOfOtherWindows');
    });

    it("should be impossible to buy tokens if the token sale is paused", async () => {
        let tokenSale = await createTokenSale(accounts);

        let startTime = parseInt((new Date().getTime() / 1000) - 1000, 10);
        let otherStartTime = startTime + FIRST_PERIOD_DURATION_IN_SEC;

        await initializeTokenSale(tokenSale, accounts, {
            startTime: startTime,
            otherStartTime: otherStartTime
        });

        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });
        await tokenSale.pauseTokenSale({ from: accounts[0] });

        await expectThrow(tokenSale.buy({ from: accounts[1], value: '1000000000000000000' }), 'tokenSalePaused should be == false');
    });

    it("should be able to buy tokens by sending ETH to TokenSale contract", async () => {
        let tokenSale = await createTokenSale(accounts);

        let startTime = parseInt((new Date().getTime() / 1000) - 1000, 10);
        let otherStartTime = startTime + FIRST_PERIOD_DURATION_IN_SEC;

        await initializeTokenSale(tokenSale, accounts, {
            startTime: startTime,
            otherStartTime: otherStartTime
        });

        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        await web3.eth.sendTransaction({ from: accounts[1], to: tokenSale.address, value: '1000000000000000000' });

        assert.equal('1000000000000000000', (await tokenSale.totalRaisedETH()).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.userBuys(0, accounts[1])).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.dailyTotals(0)).toString(10));

        // The same buy explicitly calling buy()
        await tokenSale.buy({ from: accounts[2], value: '1000000000000000000' });

        assert.equal('2000000000000000000', (await tokenSale.totalRaisedETH()).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.userBuys(0, accounts[2])).toString(10));
        assert.equal('2000000000000000000', (await tokenSale.dailyTotals(0)).toString(10));
    });

    it("should be able to buy tokens for a specific window", async () => {
        let tokenSale = await createTokenSale(accounts);

        let startTime = parseInt((new Date().getTime() / 1000) - 1000, 10);
        let otherStartTime = startTime + FIRST_PERIOD_DURATION_IN_SEC;

        await initializeTokenSale(tokenSale, accounts, {
            startTime: startTime,
            otherStartTime: otherStartTime
        });

        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        /////////////////////////////////////////////////////
        // Window 0
        /////////////////////////////////////////////////////
        await tokenSale.buyWithLimit(0, 0, { from: accounts[1], value: '1000000000000000000' });

        assert.equal('1000000000000000000', (await tokenSale.totalRaisedETH()).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.userBuys(0, accounts[1])).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.dailyTotals(0)).toString(10));

        await tokenSale.buyWithLimit(0, 0, { from: accounts[1], value: '1000000000000000000' });

        assert.equal('2000000000000000000', (await tokenSale.totalRaisedETH()).toString(10));
        assert.equal('2000000000000000000', (await tokenSale.userBuys(0, accounts[1])).toString(10));
        assert.equal('2000000000000000000', (await tokenSale.dailyTotals(0)).toString(10));

        // Check limit
        await expectThrow(tokenSale.buyWithLimit(0, '199999999999999999', { from: accounts[1], value: '1000000000000000000' }), 'dailyTotals[window] should be <= limit');
        await tokenSale.buyWithLimit(0, '2000000000000000000', { from: accounts[1], value: '1000000000000000000' })

        assert.equal('3000000000000000000', (await tokenSale.totalRaisedETH()).toString(10));
        assert.equal('3000000000000000000', (await tokenSale.userBuys(0, accounts[1])).toString(10));
        assert.equal('3000000000000000000', (await tokenSale.dailyTotals(0)).toString(10));

        /////////////////////////////////////////////////////
        // Window 1
        /////////////////////////////////////////////////////
        await tokenSale.buyWithLimit(1, 0, { from: accounts[1], value: '1000000000000000000' });

        assert.equal('4000000000000000000', (await tokenSale.totalRaisedETH()).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.userBuys(1, accounts[1])).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.dailyTotals(1)).toString(10));

        /////////////////////////////////////////////////////
        // Last window
        /////////////////////////////////////////////////////
        await tokenSale.buyWithLimit(NUMBER_OF_OTHER_WINDOWS, 0, { from: accounts[1], value: '1000000000000000000' });

        assert.equal('5000000000000000000', (await tokenSale.totalRaisedETH()).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.userBuys(NUMBER_OF_OTHER_WINDOWS, accounts[1])).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.dailyTotals(NUMBER_OF_OTHER_WINDOWS)).toString(10));
    });

    it("should be able to collect ETH and transfer them to benificiary", async () => {
        let tokenSale = await createTokenSale(accounts);

        let startTime = parseInt(new Date().getTime() / 1000, 10);
        let otherStartTime = startTime + 10;

        await initializeTokenSale(tokenSale, accounts, {
            startTime: startTime,
            otherStartTime: otherStartTime
        });

        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        await tokenSale.buyWithLimit(0, 0, { from: accounts[1], value: '1000000000000000000' });

        assert.equal('1000000000000000000', (await tokenSale.totalRaisedETH()).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.userBuys(0, accounts[1])).toString(10));
        assert.equal('1000000000000000000', (await tokenSale.dailyTotals(0)).toString(10));

        await tokenSale.buyWithLimit(0, 0, { from: accounts[1], value: '1000000000000000000' });

        assert.equal('2000000000000000000', (await tokenSale.totalRaisedETH()).toString(10));
        assert.equal('2000000000000000000', (await tokenSale.userBuys(0, accounts[1])).toString(10));
        assert.equal('2000000000000000000', (await tokenSale.dailyTotals(0)).toString(10));

        await wait(4000);

        let currentBalanceDefaultAccount = new BigNumber(await web3.eth.getBalance(accounts[0]));
        let currentBalanceBenificiaryAccount = new BigNumber(await web3.eth.getBalance(BENIFICIARY_ACCOUNT));

        await expectThrow(tokenSale.renounceOwnership({ from: accounts[0] }), 'address(this).balance should be == 0');
        
        await tokenSale.collect({ from: accounts[1] });

        assert.equal(currentBalanceBenificiaryAccount.plus('2000000000000000000').toString(10), new BigNumber(await web3.eth.getBalance(BENIFICIARY_ACCOUNT)).toString(10));
        assert.equal(currentBalanceDefaultAccount.toString(10), new BigNumber(await web3.eth.getBalance(accounts[0])).toString(10));
        await tokenSale.renounceOwnership();

        assert.equal('0x0000000000000000000000000000000000000000', await tokenSale.owner());
    });

  

    it("should be able to collect unsold tokens and transfer them to UNSOLD_TOKENS_ACCOUNT", async () => {
        let tokenSale = await createTokenSale(accounts);

        let startTime = parseInt(new Date().getTime() / 1000, 10);
        let otherStartTime = startTime + 1;

        await initializeTokenSale(tokenSale, accounts, {
            startTime: startTime,
            otherStartTime: otherStartTime
        });

        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        // go to window 1
        await wait(2000); // 9 seconds left to new window
        await tokenSale.buyWithLimit(1, 0, { from: accounts[1], value: '1000000000000000000' });

        let token = await getTokenFromTokenSale(tokenSale);
        let currentBalance = new BigNumber(await token.balanceOf(UNSOLD_TOKENS_ACCOUNT));

        await tokenSale.setCreatePerFirstPeriod('1000', { from: accounts[0] });
        await tokenSale.setCreatePerOtherPeriod('500', { from: accounts[0] });
        await tokenSale.collectUnsoldTokens(1, { from: accounts[0] });

        assert.equal((await token.balanceOf(UNSOLD_TOKENS_ACCOUNT)).toString(10), currentBalance.plus('1000').toString(10));

        await expectThrow(tokenSale.collectUnsoldTokens(1, { from: accounts[1] }), 'window should be > collectedUnsoldTokensBeforeWindow');

        // go to window 2
        await wait(10000); // 9 seconds left to new window

        // go to window 3
        await wait(10000); // 9 seconds left to new window

        // go to window 4
        await wait(10000); // 9 seconds left to new window

        await tokenSale.buyWithLimit(4, 0, { from: accounts[1], value: '1000000000000000000' });
        await tokenSale.collectUnsoldTokens(4, { from: accounts[1] });

        assert.equal((await token.balanceOf(UNSOLD_TOKENS_ACCOUNT)).toString(10), currentBalance.plus('1000').plus('500').plus('500').toString(10));

        await expectThrow(tokenSale.collectUnsoldTokens(4, { from: accounts[0] }), 'window should be > collectedUnsoldTokensBeforeWindow');
    });

    it("should be able to claim tokens after user bought them", async () => {
        let tokenSale = await createTokenSale(accounts);

        let startTime = Number(await tokenSale.time());
        console.log(startTime);
        // 0 window lasts 3 seconds
        let otherStartTime = startTime + 3;

        await initializeTokenSale(tokenSale, accounts, {
            startTime: startTime,
            otherStartTime: otherStartTime
        });

        await setTokensPerPeriod(tokenSale, accounts);
        await tokenSale.distributeShares({ from: accounts[0] });
        await tokenSale.begin({ from: accounts[0] });

        
        assert.equal((await tokenSale.createPerFirstWindow()).toString(10), DEFAULT_TOKENS_IN_FIRST_PERIOD);
        assert.equal((await tokenSale.createPerOtherWindow()).toString(10), DEFAULT_TOKENS_IN_OTHER_PERIOD);
        
        await tokenSale.buy({ from: accounts[1], value: '1000000000000000000' });
        await tokenSale.buy({ from: accounts[2], value: '2000000000000000000' });
        
        // total on window 0 = 3 eth
        
        // check that it's not yet allowed to claim tokens for windows 0

        console.log('fffff', Number(await tokenSale.time()) > otherStartTime);
        await expectThrow(tokenSale.claim(0, { from: accounts[1] }), 'today() should be > window');
        //return;
        await expectThrow(tokenSale.claim(0, { from: accounts[2] }), 'today() should be > window');

        // go to window 1
        await wait(3000);

        // check that users can claim tokens for window 0
        let token = await getTokenFromTokenSale(tokenSale);
        let acc1Balance = new BigNumber(await token.balanceOf(accounts[1]));
        let acc2Balance = new BigNumber(await token.balanceOf(accounts[2]));

        await tokenSale.claim(0, { from: accounts[1] });
        await tokenSale.claim(0, { from: accounts[2] });

        let acc1BalanceNew = acc1Balance.plus('4999999999999999999950000');
        let acc2BalanceNew = acc2Balance.plus('9999999999999999999900000');
        let totalBoughtTokens = new BigNumber('14999999999999999999850000');

        assert.equal(new BigNumber(await token.balanceOf(accounts[1])).toString(10), acc1BalanceNew.toString(10), 'claim w0 acc1');
        assert.equal(new BigNumber(await token.balanceOf(accounts[2])).toString(10), acc2BalanceNew.toString(10), 'claim w0 acc2');
        assert.equal(new BigNumber(await tokenSale.totalBoughtTokens()).toString(10), totalBoughtTokens.toString(10), 'claim w0 total');

        // If user tries to claim once more on the same window, do nothing
        await tokenSale.claim(0, { from: accounts[1] });
        await tokenSale.claim(0, { from: accounts[2] });

        assert.equal(new BigNumber(await token.balanceOf(accounts[1])).toString(10), acc1BalanceNew.toString(10), 'claim w0 acc1');
        assert.equal(new BigNumber(await token.balanceOf(accounts[2])).toString(10), acc2BalanceNew.toString(10), 'claim w0 acc2');
        assert.equal(new BigNumber(await tokenSale.totalBoughtTokens()).toString(10), totalBoughtTokens.toString(10), 'claim w0 total');

        // Now make purchases for window 1 (it is active)
        await tokenSale.buyWithLimit(1, 0, { from: accounts[1], value: '1000000000000000000' });
        await tokenSale.buyWithLimit(1, 0, { from: accounts[2], value: '1000000000000000000' });

        // total on window 1 = 2 eth

        // check that it's not yet allowed to claim tokens for windows 1
        await expectThrow(tokenSale.claim(1, { from: accounts[1] }), 'today() should be > window');
        await expectThrow(tokenSale.claim(1, { from: accounts[2] }), 'today() should be > window');

        // now check that we can buy tokens for next window as well, even if currently it is window 1
        tokenSale.buyWithLimit(2, 0, { from: accounts[1], value: '1000000000000000000' });

        // go to window 2
        await wait(10000);

        await tokenSale.claim(1, { from: accounts[1] });
        await tokenSale.claim(1, { from: accounts[2] });

        acc1BalanceNew = acc1BalanceNew.plus('2500000000000000000000000');
        acc2BalanceNew = acc2BalanceNew.plus('2500000000000000000000000');
        totalBoughtTokens = totalBoughtTokens.plus('5000000000000000000000000');

        assert.equal(new BigNumber(await token.balanceOf(accounts[1])).toString(10), acc1BalanceNew.toString(10), 'claim w1 acc1');
        assert.equal(new BigNumber(await token.balanceOf(accounts[2])).toString(10), acc2BalanceNew.toString(10), 'claim w1 acc2');
        assert.equal(new BigNumber(await tokenSale.totalBoughtTokens()).toString(10), totalBoughtTokens.toString(10), 'claim w1 total');

        // If user tries to claim once more on the same window, do nothing
        await tokenSale.claim(1, { from: accounts[1] });
        await tokenSale.claim(1, { from: accounts[2] });

        assert.equal(new BigNumber(await token.balanceOf(accounts[1])).toString(10), acc1BalanceNew.toString(10), 'claim w1 acc1');
        assert.equal(new BigNumber(await token.balanceOf(accounts[2])).toString(10), acc2BalanceNew.toString(10), 'claim w1 acc2');
        assert.equal(new BigNumber(await tokenSale.totalBoughtTokens()).toString(10), totalBoughtTokens.toString(10), 'claim w1 total');

        // check that it's not yet allowed to claim tokens for windows 2
        await expectThrow(tokenSale.claim(2, { from: accounts[1] }), 'today() should be > window');

        // go to window 3
        await wait(10000);

        await tokenSale.claim(2, { from: accounts[1] });

        acc1BalanceNew = acc1BalanceNew.plus('5000000000000000000000000');
        totalBoughtTokens = totalBoughtTokens.plus('5000000000000000000000000');

        assert.equal(new BigNumber(await token.balanceOf(accounts[1])).toString(10), acc1BalanceNew.toString(10), 'claim w2 acc1');
        assert.equal(new BigNumber(await token.balanceOf(accounts[2])).toString(10), acc2BalanceNew.toString(10), 'claim w2 acc2');
        assert.equal(new BigNumber(await tokenSale.totalBoughtTokens()).toString(10), totalBoughtTokens.toString(10), 'claim w2 total');

        // If user tries to claim once more on the same window, do nothing
        await tokenSale.claim(2, { from: accounts[1] });
        await tokenSale.claim(2, { from: accounts[2] });

        assert.equal(new BigNumber(await token.balanceOf(accounts[1])).toString(10), acc1BalanceNew.toString(10), 'claim w2 acc1');
        assert.equal(new BigNumber(await token.balanceOf(accounts[2])).toString(10), acc2BalanceNew.toString(10), 'claim w2 acc2');
        assert.equal(new BigNumber(await tokenSale.totalBoughtTokens()).toString(10), totalBoughtTokens.toString(10), 'claim w2 total');
    });
});
