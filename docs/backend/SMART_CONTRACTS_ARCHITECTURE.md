# Arquitectura de Contratos Inteligentes (V2)

Este documento detalla la arquitectura técnica del sistema RoomFi V2 en Mantle Network. El sistema está diseñado modularmente para separar la identidad, la propiedad de los activos (RWA), la lógica de negocio del alquiler y la gestión de rendimientos (Yield).

## Visión General del Sistema

RoomFi opera mediante la interacción de cuatro pilares fundamentales:
1.  **Identidad (TenantPassport)**: Reputación intransferible.
2.  **Activos (PropertyRegistry)**: Registro y verificación de inmuebles.
3.  **Negocio (RentalAgreement)**: Lógica de acuerdos, pagos y tokenización de flujos de efectivo.
4.  **Finanzas (RoomFiVault)**: Optimización de capital mediante estrategias de rendimiento DeFi.

### Diagrama de Interacción

```mermaid
graph TD
    User[Usuario / Tenant] -->|Mints SBT| Passport[TenantPassportV2.sol]
    Landlord -->|Registers| Registry[PropertyRegistry.sol]
    Landlord -->|Deploys Agreement| Factory[RentalAgreementFactory.sol]
    
    Factory -->|Creates| RentalNFT[RentalAgreementNFT.sol]
    
    RentalNFT -->|Checks Reputation| Passport
    RentalNFT -->|Verifies Property| Registry
    
    User -->|Deposits Security| RentalNFT
    RentalNFT -->|Forward Funds| Vault[RoomFiVault.sol]
    
    Vault -->|Deploys Capital| Strategy[YieldStrategy (Ondo/Lendle)]
    Strategy -->|Returns Yield| Vault
    
    subgraph "Core Layer"
        Passport
        Registry
    end
    
    subgraph "Business Layer"
        Factory
        RentalNFT
    end
    
    subgraph "Finance Layer"
        Vault
        Strategy
    end
```

---

## Componentes Principales

### 1. Sistema de Identidad (`TenantPassportV2.sol`)

Contrato **Soul-Bound Token (SBT)** basado en ERC721 que impide las transferencias. Actúa como el historial crediticio descentralizado del inquilino.

*   **Responsabilidad**: Almacenar reputación, historial de pagos y medallas (badges) de verificación.
*   **Mecánica de Reputación**: Score dinámico (0-100) que aumenta con pagos a tiempo y decae con inactividad o disputas.
*   **Badges**:
    *   *KYC Badges*: Verificaciones manuales (INE, Ingresos, Empleo).
    *   *Automatic Badges*: Ganados por comportamiento on-chain (ej. "Reliable Tenant" tras 12 pagos puntuales).
*   **Decisiones de Diseño**: Se eliminó `ERC721Enumerable` para optimizar gas, implementando un tracking manual de tokens.

### 2. Registro de Propiedades RWA (`PropertyRegistry.sol`)

Registro descentralizado de inmuebles tokenizados como NFTs. Cada NFT representa la titularidad digital y el estado de verificación de la propiedad física.

*   **Identificador Único**: El `propertyId` se genera mediante un hash de las coordenadas GPS y la dirección, previniendo el doble registro de la misma ubicación física.
*   **Proceso de Verificación**: Implementa un flujo de estados (`DRAFT` -> `PENDING` -> `VERIFIED`) donde verificadores autorizados validan documentos legales off-chain antes de aprobar el activo on-chain.
*   **Property Reputation**: Las propiedades tienen su propia reputación independiente del dueño, basada en calificaciones de inquilinos anteriores sobre limpieza, ubicación y valor.

### 3. Acuerdos de Alquiler (`RentalAgreementNFT.sol`)

El núcleo operativo del protocolo. Cada contrato de alquiler es un NFT (ERC721) acuñado para el arrendador.

*   **Tokenización de Flujo de Caja**: Al ser un NFT, el acuerdo representa el derecho a recibir los pagos futuros de renta. Esto permite al arrendador vender el NFT ("factoring") para obtener liquidez inmediata, cediendo los cobros futuros al comprador del NFT.
*   **Gestión de Pagos**:
    *   Los inquilinos pagan en USDT a este contrato.
    *   El contrato redirige los fondos automáticamente al `ownerOf(tokenId)` actual.
*   **Ciclo de Vida**:
    1.  *Creación* (Factory)
    2.  *Firma* (Ambas partes firman on-chain)
    3.  *Depósito* (Tenant envía garantía → Vault)
    4.  *Activo* (Pagos mensuales)
    5.  *Finalización* (Retorno de depósito + Yield)

### 4. Gestión de Tesorería (`RoomFiVault.sol`)

Contrato encargado de maximizar la eficiencia del capital bloqueado en depósitos de garantía.

*   **Estrategia de Inversión**: Los fondos no permanecen ociosos. Se envían a protocolos de bajo riesgo (Ondo Finance USDY o Lendle) para generar un APY del 4-8%.
*   **Modelo de Incentivos**:
    *   **70% del Yield**: Para el inquilino (incentivo para cuidar la propiedad y cumplir).
    *   **30% del Yield**: Para el protocolo (revenue stream).
*   **Seguridad y Liquidez**:
    *   Mantiene un "Buffer de Reserva" (ej. 15%) líquido en el Vault para retiros inmediatos sin necesidad de desinvertir de la estrategia principal.
    *   Implementa un patrón *Check-Effects-Interactions* estricto y protecciones contra reentrancia.

---

## Patrones de Seguridad y Diseño

### Verificación y Modificadores
El sistema hace un uso extensivo de modificadores para control de acceso granular:
*   `onlyAuthorizedVerifier`: Para entidades que validan documentos RWA.
*   `onlyParty`: Restringe funciones a los participantes del contrato (Inquilino/Arrendador).
*   `nonReentrant`: En todas las funciones que manejan transferencias de tokens ERC20.

### Interoperabilidad
*   **ERC721 Standard**: Tanto el pasaporte como los acuerdos de renta son compatibles con el ecosistema estándar de NFTs, permitiendo su visualización en wallets y marketplaces.
*   **Interfaces Claras**: La comunicación entre contratos se realiza exclusivamente a través de interfaces definidas (`Interfaces.sol`), facilitando futuras actualizaciones de componentes individuales sin romper el sistema.

### Consideraciones RWA
Actualmente, la verificación de activos del mundo real (RWA) es un modelo híbrido. Mientras que el registro es on-chain, la validación de la veracidad de los documentos recae en "Verificadores Autorizados" (trusted parties). Este es un compromiso necesario para la versión actual, con planes de migración hacia oráculos de identidad descentralizada (DID) y pruebas de conocimiento cero (ZK-Proofs) para privacidad de documentos.
