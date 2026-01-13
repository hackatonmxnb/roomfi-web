# Implementación Frontend V2 - Full Real Data & Premium UX
## RoomFi - Estándar Institucional RWA (Especificación Técnica Rigurosa)

**Fecha**: Enero 12, 2026
**Nivel**: Institutional Grade (Ondo/Centrifuge Standard)
**Objetivo**: Transformar el MVP de Hackathon en una plataforma financiera profesional.

---

## 0. ESTRATEGIA DE SIMPLIFICACIÓN UX (22 Campos → 8 Inputs Visibles)

El contrato V2 requiere **22 parámetros**. Nadie quiere llenar 22 campos.
La solución es **reducir fricción sin modificar el contrato**, usando técnicas de UX inteligente.

### Estrategia 1: Smart Defaults (Valores Automáticos)
Campos que el usuario NO ve, pero se envían con valores predeterminados sensatos:
| Campo Contrato | Valor Default | Justificación |
| :--- | :--- | :--- |
| `bathrooms` | `1` | Mayoría de rentas tienen 1 baño |
| `floorNumber` | `0` (Planta Baja) | Valor neutro |
| `squareMeters` | `50` | Promedio CDMX |
| `metadataURI` | `""` (Vacío) | No requerido para funcionamiento |
| `utilitiesIncluded` | `false` | Conservador |
| `furnishedIncluded` | `false` | Conservador |

**Resultado**: 6 campos menos que llenar.

### Estrategia 2: Reverse Geocoding (Auto-detección de Dirección)
Cuando el usuario hace clic en "📍 Usar mi ubicación":
1.  Obtenemos `latitude` y `longitude` del navegador.
2.  Llamamos a **Google Maps Geocoding API** (ya tienen `@react-google-maps/api`).
3.  Extraemos automáticamente: `city`, `state`, `postalCode`, `neighborhood`, `fullAddress`.

```typescript
const reverseGeocode = async (lat: number, lng: number) => {
  const geocoder = new google.maps.Geocoder();
  const result = await geocoder.geocode({ location: { lat, lng } });
  const components = result.results[0].address_components;
  return {
    fullAddress: result.results[0].formatted_address,
    city: components.find(c => c.types.includes('locality'))?.long_name || 'CDMX',
    state: components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || 'CDMX',
    postalCode: components.find(c => c.types.includes('postal_code'))?.long_name || '00000',
    neighborhood: components.find(c => c.types.includes('sublocality'))?.long_name || '',
  };
};
```

**Resultado**: 5 campos llenados con 1 clic.

### Estrategia 3: Progressive Disclosure (Sección "Avanzado")
Campos que existen pero están ocultos bajo un acordeón expandible:
*   `bedrooms`, `maxOccupants` → Visibles siempre (importantes).
*   `bathrooms`, `squareMeters`, `floorNumber` → Dentro de "🔽 Opciones Avanzadas".

**Resultado**: UI limpia, usuario avanzado puede expandir si quiere.

---

## 1. TABLA COMPLETA DE MAPEO (22 Parámetros)

Esta es la tabla definitiva para el desarrollador frontend.

| # | Parámetro Contrato | Tipo Solidity | Input UI | Conversión |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `name` | `string` | TextField | Directo |
| 2 | `propertyType` | `uint8 (enum)` | Select (0-5) | `parseInt()` |
| 3 | `fullAddress` | `string` | TextField (Auto) | Directo |
| 4 | `city` | `string` | TextField (Auto) | Directo |
| 5 | `state` | `string` | TextField (Auto) | Directo |
| 6 | `postalCode` | `string` | TextField (Auto) | Directo |
| 7 | `neighborhood` | `string` | TextField (Auto) | Directo |
| 8 | `latitude` | `int256` | Hidden/Auto | `Math.floor(lat * 1_000_000)` |
| 9 | `longitude` | `int256` | Hidden/Auto | `Math.floor(lng * 1_000_000)` |
| 10 | `bedrooms` | `uint8` | NumberField | `parseInt()` |
| 11 | `bathrooms` | `uint8` | **Default: 1** | Hardcode |
| 12 | `maxOccupants` | `uint8` | NumberField | `parseInt()` |
| 13 | `squareMeters` | `uint16` | **Default: 50** | Hardcode |
| 14 | `floorNumber` | `uint16` | **Default: 0** | Hardcode |
| 15 | `amenities` | `uint256` | ToggleButtonGroup | Bitmap OR |
| 16 | `monthlyRent` | `uint256` | NumberField | `ethers.parseUnits(val, 6)` |
| 17 | `securityDeposit` | `uint256` | NumberField | `ethers.parseUnits(val, 6)` |
| 18 | `utilitiesIncluded` | `bool` | Checkbox | Directo |
| 19 | `furnishedIncluded` | `bool` | Checkbox | Directo |
| 20 | `metadataURI` | `string` | **Default: ""** | Hardcode |
| 21 | `legalDocumentHash` | `bytes32` | Generado | `keccak256(terms)` |
| 22 | `signature` | `bytes` | Wallet Popup | `signer.signMessage()` |

---

## 2. STACK TECNOLÓGICO "PREMIUM" (Instalación y Configuración)

### A. Wallet Connection: RainbowKit + Wagmi
```bash
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
```

**Configuración en `src/web3/wagmiConfig.ts`**:
```typescript
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mantleSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'RoomFi Protocol',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [mantleSepolia],
  ssr: false,
});
```

### B. Sistema de Diseño: Custom MUI Theme
```bash
npm install @fontsource/inter
```

**Configuración en `src/theme/roomfiTheme.ts`**:
```typescript
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  typography: { fontFamily: '"Inter", sans-serif', button: { textTransform: 'none' } },
  shape: { borderRadius: 12 },
  palette: {
    primary: { main: '#0F172A' },
    secondary: { main: '#3B82F6' },
    background: { default: '#F8FAFC' },
  },
});
```

---

## 3. ARQUITECTURA "WIZARD" (Stepper de 4 Pasos)

### Campos por Paso (Simplificado)

| Paso | Nombre | Campos Visibles | Campos Ocultos/Auto |
| :--- | :--- | :--- | :--- |
| 1 | Propiedad | `name`, `propertyType`, Amenities | - |
| 2 | Ubicación | Botón "Usar ubicación" | `lat`, `lng`, `city`, `state`, `postalCode`, `neighborhood`, `fullAddress` |
| 3 | Finanzas | `bedrooms`, `maxOccupants`, `monthlyRent`, `securityDeposit` | `bathrooms`, `squareMeters`, `floorNumber` (defaults) |
| 4 | Legal | Textarea términos, Botón Firmar | `legalHash`, `signature` (generados) |

**Total de inputs visibles para el usuario: ~8-10** (en lugar de 22).

---

## 4. LLAMADA FINAL AL CONTRATO

```typescript
const handleRegister = async () => {
  const latInt = Math.floor(parseFloat(form.latitude) * 1_000_000);
  const lonInt = Math.floor(parseFloat(form.longitude) * 1_000_000);
  const rentWei = ethers.parseUnits(form.monthlyRent, 6);
  const depositWei = ethers.parseUnits(form.securityDeposit, 6);
  const legalHash = ethers.keccak256(ethers.toUtf8Bytes(form.legalTerms));
  const signature = await signer.signMessage(ethers.getBytes(legalHash));

  const tx = await propertyRegistry.registerProperty(
    form.name,                    // 1
    parseInt(form.propertyType),  // 2
    form.fullAddress,             // 3
    form.city,                    // 4
    form.state,                   // 5
    form.postalCode,              // 6
    form.neighborhood,            // 7
    latInt,                       // 8
    lonInt,                       // 9
    parseInt(form.bedrooms),      // 10
    1,                            // 11 - Default bathrooms
    parseInt(form.maxOccupants),  // 12
    50,                           // 13 - Default squareMeters
    0,                            // 14 - Default floorNumber
    form.amenitiesBitmap,         // 15
    rentWei,                      // 16
    depositWei,                   // 17
    form.utilitiesIncluded || false, // 18
    form.furnishedIncluded || false, // 19
    "",                           // 20 - Default metadataURI
    legalHash,                    // 21
    signature                     // 22
  );
  await tx.wait();
};
```

---

## 5. CHECKLIST DE COMPATIBILIDAD V2

- [ ] Los 22 parámetros se envían en orden correcto.
- [ ] `latitude/longitude` multiplicados por 1,000,000.
- [ ] `monthlyRent/securityDeposit` convertidos a 6 decimales (USDT).
- [ ] `legalDocumentHash` es `keccak256` del texto.
- [ ] `signature` viene de `signer.signMessage()`.
- [ ] Reverse Geocoding llena `city`, `state`, `postalCode`, `neighborhood`.

---

**Documento preparado por**: RoomFi Technical Team
**Versión**: 4.0 - Contract Compatible + UX Optimized
