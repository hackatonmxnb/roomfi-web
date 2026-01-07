# RoomFi V2 - Documentación Técnica
## Mantle Global Hackathon 2025

Documentación completa del proyecto RoomFi V2 para Mantle Network.

---

## 📚 Índice de Documentación

### 🎯 Para Developers

#### Backend (Smart Contracts)
- **[Smart Contracts Architecture](backend/SMART_CONTRACTS_ARCHITECTURE.md)** - Arquitectura completa de contratos V2, flujos de interacción y explicación técnica de cada componente

#### Frontend (React + TypeScript)
- **[Frontend Compatibility Analysis](frontend/ANALISIS_COMPATIBILIDAD_FRONTEND_CONTRATOS.md)** - Análisis exhaustivo de compatibilidad entre frontend V1 y contratos V2. Incluye plan de migración de 72 horas.

#### Deployment
- **[Deployment Checklist](deployment/DEPLOYMENT_CHECKLIST.md)** - Guía paso a paso para deployar RoomFi V2 en Mantle Sepolia. Incluye verificación, testing y troubleshooting.

### 📊 Para Product/Business

#### User Flows
- **[User Flows & Platform Mechanics](flows/USER_FLOWS.md)** - Flujos completos de usuarios (landlords y tenants), explicación de cada interacción y casos de uso.

---

## 🏗️ Estructura del Proyecto

```
roomfi-web/
├── Foundry/               # Smart contracts (Solidity 0.8.20)
│   ├── src/V2/           # Contratos V2 para Mantle
│   ├── script/           # Deployment scripts
│   └── test/             # Tests unitarios
│
├── src/                  # Frontend (React 19 + TypeScript)
│   ├── web3/            # Web3 integration
│   │   ├── config.ts   # Network & contract addresses
│   │   └── abis/v2/    # ABIs de contratos V2
│   ├── components/      # React components
│   └── pages/           # Application pages
│
└── docs/                # 📄 ESTA CARPETA
    ├── backend/         # Documentación de contratos
    ├── frontend/        # Documentación de frontend
    ├── deployment/      # Guías de deployment
    └── flows/           # User flows y diagramas
```

---

## 🚀 Quick Start

### 1. Setup Backend (Smart Contracts)

```bash
cd Foundry

# Instalar dependencias
forge install

# Compilar contratos
forge build

# Ejecutar tests
forge test

# Deploy a Mantle Sepolia (ver deployment/DEPLOYMENT_CHECKLIST.md)
forge script script/DeployMantleSepolia.s.sol --broadcast
```

### 2. Setup Frontend

```bash
# Instalar dependencias
npm install

# Copiar .env.example y configurar
cp .env.example .env

# Iniciar desarrollo
npm start
```

---

## 📖 Documentos por Prioridad

### 🔴 CRÍTICO (Leer primero)

1. **[Smart Contracts Architecture](backend/SMART_CONTRACTS_ARCHITECTURE.md)** - Entender la arquitectura completa
2. **[Deployment Checklist](deployment/DEPLOYMENT_CHECKLIST.md)** - Para deployar a testnet
3. **[User Flows](flows/USER_FLOWS.md)** - Entender el producto

### 🟡 IMPORTANTE (Leer antes de desarrollar frontend)

4. **[Frontend Compatibility Analysis](frontend/ANALISIS_COMPATIBILIDAD_FRONTEND_CONTRATOS.md)** - Plan de migración frontend

---

## 🎓 Recursos Externos

### Mantle Network
- **Docs**: https://docs.mantle.xyz
- **Faucet**: https://faucet.sepolia.mantle.xyz
- **Explorer**: https://explorer.sepolia.mantle.xyz

### DeFi Integration
- **Lendle Finance**: https://lendle.xyz (Aave fork on Mantle)
- **Ondo Finance USDY**: https://ondo.finance

### Tools
- **Foundry**: https://book.getfoundry.sh
- **OpenZeppelin**: https://docs.openzeppelin.com

---

## 📝 Changelog

### V2 (Current - Mantle Sepolia)
- ✅ Migración completa de Arbitrum a Mantle
- ✅ Token económico cambiado de MXNB a USDT
- ✅ NFT tokenization de rental agreements (ERC721)
- ✅ Dual yield strategies (USDY 4.29% + Lendle ~6%)
- ✅ Sistema de disputas descentralizado
- ✅ PropertyRegistry con verificación
- ✅ TenantPassport V2 con 14 badges

### V1 (Legacy - Arbitrum Sepolia)
- ❌ Deprecated - No mantener

---

## 🤝 Contribuir

Para contribuir al proyecto:

1. Lee la documentación correspondiente al área que vas a modificar
2. Crea un branch desde `main`
3. Haz tus cambios con commits descriptivos
4. Asegúrate que los tests pasen (`forge test`)
5. Crea un Pull Request

---

## 📧 Contacto

**Equipo RoomFi**
- GitHub: https://github.com/hackatonmxnb/roomfi-web
- Hackathon: Mantle Global Hackathon 2025

---

**Última actualización**: 7 de Enero de 2026
