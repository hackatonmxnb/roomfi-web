// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockCivilRegistry
 * @author RoomFi Team - Mantle Hackathon 2025
 * @notice Simula un oráculo gubernamental (Registro Público de la Propiedad)
 * @dev En Mainnet esto sería un Chainlink Oracle o una integración API firmada
 */
contract MockCivilRegistry is Ownable {
    
    // Struct para definir el estado legal de una coordenada
    struct PropertyStatus {
        bool isClean;           // True = Sin gravamen, False = Problemas legales
        string ownerName;       // Nombre legal del propietario
        uint256 registeredAt;   // Fecha de registro en gobierno
    }

    // Mapping de coordenadas (latitud/longitud concatenados) a status
    // Key: keccak256(abi.encodePacked(lat, long))
    mapping(bytes32 => PropertyStatus) public landRecords;

    event PropertyStatusUpdated(int256 lat, int256 long, bool isClean);

    constructor() Ownable(msg.sender) {
        // Inicializar datos para la DEMO
        
        // Propiedad VÁLIDA (Ej. CDMX Roma Norte)
        // Lat: 19.419400 (19419400), Long: -99.163200 (-99163200)
        _setRecord(19419400, -99163200, true, "JUAN PEREZ", block.timestamp - 365 days);

        // Propiedad EMBARGADA/INVALIDA (Ej. Terreno litigioso)
        // Lat: 19.500000 (19500000), Long: -99.100000 (-99100000)
        _setRecord(19500000, -99100000, false, "INMOBILIARIA FRAUDULENTA SA", block.timestamp - 100 days);
    }

    /**
     * @notice Consulta el estado legal de una propiedad basada en ubicación
     * @param lat Latitud con 6 decimales (ej. 19419400)
     * @param long Longitud con 6 decimales (ej. -99163200)
     * @return isClean True si está libre de gravamen
     * @return ownerID Nombre del propietario registrado
     */
    function checkPropertyStatus(int256 lat, int256 long) 
        external 
        view 
        returns (bool isClean, string memory ownerID) 
    {
        bytes32 key = keccak256(abi.encodePacked(lat, long));
        PropertyStatus memory status = landRecords[key];
        
        // Si no existe registro, asumimos que no está regularizada (False)
        // Para efectos de demo, solo lo que registramos explícitamente es válido.
        if (status.registeredAt == 0) {
            return (false, "NO REGISTRADO");
        }

        return (status.isClean, status.ownerName);
    }

    /**
     * @notice Función administrativa para actualizar el "Catastro"
     */
    function updateLandRecord(
        int256 lat, 
        int256 long, 
        bool isClean, 
        string calldata ownerName
    ) external onlyOwner {
        _setRecord(lat, long, isClean, ownerName, block.timestamp);
    }

    function _setRecord(
        int256 lat, 
        int256 long, 
        bool isClean, 
        string memory ownerName,
        uint256 date
    ) internal {
        bytes32 key = keccak256(abi.encodePacked(lat, long));
        landRecords[key] = PropertyStatus({
            isClean: isClean,
            ownerName: ownerName,
            registeredAt: date
        });

        emit PropertyStatusUpdated(lat, long, isClean);
    }
}
