// Copyright (c) 2019-2020 revolutionpopuli.com

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

import './Address.sol';
import './PausableWithException.sol';
import './ICOMP.sol';

import "hardhat/console.sol";

contract Token is PausableWithException {

    using Address for address;
    
    CompInterface public comp;    
    constructor(address comp_) {
        comp = CompInterface(comp_);
    }

    function pause() public onlyOwner {
        super._pause();
    }

    function unpause() public onlyOwner {
        super._unpause();
    }

    function transfer(address recipient, uint256 amount) public onlyOwner whenNotPaused returns (bool) {
        // console.log("Token contract address %s", address(this));
        // console.log("Token contract balance is %s tokens", balanceOf(address(this)));
        
        // console.log("Token transfer msg.sender %s", msg.sender);
        // console.log("Token transfer msg.sender balance is %s tokens", balanceOf(address(msg.sender)));
        
        return comp.transfer(recipient, amount);
    }

    function allowance(address account, address spender) external view returns (uint) {
        return comp.allowance(account, spender);
    }

    function approve(address spender, uint rawAmount) external returns (bool) {
        return comp.approve(spender, rawAmount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) public onlyOwner whenNotPausedWithoutException returns (bool) {
        return comp.transferFrom(sender, recipient, amount);
    }

    function balanceOf(address account) public view virtual returns (uint256) {
        return comp.balanceOf(account);
    }

    function totalSupply() public view returns (uint) {
        return comp.totalTokenSupply();
    }

}
