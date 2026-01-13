# Especificación Técnica: Migración Frontend V2 (RoomFi)

**Fecha:** 12 de Enero, 2026
**Objetivo:** Actualizar `CreatePoolPage.tsx` para interactuar con contratos V2 sin usar "datos falsos" (mocks), capturando información real del usuario.

---

## 1. El Desafío (V1 vs V2)
El contrato inteligente ha evolucionado de un prototipo simple a un sistema compatible con **RWA Institucional**.

*   **Versión Anterior (V1):** Pedía 8 datos genéricos.
*   **Versión Actual (V2):** Exige **22 datos específicos** agrupados en legalidad, ubicación precisa y características físicas.

## 2. Estrategia de Implementación "Datos Reales"
Para cumplir con el requisito de "No Mocks" en la competencia, debemos capturar estos datos del usuario o derivarlos criptográficamente.

### A. Ubicación y GPS (Geo-Compliance)
El contrato requiere latitud y longitud (`int256`).
*   **Solución UI:** Agregar 4 nuevos campos de dirección específicos + 2 campos de coordenadas (o botón "Usar mi ubicación").
*   **Campos Requeridos:**
    1.  `calle_numero` (string) -> `fullAddress`
    2.  `ciudad` (string) -> `city`
    3.  `estado` (string) -> `state`
    4.  `cp` (string) -> `postalCode`
    5.  `colonia` (string) -> `neighborhood`
    6.  `latitud` (int256) -> Ejemplo: `19432608` (19.4326 con 6 decimales)
    7.  `longitud` (int256) -> Ejemplo: `-99133209` (-99.1332 con 6 decimales)

### B. Firma Legal (EIP-712 + NOM-151)
No enviaremos un hash vacío (`0x00`).
*   **Solución Real:**
    1.  El usuario llena un campo de texto "Términos del Contrato" (o se genera por default).
    2.  El Frontend calcula el `keccak256` de ese texto en tiempo real -> Esto es `legalDocumentHash` **REAL**.
    3.  Al hacer clic en "Registrar", Metamask abre una ventana de firma de mensaje (EIP-712).
    4.  El usuario firma criptográficamente.
    5.  Esa firma (`bytes signature`) se envía al contrato.
    *Resultado:* Validez legal real, no simulada.

### C. Características (Amenities)
El contrato usa un "Mapa de Bits" (`uint256 amenities`) para ahorrar gas.
*   **Solución UI:** Checkboxes reales.
    *   [ ] WiFi (Bit 0)
    *   [ ] Estacionamiento (Bit 1)
    *   [ ] Gym (Bit 2)
*   **Conversión:** Si el usuario marca WiFi y Gym, enviamos `5` (101 en binario).

---

## 3. Tabla de Mapeo de Argumentos (Función `registerProperty`)

| Orden | Argumento Solidity | Fuente de Dato (Frontend) |
| :--- | :--- | :--- |
| **1** | `name` | Input: "Nombre Propiedad" |
| **2** | `propertyType` | Select: (0=Depto, 1=Casa, 2=Habitación) |
| **3** | `fullAddress` | Input: "Dirección Completa" |
| **4** | `city` | Input: "Ciudad" |
| **5** | `state` | Input: "Estado" |
| **6** | `postalCode` | Input: "Código Postal" |
| **7** | `neighborhood` | Input: "Colonia" |
| **8** | `latitude` | Input: "Latitud" (Numérico) |
| **9** | `longitude` | Input: "Longitud" (Numérico) |
| **10** | `bedrooms` | Input: "Habitaciones" |
| **11** | `bathrooms` | Hardcode: 1 (o Input nuevo) |
| **12** | `maxOccupants` | Input: "Inquilinos" (`tenantCount`) |
| **13** | `squareMeters` | Hardcode: 60 (o Input nuevo) |
| **14** | `floorNumber` | Hardcode: 1 (o Input nuevo) |
| **15** | `amenities` | Calculado de Checkboxes (0 por defecto) |
| **16** | `monthlyRent` | Input: "Renta Total" |
| **17** | `securityDeposit` | Input: "Depósito" |
| **18** | `utilitiesIncluded` | Checkbox: "¿Servicios incluidos?" |
| **19** | `furnishedIncluded` | Checkbox: "¿Amueblado?" |
| **20** | `metadataURI` | String: "ipfs://..." (Placeholder válido) |
| **21** | `legalDocumentHash` | `keccak256(terms)` (Hash Real) |
| **22** | `signature` | `signer.signMessage(...)` (Firma Real) |

---

## 4. Ejecución
Para habilitar esto, actualizaré `CreatePoolPage.tsx` agregando:
1.  Imports de criptografía (`ethers.keccak256`, `toUtf8Bytes`).
2.  Nuevos campos de formulario visuales.
3.  Lógica de conversión de datos antes de enviar la transacción.
