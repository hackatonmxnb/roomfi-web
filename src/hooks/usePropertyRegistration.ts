import { useState } from 'react';
import { ethers } from 'ethers';
import { PROPERTY_REGISTRY_ADDRESS, PROPERTY_REGISTRY_ABI } from '../web3/config';

export interface PropertyFormData {
  // Paso 1: Propiedad
  name: string;
  propertyType: string; // "0"-"5"
  amenities: number[]; // Array de amenity IDs

  // Paso 2: Ubicación (Auto-llenado con reverse geocoding)
  latitude: string;
  longitude: string;
  fullAddress: string;
  city: string;
  state: string;
  postalCode: string;
  neighborhood: string;

  // Paso 3: Finanzas
  bedrooms: string;
  bathrooms: string; // Default: "1"
  maxOccupants: string;
  squareMeters: string; // Default: "50"
  floorNumber: string; // Default: "0"
  monthlyRent: string;
  securityDeposit: string;
  utilitiesIncluded: boolean;
  furnishedIncluded: boolean;

  // Paso 4: Legal
  legalTerms: string;
}

export const DEFAULT_FORM_DATA: PropertyFormData = {
  name: '',
  propertyType: '0',
  amenities: [],
  latitude: '',
  longitude: '',
  fullAddress: '',
  city: '',
  state: '',
  postalCode: '',
  neighborhood: '',
  bedrooms: '1',
  bathrooms: '1', // Smart default
  maxOccupants: '2',
  squareMeters: '50', // Smart default
  floorNumber: '0', // Smart default
  monthlyRent: '',
  securityDeposit: '',
  utilitiesIncluded: false,
  furnishedIncluded: false,
  legalTerms: '',
};

// Amenities bitmap según el contrato
export const AMENITIES = [
  { id: 0, name: 'WiFi', bit: 1 << 0 },
  { id: 1, name: 'Aire Acondicionado', bit: 1 << 1 },
  { id: 2, name: 'Estacionamiento', bit: 1 << 2 },
  { id: 3, name: 'Lavadora', bit: 1 << 3 },
  { id: 4, name: 'Gimnasio', bit: 1 << 4 },
  { id: 5, name: 'Piscina', bit: 1 << 5 },
  { id: 6, name: 'Seguridad 24/7', bit: 1 << 6 },
  { id: 7, name: 'Elevador', bit: 1 << 7 },
];

export const usePropertyRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const registerProperty = async (formData: PropertyFormData, signer: ethers.Signer) => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    setPropertyId(null);

    try {
      // 1. Validaciones básicas
      if (!formData.name || !formData.monthlyRent || !formData.securityDeposit) {
        throw new Error('Faltan campos obligatorios');
      }

      // 2. Crear instancia del contrato
      const propertyRegistry = new ethers.Contract(
        PROPERTY_REGISTRY_ADDRESS,
        PROPERTY_REGISTRY_ABI,
        signer
      );

      // 3. Convertir datos según especificación del documento

      // Latitude/Longitude: multiplicar por 1,000,000
      const latInt = Math.floor(parseFloat(formData.latitude) * 1_000_000);
      const lonInt = Math.floor(parseFloat(formData.longitude) * 1_000_000);

      // Rentas: convertir a 6 decimales (USDT)
      const rentWei = ethers.parseUnits(formData.monthlyRent, 6);
      const depositWei = ethers.parseUnits(formData.securityDeposit, 6);

      // Amenities: convertir array a bitmap
      const amenitiesBitmap = formData.amenities.reduce((acc, amenityId) => {
        const amenity = AMENITIES.find(a => a.id === amenityId);
        return amenity ? acc | amenity.bit : acc;
      }, 0);

      // Legal hash: keccak256 del texto
      const legalHash = ethers.keccak256(ethers.toUtf8Bytes(formData.legalTerms));

      // Signature: firmar el hash
      const signature = await signer.signMessage(ethers.getBytes(legalHash));

      // 4. Llamar al contrato con los 22 parámetros en orden exacto
      const tx = await propertyRegistry.registerProperty(
        formData.name,                              // 1
        parseInt(formData.propertyType),            // 2
        formData.fullAddress,                       // 3
        formData.city,                              // 4
        formData.state,                             // 5
        formData.postalCode,                        // 6
        formData.neighborhood,                      // 7
        latInt,                                     // 8
        lonInt,                                     // 9
        parseInt(formData.bedrooms),                // 10
        parseInt(formData.bathrooms),               // 11
        parseInt(formData.maxOccupants),            // 12
        parseInt(formData.squareMeters),            // 13
        parseInt(formData.floorNumber),             // 14
        amenitiesBitmap,                            // 15
        rentWei,                                    // 16
        depositWei,                                 // 17
        formData.utilitiesIncluded,                 // 18
        formData.furnishedIncluded,                 // 19
        "",                                         // 20 - metadataURI (default vacío)
        legalHash,                                  // 21
        signature                                   // 22
      );

      // 5. Esperar confirmación
      const receipt = await tx.wait();

      setTxHash(receipt.hash);

      // 6. Extraer propertyId del evento (opcional, dependiendo del contrato)
      // Buscar evento PropertyRegistered
      const event = receipt.logs?.find((log: any) => {
        try {
          const parsed = propertyRegistry.interface.parseLog(log);
          return parsed?.name === 'PropertyRegistered';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = propertyRegistry.interface.parseLog(event);
        setPropertyId(parsed?.args?.propertyId?.toString());
      }

      return { success: true, txHash: receipt.hash, propertyId: propertyId };

    } catch (err: any) {
      console.error('Error registrando propiedad:', err);
      setError(err.message || 'Error desconocido al registrar propiedad');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    registerProperty,
    loading,
    error,
    txHash,
    propertyId,
  };
};
