// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TenantPassport is ERC721Enumerable, Ownable {
    struct TenantInfo {
        uint256 reputation; // Reputation score out of 100
        uint256 paymentsMade;
        uint256 paymentsMissed;
        uint256 outstandingBalance;
    }

    mapping(uint256 => TenantInfo) public tenantInfo;
    address public rentalAgreementAddress;

    constructor() ERC721("Tenant Passport", "TP") {
        _transferOwnership(msg.sender);
    }

    function mint(address to, uint256 tokenId) public onlyOwner {
        _mint(to, tokenId);
        tenantInfo[tokenId] = TenantInfo({
            reputation: 100,
            paymentsMade: 0,
            paymentsMissed: 0,
            outstandingBalance: 0
        });
    }

    function mintForSelf() public {
        uint256 tokenId = uint256(uint160(msg.sender));
        require(_ownerOf(tokenId) == address(0), "Tenant Passport already exists for this address");
        _mint(msg.sender, tokenId);
        tenantInfo[tokenId] = TenantInfo({
            reputation: 100,
            paymentsMade: 0,
            paymentsMissed: 0,
            outstandingBalance: 0
        });
    }

    function updateTenantInfo(
        uint256 tokenId,
        uint256 newReputation,
        uint256 paymentsMade,
        uint256 paymentsMissed,
        uint256 outstandingBalance
    ) public onlyOwner {
        tenantInfo[tokenId].reputation = newReputation;
        tenantInfo[tokenId].paymentsMade = paymentsMade;
        tenantInfo[tokenId].paymentsMissed = paymentsMissed;
        tenantInfo[tokenId].outstandingBalance = outstandingBalance;
    }

    function getTenantInfo(uint256 tokenId) public view returns (TenantInfo memory) {
        return tenantInfo[tokenId];
    }

    function setRentalAgreementAddress(address _rentalAgreementAddress) public onlyOwner {
        require(_rentalAgreementAddress != address(0), "Invalid address");
        rentalAgreementAddress = _rentalAgreementAddress;
    }


    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
