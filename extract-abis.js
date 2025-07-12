const fs = require('fs');
const path = require('path');

const foundryOutDir = path.join(__dirname, 'Foundry', 'out');
const abiTargetDir = path.join(__dirname, 'src', 'web3', 'abis');

// Nombres de los archivos de contrato de Foundry (sin la extensión .sol)
const contractFiles = [
    'MXNBT.sol/MXNBT.json',
    'TenantPassport.sol/TenantPassport.json',
    'PropertyInterestPool.sol/PropertyInterestPool.json',
    'RentalAgreement.sol/RentalAgreement.json',
    'MXNBInterestGenerator.sol/MXNBInterestGenerator.json'
];

// Mapeo de nombres de archivo de Foundry a los nombres de ABI que usará el frontend
const abiNameMapping = {
    'MXNBT.json': 'MXNB_ABI.json',
    'TenantPassport.json': 'TENANT_PASSPORT_ABI.json',
    'PropertyInterestPool.json': 'PROPERTY_INTEREST_POOL_ABI.json',
    'RentalAgreement.json': 'RENTAL_AGREEMENT_ABI.json',
    'MXNBInterestGenerator.json': 'INTEREST_GENERATOR_ABI.json'
};

function extractAbis() {
    if (!fs.existsSync(abiTargetDir)) {
        console.log(`Creando directorio de ABIs en: ${abiTargetDir}`);
        fs.mkdirSync(abiTargetDir, { recursive: true });
    }

    console.log(`Extrayendo ABIs desde ${foundryOutDir}...`);

    contractFiles.forEach(contractFile => {
        const sourcePath = path.join(foundryOutDir, contractFile);
        const baseName = path.basename(contractFile);
        const targetFileName = abiNameMapping[baseName];

        if (!targetFileName) {
            console.warn(`- No se encontró un mapeo para ${baseName}. Saltando...`);
            return;
        }

        const targetPath = path.join(abiTargetDir, targetFileName);

        try {
            if (fs.existsSync(sourcePath)) {
                const contractJson = fs.readFileSync(sourcePath, 'utf-8');
                const contractData = JSON.parse(contractJson);
                
                if (contractData.abi) {
                    fs.writeFileSync(targetPath, JSON.stringify(contractData.abi, null, 2));
                    console.log(`✔ ABI extraído para ${baseName} -> ${targetFileName}`);
                } else {
                    console.error(`❌ No se encontró ABI en ${sourcePath}`);
                }
            } else {
                console.error(`❌ Archivo de contrato no encontrado en: ${sourcePath}`);
            }
        } catch (error) {
            console.error(`❌ Error procesando ${sourcePath}:`, error);
        }
    });

    console.log('\nProceso de extracción de ABIs completado.');
}

extractAbis();