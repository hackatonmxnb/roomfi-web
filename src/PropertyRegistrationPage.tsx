import React,{ useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Home,
  LocationOn,
  AttachMoney,
  Gavel,
  ExpandMore,
  MyLocation,
  CheckCircle,
} from '@mui/icons-material';
import { ethers } from 'ethers';
import Header from './Header';
import {
  usePropertyRegistration,
  PropertyFormData,
  DEFAULT_FORM_DATA,
  AMENITIES,
} from './hooks/usePropertyRegistration';

const PROPERTY_TYPES = [
  { value: '0',label: 'Casa Completa' },
  { value: '1',label: 'Apartamento' },
  { value: '2',label: 'Habitación Privada' },
  { value: '3',label: 'Habitación Compartida' },
  { value: '4',label: 'Estudio' },
  { value: '5',label: 'Loft' },
];

const STEPS = ['Propiedad','Ubicación','Finanzas','Legal'];

const STEP_ICONS: { [key: number]: React.ReactElement } = {
  0: <Home />,
  1: <LocationOn />,
  2: <AttachMoney />,
  3: <Gavel />,
};

export default function PropertyRegistrationPage() {
  const [activeStep,setActiveStep] = useState(0);
  const [formData,setFormData] = useState<PropertyFormData>(DEFAULT_FORM_DATA);
  const [walletConnected,setWalletConnected] = useState(false);
  const [signer,setSigner] = useState<ethers.Signer | null>(null);
  const [geolocating,setGeolocating] = useState(false);

  const { registerProperty,loading,error,txHash,propertyId } = usePropertyRegistration();

  // Conectar wallet
  const handleConnectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Por favor instala MetaMask');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts',[]);
      const signer = await provider.getSigner();

      setSigner(signer);
      setWalletConnected(true);
    } catch (err) {
      console.error('Error conectando wallet:',err);
    }
  };

  // Actualizar campos del formulario
  const handleInputChange = (field: keyof PropertyFormData,value: any) => {
    setFormData((prev) => ({ ...prev,[field]: value }));
  };

  // Reverse Geocoding: Obtener dirección desde coordenadas
  const handleUseMyLocation = async () => {
    setGeolocating(true);
    try {
      // Obtener coordenadas del navegador
      const position = await new Promise<GeolocationPosition>((resolve,reject) => {
        navigator.geolocation.getCurrentPosition(resolve,reject);
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Guardar coordenadas
      handleInputChange('latitude',lat.toString());
      handleInputChange('longitude',lng.toString());

      // Reverse Geocoding con Google Maps
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat,lng } });

        if (result.results && result.results[0]) {
          const components = result.results[0].address_components;
          const formatted = result.results[0].formatted_address;

          // Extraer componentes
          const getComponent = (type: string) =>
            components.find((c) => c.types.includes(type))?.long_name || '';

          handleInputChange('fullAddress',formatted);
          handleInputChange('city',getComponent('locality') || 'CDMX');
          handleInputChange('state',getComponent('administrative_area_level_1') || 'CDMX');
          handleInputChange('postalCode',getComponent('postal_code') || '00000');
          handleInputChange('neighborhood',getComponent('sublocality') || '');
        }
      } else {
        // Fallback si no hay Google Maps cargado
        handleInputChange('fullAddress',`Lat: ${lat}, Lng: ${lng}`);
        handleInputChange('city','CDMX');
        handleInputChange('state','CDMX');
        handleInputChange('postalCode','00000');
      }
    } catch (err) {
      console.error('Error obteniendo ubicación:',err);
      alert('No se pudo obtener tu ubicación. Por favor ingresa manualmente.');
    } finally {
      setGeolocating(false);
    }
  };

  // Validación de cada paso
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!formData.name && !!formData.propertyType;
      case 1:
        return (
          !!formData.latitude &&
          !!formData.longitude &&
          !!formData.fullAddress &&
          !!formData.city &&
          !!formData.state &&
          !!formData.postalCode
        );
      case 2:
        return (
          !!formData.bedrooms &&
          !!formData.maxOccupants &&
          !!formData.monthlyRent &&
          !!formData.securityDeposit
        );
      case 3:
        return !!formData.legalTerms;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    } else {
      alert('Por favor completa todos los campos obligatorios');
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!signer) {
      alert('Por favor conecta tu wallet primero');
      return;
    }

    if (!validateStep(3)) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    await registerProperty(formData,signer);
  };

  // Renderizar contenido de cada paso
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <TextField
              label="Nombre de la Propiedad"
              value={formData.name}
              onChange={(e) => handleInputChange('name',e.target.value)}
              fullWidth
              required
              placeholder="Ej: Departamento en Polanco"
            />
            <FormControl fullWidth required>
              <InputLabel>Tipo de Propiedad</InputLabel>
              <Select
                value={formData.propertyType}
                onChange={(e) => handleInputChange('propertyType',e.target.value)}
                label="Tipo de Propiedad"
              >
                {PROPERTY_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                Amenidades
              </Typography>
              <ToggleButtonGroup
                value={formData.amenities}
                onChange={(_,newAmenities) => handleInputChange('amenities',newAmenities)}
                sx={{ flexWrap: 'wrap',gap: 1 }}
              >
                {AMENITIES.map((amenity) => (
                  <ToggleButton
                    key={amenity.id}
                    value={amenity.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      textTransform: 'none',
                    }}
                  >
                    {amenity.name}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            <Alert severity="info" icon={<MyLocation />}>
              Usa el botón de abajo para auto-completar tu dirección con tu ubicación actual
            </Alert>

            <Button
              variant="outlined"
              startIcon={geolocating ? <CircularProgress size={20} /> : <MyLocation />}
              onClick={handleUseMyLocation}
              disabled={geolocating}
              fullWidth
              size="large"
            >
              {geolocating ? 'Obteniendo ubicación...' : 'Usar mi ubicación'}
            </Button>

            <TextField
              label="Dirección Completa"
              value={formData.fullAddress}
              onChange={(e) => handleInputChange('fullAddress',e.target.value)}
              fullWidth
              required
              multiline
              rows={2}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Ciudad"
                value={formData.city}
                onChange={(e) => handleInputChange('city',e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Estado"
                value={formData.state}
                onChange={(e) => handleInputChange('state',e.target.value)}
                fullWidth
                required
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Código Postal"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode',e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Colonia"
                value={formData.neighborhood}
                onChange={(e) => handleInputChange('neighborhood',e.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Latitud"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude',e.target.value)}
                fullWidth
                type="number"
                inputProps={{ step: 0.000001 }}
                disabled
              />
              <TextField
                label="Longitud"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude',e.target.value)}
                fullWidth
                type="number"
                inputProps={{ step: 0.000001 }}
                disabled
              />
            </Stack>
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Habitaciones"
                value={formData.bedrooms}
                onChange={(e) => handleInputChange('bedrooms',e.target.value)}
                fullWidth
                required
                type="number"
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Ocupantes Máximos"
                value={formData.maxOccupants}
                onChange={(e) => handleInputChange('maxOccupants',e.target.value)}
                fullWidth
                required
                type="number"
                inputProps={{ min: 1 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Renta Mensual"
                value={formData.monthlyRent}
                onChange={(e) => handleInputChange('monthlyRent',e.target.value)}
                fullWidth
                required
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  endAdornment: <InputAdornment position="end">USDT</InputAdornment>,
                }}
              />
              <TextField
                label="Depósito de Seguridad"
                value={formData.securityDeposit}
                onChange={(e) => handleInputChange('securityDeposit',e.target.value)}
                fullWidth
                required
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  endAdornment: <InputAdornment position="end">USDT</InputAdornment>,
                }}
              />
            </Stack>

            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.utilitiesIncluded}
                    onChange={(e) => handleInputChange('utilitiesIncluded',e.target.checked)}
                  />
                }
                label="Servicios incluidos en la renta"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.furnishedIncluded}
                    onChange={(e) => handleInputChange('furnishedIncluded',e.target.checked)}
                  />
                }
                label="Propiedad amueblada"
              />
            </Stack>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={600}>Opciones Avanzadas</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    label="Baños"
                    value={formData.bathrooms}
                    onChange={(e) => handleInputChange('bathrooms',e.target.value)}
                    fullWidth
                    type="number"
                    inputProps={{ min: 1 }}
                  />
                  <TextField
                    label="Metros Cuadrados"
                    value={formData.squareMeters}
                    onChange={(e) => handleInputChange('squareMeters',e.target.value)}
                    fullWidth
                    type="number"
                    inputProps={{ min: 1 }}
                  />
                  <TextField
                    label="Número de Piso"
                    value={formData.floorNumber}
                    onChange={(e) => handleInputChange('floorNumber',e.target.value)}
                    fullWidth
                    type="number"
                    inputProps={{ min: 0 }}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        );

      case 3:
        return (
          <Stack spacing={3}>
            <Alert severity="warning">
              Los términos legales serán registrados en blockchain y firmados digitalmente
            </Alert>

            <TextField
              label="Términos y Condiciones del Arrendamiento"
              value={formData.legalTerms}
              onChange={(e) => handleInputChange('legalTerms',e.target.value)}
              fullWidth
              required
              multiline
              rows={8}
              placeholder="Ingresa los términos legales del contrato de arrendamiento..."
            />

            <Paper sx={{ p: 2,bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Resumen de la Propiedad
              </Typography>
              <Stack spacing={1} mt={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Nombre:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.name}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Tipo:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {PROPERTY_TYPES.find((t) => t.value === formData.propertyType)?.label}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Ubicación:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.city}, {formData.state}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Renta Mensual:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${formData.monthlyRent} USDT
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Depósito:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${formData.securityDeposit} USDT
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        );

      default:
        return null;
    }
  };

  // Si la transacción fue exitosa
  if (txHash) {
    return (
      <Box>
        <Header
          onFundingModalOpen={() => { }}
          onConnectGoogle={() => { }}
          onConnectMetaMask={handleConnectWallet}
          onViewNFTClick={() => { }}
          onMintNFTClick={() => { }}
          onViewMyPropertiesClick={() => { }}
          onSavingsClick={() => { }}
          onHowItWorksClick={() => { }}
          tenantPassportData={null}
          setShowOnboarding={() => { }}
          showOnboarding={false}
        />
        <Box maxWidth={800} mx="auto" mt={8} textAlign="center">
          <Paper sx={{ p: 6,borderRadius: 3 }}>
            <CheckCircle sx={{ fontSize: 80,color: 'success.main',mb: 3 }} />
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Propiedad Registrada con Éxito
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
              Tu propiedad ha sido registrada exitosamente en blockchain
            </Typography>

            <Stack spacing={2} alignItems="center">
              {propertyId && (
                <Chip
                  label={`Property ID: ${propertyId}`}
                  color="primary"
                  size="medium"
                  sx={{ fontSize: 16,py: 2 }}
                />
              )}
              <Chip
                label={`TX: ${txHash.slice(0,10)}...${txHash.slice(-8)}`}
                variant="outlined"
                size="medium"
              />
              <Button
                variant="contained"
                onClick={() => window.location.href = '/dashboard'}
                sx={{ mt: 3 }}
              >
                Ir al Dashboard
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Header
        onFundingModalOpen={() => { }}
        onConnectGoogle={() => { }}
        onConnectMetaMask={handleConnectWallet}
        onViewNFTClick={() => { }}
        onMintNFTClick={() => { }}
        onViewMyPropertiesClick={() => { }}
        onSavingsClick={() => { }}
        onHowItWorksClick={() => { }}
        tenantPassportData={null}
        setShowOnboarding={() => { }}
        showOnboarding={false}
      />

      <Box maxWidth={900} mx="auto" mt={6} px={3}>
        <Paper sx={{ p: 4,borderRadius: 3 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">
            Registrar Propiedad
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" mb={4}>
            Registra tu propiedad en RoomFi Protocol - Estándar Institucional RWA
          </Typography>

          {!walletConnected ? (
            <Box textAlign="center" py={8}>
              <Typography variant="h6" gutterBottom>
                Conecta tu Wallet para continuar
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleConnectWallet}
                sx={{ mt: 3 }}
              >
                Conectar MetaMask
              </Button>
            </Box>
          ) : (
            <>
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {STEPS.map((label,index) => (
                  <Step key={label}>
                    <StepLabel icon={STEP_ICONS[index]}>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box mb={4}>{renderStepContent(activeStep)}</Box>

              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
                  Atrás
                </Button>

                {activeStep === STEPS.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {loading ? 'Registrando...' : 'Registrar Propiedad'}
                  </Button>
                ) : (
                  <Button variant="contained" onClick={handleNext}>
                    Siguiente
                  </Button>
                )}
              </Stack>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
