import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Box, Typography, Paper, TextField, Button, Alert, Stack, CircularProgress,
  Grid, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox,
  Stepper, Step, StepLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  PROPERTY_REGISTRY_ADDRESS,
  PROPERTY_REGISTRY_ABI,
  TENANT_PASSPORT_ADDRESS,
  TENANT_PASSPORT_ABI,
  NETWORK_CONFIG,
} from './web3/config';

interface CreatePropertyPageProps {
  account: string | null;
}

const PROPERTY_TYPES = [
  { value: 0, label: 'Apartamento' },
  { value: 1, label: 'Casa' },
  { value: 2, label: 'Estudio' },
  { value: 3, label: 'Habitación' },
  { value: 4, label: 'Loft' },
  { value: 5, label: 'Penthouse' },
];

const steps = ['Información Básica', 'Ubicación', 'Detalles', 'Precio'];

export default function CreatePropertyPage({ account }: CreatePropertyPageProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    propertyType: 0,
    fullAddress: '',
    city: '',
    state: '',
    postalCode: '',
    neighborhood: '',
    bedrooms: 1,
    bathrooms: 1,
    maxOccupants: 2,
    squareMeters: 50,
    floorNumber: 1,
    monthlyRent: '',
    securityDeposit: '',
    utilitiesIncluded: false,
    furnishedIncluded: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!account) {
      navigate('/');
    }
  }, [account, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => setActiveStep(prev => prev + 1);
  const handleBack = () => setActiveStep(prev => prev - 1);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return form.name.trim() !== '';
      case 1:
        return form.fullAddress.trim() !== '' && form.city.trim() !== '';
      case 2:
        return form.bedrooms > 0 && form.bathrooms > 0;
      case 3:
        return parseFloat(form.monthlyRent) > 0 && parseFloat(form.securityDeposit) > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setStatusMessage('');

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask no está instalado.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (Number(network.chainId) !== NETWORK_CONFIG.chainId) {
        throw new Error(`Por favor cambia a la red ${NETWORK_CONFIG.chainName}`);
      }

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // 1. Verificar TenantPassport
      setStatusMessage('Verificando TenantPassport...');
      const passportContract = new ethers.Contract(TENANT_PASSPORT_ADDRESS, TENANT_PASSPORT_ABI, provider);
      const hasPassport = await passportContract.hasPassport(signerAddress);
      
      if (!hasPassport) {
        throw new Error("Necesitas crear tu TenantPassport primero. Ve a la página principal y haz clic en 'Crear mi NFT'.");
      }

      const contract = new ethers.Contract(PROPERTY_REGISTRY_ADDRESS, PROPERTY_REGISTRY_ABI, signer);

      // 2. Crear hash del documento legal (simulado)
      setStatusMessage('Preparando documentos legales...');
      const legalDocumentHash = ethers.keccak256(
        ethers.toUtf8Bytes(`RoomFi Property: ${form.name} - ${form.fullAddress} - ${Date.now()}`)
      );

      // 3. Firmar el hash (Ricardian Contract)
      setStatusMessage('Firmando contrato digital...');
      const signature = await signer.signMessage(ethers.getBytes(legalDocumentHash));

      // Convert rent and deposit to USDT units (6 decimals)
      const monthlyRentWei = ethers.parseUnits(form.monthlyRent, 6);
      const securityDepositWei = ethers.parseUnits(form.securityDeposit, 6);

      setStatusMessage('Registrando propiedad en la blockchain...');

      // registerProperty parameters
      const tx = await contract.registerProperty(
        form.name,                          // name
        form.propertyType,                  // propertyType
        form.fullAddress,                   // fullAddress
        form.city,                          // city
        form.state || 'N/A',                // state
        form.postalCode || '00000',         // postalCode
        form.neighborhood || '',            // neighborhood
        19419400,                           // latitude (CDMX Roma Norte - válido en MockCivilRegistry)
        -99163200,                          // longitude (CDMX Roma Norte - válido en MockCivilRegistry)
        form.bedrooms,                      // bedrooms
        form.bathrooms,                     // bathrooms
        form.maxOccupants,                  // maxOccupants
        form.squareMeters,                  // squareMeters
        form.floorNumber,                   // floorNumber
        0,                                  // amenities (bitmask)
        monthlyRentWei,                     // monthlyRent
        securityDepositWei,                 // securityDeposit
        form.utilitiesIncluded,             // utilitiesIncluded
        form.furnishedIncluded,             // furnishedIncluded
        '',                                 // metadataURI
        legalDocumentHash,                  // legalDocumentHash
        signature                           // signature
      );

      setStatusMessage('Esperando confirmación...');
      await tx.wait();

      setStatusMessage('¡Propiedad registrada exitosamente!');
      setTimeout(() => navigate('/my-properties'), 2000);

    } catch (err: any) {
      console.error('Error registering property:', err);
      setError(err.reason || err.message || 'Error al registrar la propiedad');
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <TextField
              label="Nombre de la Propiedad"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              placeholder="Ej: Departamento Centro Histórico"
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Propiedad</InputLabel>
              <Select
                value={form.propertyType}
                label="Tipo de Propiedad"
                onChange={(e) => handleSelectChange('propertyType', e.target.value)}
              >
                {PROPERTY_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            <TextField
              label="Dirección Completa"
              name="fullAddress"
              value={form.fullAddress}
              onChange={handleChange}
              fullWidth
              required
              placeholder="Calle, Número, Colonia"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Ciudad"
                name="city"
                value={form.city}
                onChange={handleChange}
                fullWidth
                required
                sx={{ flex: 1 }}
              />
              <TextField
                label="Estado"
                name="state"
                value={form.state}
                onChange={handleChange}
                fullWidth
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Código Postal"
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                fullWidth
                sx={{ flex: 1 }}
              />
              <TextField
                label="Colonia/Barrio"
                name="neighborhood"
                value={form.neighborhood}
                onChange={handleChange}
                fullWidth
                sx={{ flex: 1 }}
              />
            </Box>
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Recámaras"
                  name="bedrooms"
                  type="number"
                  value={form.bedrooms}
                  onChange={handleChange}
                  fullWidth
                  inputProps={{ min: 0, max: 10 }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Baños"
                  name="bathrooms"
                  type="number"
                  value={form.bathrooms}
                  onChange={handleChange}
                  fullWidth
                  inputProps={{ min: 1, max: 10 }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Ocupantes Máx."
                  name="maxOccupants"
                  type="number"
                  value={form.maxOccupants}
                  onChange={handleChange}
                  fullWidth
                  inputProps={{ min: 1, max: 20 }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Piso"
                  name="floorNumber"
                  type="number"
                  value={form.floorNumber}
                  onChange={handleChange}
                  fullWidth
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Metros Cuadrados"
              name="squareMeters"
              type="number"
              value={form.squareMeters}
              onChange={handleChange}
              fullWidth
              inputProps={{ min: 10, max: 1000 }}
            />
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.utilitiesIncluded}
                    onChange={handleChange}
                    name="utilitiesIncluded"
                  />
                }
                label="Servicios incluidos"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.furnishedIncluded}
                    onChange={handleChange}
                    name="furnishedIncluded"
                  />
                }
                label="Amueblado"
              />
            </Stack>
          </Stack>
        );

      case 3:
        return (
          <Stack spacing={3}>
            <TextField
              label="Renta Mensual (USDT)"
              name="monthlyRent"
              type="number"
              value={form.monthlyRent}
              onChange={handleChange}
              fullWidth
              required
              placeholder="Ej: 1500"
              InputProps={{
                startAdornment: <Typography color="text.secondary" mr={1}>$</Typography>
              }}
            />
            <TextField
              label="Depósito de Seguridad (USDT)"
              name="securityDeposit"
              type="number"
              value={form.securityDeposit}
              onChange={handleChange}
              fullWidth
              required
              placeholder="Ej: 3000"
              InputProps={{
                startAdornment: <Typography color="text.secondary" mr={1}>$</Typography>
              }}
            />
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Resumen
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Propiedad:</strong> {form.name || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Tipo:</strong> {PROPERTY_TYPES[form.propertyType]?.label}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Ciudad:</strong> {form.city || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Tamaño:</strong> {form.squareMeters}m²</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Recámaras:</strong> {form.bedrooms}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Baños:</strong> {form.bathrooms}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Box maxWidth={700} mx="auto" mt={4} p={3}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight={700} mb={1}>
          Registrar Nueva Propiedad
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          Completa la información para registrar tu propiedad en la blockchain.
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}

        {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
        {statusMessage && <Alert severity="info" sx={{ mt: 3 }}>{statusMessage}</Alert>}

        <Stack direction="row" justifyContent="space-between" mt={4}>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
          >
            Atrás
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !validateStep(activeStep)}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Registrando...' : 'Registrar Propiedad'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!validateStep(activeStep)}
            >
              Siguiente
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
