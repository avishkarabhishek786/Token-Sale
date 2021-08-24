// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

import './Ownable.sol';
import './Token.sol';
import './SafeMath.sol';
import './Creator.sol';

import "hardhat/console.sol";

contract TokenSale is Ownable {

    using SafeMath for uint256;

    uint constant public MIN_ETH = 0.1 ether; // !!! for real ICO change to 0.1 ether
    uint constant public WINDOW_DURATION = 23 hours; // !!! for real ICO change to 23 hours

    uint constant public MARKETING_SHARE = 1000000 ether;
    uint constant public TEAM_MEMBER_1_SHARE = 250000 ether;
    uint constant public TEAM_MEMBER_2_SHARE = 250000 ether;
    uint constant public TEAM_MEMBER_3_SHARE = 250000 ether;
    uint constant public TEAM_MEMBER_4_SHARE = 250000 ether;
    uint constant public USDAO_FOUNDATION_SHARE = 1000000 ether;
    uint constant public USDAO_FOUNDATION_PERIOD_LENGTH = 365 days; // !!! for real ICO change to 365 days
    uint constant public USDAO_FOUNDATION_PERIODS = 10; // 10 years (!!! for real ICO it would be 10 years)
    uint constant public USDAO_COMPANY_SHARE = 1000000 ether;
    uint constant public USDAO_COMPANY_PERIOD_LENGTH = 365 days; // !!! for real ICO change to 365 days
    uint constant public USDAO_COMPANY_PERIODS = 10; // 10 years (!!! for real ICO it would be 10 years)

    address[9] public wallets = [
        // USDAO.org foundation
        0x70997970C51812dc3A010C7d01b50e0d17dc79C8,

        // USDAO company
        0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,

        // Marketing
        0x90F79bf6EB2c4f870365E785982E1f101E93b906,

        // Team member 1
        0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65,

        // Team member 2
        0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc,

        // Team member 3
        0x976EA74026E726554dB657fA54763abd0C3a0aa9,

        // Team member 4
        0x14dC79964da2C08b23698B3D3cc7Ca32193d9955,

        // Unsold tokens taker
        0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f,

        // Beneficiary
        0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
    ];

    Token public token;                 // The Token token itself
    TokenEscrow public tokenEscrow;

    uint public totalSupply;           // Total Token amount created

    uint public firstWindowStartTime;  // Time of window 1 opening
    uint public createPerFirstWindow;  // Tokens sold in window 1

    uint public otherWindowsStartTime; // Time of other windows opening
    uint public numberOfOtherWindows;  // Number of other windows
    uint public createPerOtherWindow;  // Tokens sold in each window after window 1

    uint public totalBoughtTokens;
    uint public totalRaisedETH;
    uint public totalBulkPurchasedTokens;

    uint public collectedUnsoldTokensBeforeWindow = 0;

    bool public initialized = false;
    bool public tokensPerPeriodAreSet = false;
    bool public distributedShares = false;
    bool public began = false;
    bool public tokenSalePaused = false;

    mapping(uint => uint) public dailyTotals;
    mapping(uint => mapping(address => uint)) public userBuys;
    mapping(uint => mapping(address => bool)) public claimed;

    event LogBuy           (uint window, address user, uint amount);
    event LogClaim         (uint window, address user, uint amount);
    event LogCollect       (uint amount);
    event LogCollectUnsold (uint amount);

    constructor(Creator creator) {
        token = creator.token();

        require(token.totalSupply() > 0, "Total supply of Token should be greater than 0");

        tokenEscrow = creator.createTokenEscrow();

        require(tokenEscrow.owner() == address(this), "Invalid owner of the TokenEscrow");
        require(tokenEscrow.unlockStart() == 0, "TokenEscrow.unlockStart should be 0");
    }

    function renounceOwnership() public override onlyOwner {
        require(address(this).balance == 0, "address(this).balance should be == 0");

        super.renounceOwnership();
    }

    function initialize(
        uint _totalSupply,
        uint _firstWindowStartTime,
        uint _otherWindowsStartTime,
        uint _numberOfOtherWindows
    ) public onlyOwner {
        require(token.owner() == address(this), "Invalid owner of the Token");
        token.setPausableException(address(tokenEscrow), true);
        token.setPausableException(address(this), true);
        token.setPausableException(wallets[2], true);
        token.setPausableException(wallets[7], true);

        require(initialized == false, "initialized should be == false");
        require(_totalSupply > 0, "_totalSupply should be > 0");
        require(_firstWindowStartTime < _otherWindowsStartTime, "_firstWindowStartTime should be < _otherWindowsStartTime");
        require(_numberOfOtherWindows > 0, "_numberOfOtherWindows should be > 0");
        require(_totalSupply > totalReservedTokens(), "_totalSupply should be more than totalReservedTokens()");

        numberOfOtherWindows = _numberOfOtherWindows;
        totalSupply = _totalSupply;
        firstWindowStartTime = _firstWindowStartTime;
        otherWindowsStartTime = _otherWindowsStartTime;

        initialized = true;

        //token.transfer(address(this), totalSupply);
    }

    function addBulkPurchasers(address[] memory _purchasers, uint[] memory _tokens) public onlyOwner {
        require(initialized == true, "initialized should be == true");
        require(tokensPerPeriodAreSet == false, "tokensPerPeriodAreSet should be == false");

        uint count = _purchasers.length;

        require(count > 0, "count should be > 0");
        require(count == _tokens.length, "count should be == _tokens.length");

        for (uint i = 0; i < count; i++) {
            require(_tokens[i] > 0, "_tokens[i] should be > 0");
            token.transfer(_purchasers[i], _tokens[i]);
            totalBulkPurchasedTokens = totalBulkPurchasedTokens.add(_tokens[i]);
        }

        // console.log("token.balanceOf(address(token))", token.balanceOf(address(token)));
        // console.log("totalReservedTokens()", totalReservedTokens());
        // console.log("token.balanceOf(address(token)) > totalReservedTokens()", token.balanceOf(address(token)) > totalReservedTokens());

        require(
            token.balanceOf(address(token)) > totalReservedTokens(),
            "token.balanceOf(address(token)) should be > totalReservedTokens() after bulk purchases"
        );
    }

    function setTokensPerPeriods(uint _firstPeriodTokens, uint _otherPeriodTokens) public onlyOwner {
        require(initialized == true, "initialized should be == true");
        require(began == false, "began should be == false");

        tokensPerPeriodAreSet = true;

        uint totalTokens = _firstPeriodTokens.add(_otherPeriodTokens.mul(numberOfOtherWindows));

        require(
            totalSupply.sub(totalReservedTokens()).sub(totalBulkPurchasedTokens) == totalTokens,
            "totalSupply.sub(totalReservedTokens()).sub(totalBulkPurchasedTokens) should be == totalTokens"
        );

        createPerFirstWindow = _firstPeriodTokens;
        createPerOtherWindow = _otherPeriodTokens;
    }

    function distributeShares() public onlyOwner {
        require(tokensPerPeriodAreSet == true, "tokensPerPeriodAreSet should be == true");
        require(distributedShares == false, "distributedShares should be == false");

        distributedShares = true;

        token.transfer(address(tokenEscrow), USDAO_COMPANY_SHARE.add(USDAO_FOUNDATION_SHARE));
        token.transfer(wallets[2], MARKETING_SHARE);
        token.transfer(wallets[3], TEAM_MEMBER_1_SHARE);
        token.transfer(wallets[4], TEAM_MEMBER_2_SHARE);
        token.transfer(wallets[5], TEAM_MEMBER_3_SHARE);
        token.transfer(wallets[6], TEAM_MEMBER_4_SHARE);

        tokenEscrow.addShare(wallets[0], 50, USDAO_FOUNDATION_PERIODS, USDAO_FOUNDATION_PERIOD_LENGTH);
        tokenEscrow.addShare(wallets[1], 50, USDAO_COMPANY_PERIODS, USDAO_COMPANY_PERIOD_LENGTH);
        tokenEscrow.setUnlockStart(time());

        // We pause all transfers and minting.
        // We allow to use transfer() function ONLY for tokenEscrow contract,
        // because it is an escrow and it should allow to transfer tokens to a certain party.
        pauseTokenTransfer();
    }

    function totalReservedTokens() public pure returns (uint) {
        return MARKETING_SHARE
            .add(TEAM_MEMBER_1_SHARE)
            .add(TEAM_MEMBER_2_SHARE)
            .add(TEAM_MEMBER_3_SHARE)
            .add(TEAM_MEMBER_4_SHARE)
            .add(USDAO_COMPANY_SHARE)
            .add(USDAO_FOUNDATION_SHARE);
    }

    function begin() public onlyOwner {
        require(distributedShares == true, "distributedShares should be == true");
        require(began == false, "began should be == false");

        began = true;
    }

    function pauseTokenTransfer() public onlyOwner {
        token.pause();
    }

    function unpauseTokenTransfer() public onlyOwner {
        token.unpause();
    }

    function pauseTokenSale() public onlyOwner {
        tokenSalePaused = true;
    }

    function unpauseTokenSale() public onlyOwner {
        tokenSalePaused = false;
    }

    function removePausableException(address _address) public onlyOwner {
        token.setPausableException(_address, false);
    }

    function time() public view returns (uint) {
        return block.timestamp;
    }

    function today() public view returns (uint) {
        return windowFor(time());
    }

    function windowDuration() public virtual pure returns (uint) {
        return WINDOW_DURATION;
    }

    // Each window is windowDuration() (23 hours) long so that end-of-window rotates
    // around the clock for all timezones.
    function windowFor(uint timestamp) public view returns (uint) {
        console.log("timestamp %s otherWindowsStartTime %s", timestamp, otherWindowsStartTime);
        return timestamp < otherWindowsStartTime
        ? 0
        : timestamp.sub(otherWindowsStartTime).div(windowDuration()).add(1);
    }

    function createOnWindow(uint window) public view returns (uint) {
        return window == 0 ? createPerFirstWindow : createPerOtherWindow;
    }

    // This method provides the buyer some protections regarding which
    // day the buy order is submitted and the maximum price prior to
    // applying this payment that will be allowed.
    function buyWithLimit(uint window, uint limit) public payable {
        //console.log("began", began);
        require(began == true, "began should be == true");
        require(tokenSalePaused == false, "tokenSalePaused should be == false");
        //console.log("time() %s firstWindowStartTime %s", time(), firstWindowStartTime);
        require(time() >= firstWindowStartTime, "time() should be >= firstWindowStartTime");
        require(today() <= numberOfOtherWindows, "today() should be <= numberOfOtherWindows");
        require(msg.value >= MIN_ETH, "msg.value should be >= MIN_ETH");
        //console.log("window %s today %s", window, today());
        require(window >= today(), "window should be >= today()");
        require(window <= numberOfOtherWindows, "window should be <= numberOfOtherWindows");

        if (limit != 0) {
            require(dailyTotals[window] <= limit, "dailyTotals[window] should be <= limit");
        }

        userBuys[window][msg.sender] = userBuys[window][msg.sender].add(msg.value);
        dailyTotals[window] = dailyTotals[window].add(msg.value);
        totalRaisedETH = totalRaisedETH.add(msg.value);

        emit LogBuy(window, msg.sender, msg.value);
    }

    function buy() public payable {
        buyWithLimit(today(), 0);
    }

    fallback() external payable {
        buy();
    }

    receive() external payable {
        buy();
    }

    function claim(uint window) public {
        require(began == true, "began should be == true");
        console.log("today() %s window %s", today(), window);
        console.log("claim %s", today() > window);
        require(today() > window, "today() should be > window");

        if (claimed[window][msg.sender] || dailyTotals[window] == 0 || userBuys[window][msg.sender] == 0) {
            return;
        }

        // 100 ether below is 100% * 10^18
        uint256 userEthShare = userBuys[window][msg.sender].mul(100 ether).div(dailyTotals[window]);
        uint256 reward = (createOnWindow(window)).mul(userEthShare).div(100 ether);

        totalBoughtTokens = totalBoughtTokens.add(reward);
        claimed[window][msg.sender] = true;
        token.transfer(msg.sender, reward);

        emit LogClaim(window, msg.sender, reward);
    }

    function claimAll() public {
        require(began == true, "began should be == true");

        for (uint i = 0; i < today(); i++) {
            claim(i);
        }
    }

    // Crowdsale owners can collect ETH  number of times
    // #Abhishek A modifier can be added to prevent anyone to call this function
    function collect() public {
        require(began == true, "began should be == true");
        require(today() > 0, "today() should be > 0");
        // Prevent recycling during window 0

        uint balance = address(this).balance;
        payable(wallets[8]).transfer(address(this).balance);

        emit LogCollect(balance);
    }

    function collectUnsoldTokens(uint window) public {
        require(began == true, "began should be == true");
        require(today() > 0, "today() should be > 0");
        require(window <= today(), "window should be <= today()");
        require(window > collectedUnsoldTokensBeforeWindow, "window should be > collectedUnsoldTokensBeforeWindow");

        uint unsoldTokens = 0;

        for (uint i = collectedUnsoldTokensBeforeWindow; i < window; i++) {
            uint dailyTotal = dailyTotals[i];

            if (dailyTotal == 0) {
                unsoldTokens = unsoldTokens.add(i == 0 ? createPerFirstWindow : createPerOtherWindow);
            }
        }

        collectedUnsoldTokensBeforeWindow = window;

        if (unsoldTokens > 0) {
            token.transfer(wallets[7], unsoldTokens);
        }

        emit LogCollectUnsold(unsoldTokens);
    }
}
