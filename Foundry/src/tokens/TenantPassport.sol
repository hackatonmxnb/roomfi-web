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
        uint256 propertiesOwned; // NUEVO: Contador de propiedades
    }

    mapping(uint256 => TenantInfo) public tenantInfo;
    address public rentalAgreementAddress;
    address public propertyInterestPoolAddress; // NUEVO: Dirección del contrato de pools

    modifier onlyPropertyInterestPool() {
        require(msg.sender == propertyInterestPoolAddress, "Only the Property Interest Pool can call this");
        _;
    }

    constructor() ERC721("Tenant Passport", "TP") Ownable(msg.sender) {
        // El propietario se establece en el constructor de Ownable
    }

    function mint(address to, uint256 tokenId) public onlyOwner {
        _mint(to, tokenId);
        tenantInfo[tokenId] = TenantInfo({
            reputation: 100,
            paymentsMade: 0,
            paymentsMissed: 0,
            outstandingBalance: 0,
            propertiesOwned: 0 // NUEVO
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
            outstandingBalance: 0,
            propertiesOwned: 0 // NUEVO
        });
    }

    // NUEVA FUNCIÓN: Para incrementar el contador de propiedades
    function incrementPropertiesOwned(uint256 tokenId) external onlyPropertyInterestPool {
        tenantInfo[tokenId].propertiesOwned++;
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

    // NUEVA FUNCIÓN: Para establecer la dirección del contrato de pools
    function setPropertyInterestPoolAddress(address _poolAddress) public onlyOwner {
        require(_poolAddress != address(0), "Invalid address");
        propertyInterestPoolAddress = _poolAddress;
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