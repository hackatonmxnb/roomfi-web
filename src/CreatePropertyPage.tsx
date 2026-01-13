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
  { value: 0, label: 'Apartment' },
  { value: 1, label: 'House' },
  { value: 2, label: 'Studio' },
  { value: 3, label: 'Room' },
  { value: 4, label: 'Loft' },
  { value: 5, label: 'Penthouse' },
];

const steps = ['Basic Info', 'Location', 'Details', 'Pricing'];

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
        throw new Error("MetaMask is not installed.");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (Number(network.chainId) !== NETWORK_CONFIG.chainId) {
        throw new Error(`Please switch to ${NETWORK_CONFIG.chainName} network`);
      }

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // 1. Verificar TenantPassport
      setStatusMessage('Verifying TenantPassport...');
      const passportContract = new ethers.Contract(TENANT_PASSPORT_ADDRESS, TENANT_PASSPORT_ABI, provider);
      const hasPassport = await passportContract.hasPassport(signerAddress);
      
      if (!hasPassport) {
        throw new Error("You need to create your TenantPassport first. Go to the main page and click 'Create Passport'.");
      }

      const contract = new ethers.Contract(PROPERTY_REGISTRY_ADDRESS, PROPERTY_REGISTRY_ABI, signer);

      // 2. Crear hash del documento legal (simulado)
      setStatusMessage('Preparing legal documents...');
      const legalDocumentHash = ethers.keccak256(
        ethers.toUtf8Bytes(`RoomFi Property: ${form.name} - ${form.fullAddress} - ${Date.now()}`)
      );

      // 3. Firmar el hash (Ricardian Contract)
      setStatusMessage('Signing digital contract...');
      const signature = await signer.signMessage(ethers.getBytes(legalDocumentHash));

      // Convert rent and deposit to USDT units (6 decimals)
      const monthlyRentWei = ethers.parseUnits(form.monthlyRent, 6);
      const securityDepositWei = ethers.parseUnits(form.securityDeposit, 6);

      setStatusMessage('Registering property on blockchain...');

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

      setStatusMessage('Waiting for confirmation...');
      await tx.wait();

      setStatusMessage('Property registered successfully!');
      setTimeout(() => navigate('/my-properties'), 2000);

    } catch (err: any) {
      console.error('Error registering property:', err);
      setError(err.reason || err.message || 'Error registering property');
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
              label="Property Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              placeholder="E.g.: Downtown Apartment"
            />
            <FormControl fullWidth>
              <InputLabel>Property Type</InputLabel>
              <Select
                value={form.propertyType}
                label="Property Type"
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
              label="Full Address"
              name="fullAddress"
              value={form.fullAddress}
              onChange={handleChange}
              fullWidth
              required
              placeholder="Street, Number, Neighborhood"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="City"
                name="city"
                value={form.city}
                onChange={handleChange}
                fullWidth
                required
                sx={{ flex: 1 }}
              />
              <TextField
                label="State"
                name="state"
                value={form.state}
                onChange={handleChange}
                fullWidth
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Postal Code"
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                fullWidth
                sx={{ flex: 1 }}
              />
              <TextField
                label="Neighborhood"
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
                  label="Bedrooms"
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
                  label="Bathrooms"
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
                  label="Max Occupants"
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
                  label="Floor"
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
              label="Square Meters"
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
                label="Utilities included"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.furnishedIncluded}
                    onChange={handleChange}
                    name="furnishedIncluded"
                  />
                }
                label="Furnished"
              />
            </Stack>
          </Stack>
        );

      case 3:
        return (
          <Stack spacing={3}>
            <TextField
              label="Monthly Rent (USDT)"
              name="monthlyRent"
              type="number"
              value={form.monthlyRent}
              onChange={handleChange}
              fullWidth
              required
              placeholder="E.g.: 1500"
              InputProps={{
                startAdornment: <Typography color="text.secondary" mr={1}>$</Typography>
              }}
            />
            <TextField
              label="Security Deposit (USDT)"
              name="securityDeposit"
              type="number"
              value={form.securityDeposit}
              onChange={handleChange}
              fullWidth
              required
              placeholder="E.g.: 3000"
              InputProps={{
                startAdornment: <Typography color="text.secondary" mr={1}>$</Typography>
              }}
            />
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Summary
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Property:</strong> {form.name || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Type:</strong> {PROPERTY_TYPES[form.propertyType]?.label}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>City:</strong> {form.city || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Size:</strong> {form.squareMeters}m²</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Bedrooms:</strong> {form.bedrooms}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>Bathrooms:</strong> {form.bathrooms}</Typography>
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
          Register New Property
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={4}>
          Complete the information to register your property on the blockchain.
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
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !validateStep(activeStep)}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Registering...' : 'Register Property'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!validateStep(activeStep)}
            >
              Next
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
