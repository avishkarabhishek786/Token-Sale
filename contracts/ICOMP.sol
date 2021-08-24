// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

interface CompInterface {
    
    function balanceOf(address account) external view returns (uint);

    function transfer(address dst, uint rawAmount) external returns (bool);

    function transferFrom(address src, address dst, uint rawAmount) external returns (bool);

    function totalTokenSupply() external view returns (uint);

    function approve(address spender, uint rawAmount) external returns (bool);

    function allowance(address account, address spender) external view returns (uint);

}