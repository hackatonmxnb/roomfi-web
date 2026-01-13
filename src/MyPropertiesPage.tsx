import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Box, Typography, Paper, Button, Grid, Chip, Stack, CircularProgress,
  Card, CardContent, CardActions, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import ApartmentIcon from '@mui/icons-material/Apartment';
import HouseIcon from '@mui/icons-material/House';
import BedIcon from '@mui/icons-material/Bed';
import BathtubIcon from '@mui/icons-material/Bathtub';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import AddIcon from '@mui/icons-material/Add';
import {
  PROPERTY_REGISTRY_ADDRESS,
  PROPERTY_REGISTRY_ABI,
  NETWORK_CONFIG,
} from './web3/config';

interface Property {
  id: number;
  name: string;
  propertyType: number;
  fullAddress: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  squareMeters: number;
  monthlyRent: number;
  securityDeposit: number;
  isVerified: boolean;
  isActive: boolean;
  landlord: string;
}

interface MyPropertiesPageProps {
  account: string | null;
  provider: ethers.BrowserProvider | null;
}

const PROPERTY_TYPES = ['Apartamento', 'Casa', 'Estudio', 'Habitación', 'Loft', 'Penthouse'];

export default function MyPropertiesPage({ account, provider }: MyPropertiesPageProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchProperties = useCallback(async () => {
    if (!account || !provider) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const contract = new ethers.Contract(PROPERTY_REGISTRY_ADDRESS, PROPERTY_REGISTRY_ABI, provider);
      const propertyCount = await contract.propertyCounter();
      
      const props: Property[] = [];
      for (let i = 1; i <= Number(propertyCount); i++) {
        try {
          const p = await contract.getProperty(i);
          if (p.landlord && p.landlord.toLowerCase() === account.toLowerCase()) {
            props.push({
              id: i,
              name: p.name || `Propiedad ${i}`,
              propertyType: Number(p.propertyType),
              fullAddress: p.fullAddress || '',
              city: p.city || '',
              bedrooms: Number(p.bedrooms),
              bathrooms: Number(p.bathrooms),
              squareMeters: Number(p.squareMeters),
              monthlyRent: Number(ethers.formatUnits(p.monthlyRent, 6)),
              securityDeposit: Number(ethers.formatUnits(p.securityDeposit, 6)),
              isVerified: p.isVerified,
              isActive: p.isActive,
              landlord: p.landlord,
            });
          }
        } catch (e) {
          console.log(`Property ${i} error:`, e);
        }
      }

      setProperties(props);
    } catch (err: any) {
      console.error('Error fetching properties:', err);
      setError('Error al cargar propiedades. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [account, provider]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const getPropertyIcon = (type: number) => {
    switch (type) {
      case 0: return <ApartmentIcon />;
      case 1: return <HouseIcon />;
      case 3: return <BedIcon />;
      default: return <HomeIcon />;
    }
  };

  if (!account) {
    return (
      <Box maxWidth={800} mx="auto" mt={6} p={3}>
        <Alert severity="warning">
          Por favor conecta tu wallet para ver tus propiedades.
        </Alert>
      </Box>
    );
  }

  return (
    <Box maxWidth={1200} mx="auto" mt={4} p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700}>
          Mis Propiedades
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/create-property')}
        >
          Registrar Nueva Propiedad
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : properties.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          <HomeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" mb={2}>
            No tienes propiedades registradas
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Registra tu primera propiedad para comenzar a recibir inquilinos.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/create-property')}
          >
            Registrar Propiedad
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {properties.map((prop) => (
            <Grid item xs={12} md={6} lg={4} key={prop.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getPropertyIcon(prop.propertyType)}
                      <Typography variant="h6" fontWeight={600}>
                        {prop.name}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {prop.isVerified && (
                        <Chip label="Verificada" color="success" size="small" />
                      )}
                      <Chip 
                        label={prop.isActive ? "Activa" : "Inactiva"} 
                        color={prop.isActive ? "primary" : "default"} 
                        size="small" 
                      />
                    </Stack>
                  </Stack>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {prop.fullAddress || prop.city || 'Sin dirección'}
                  </Typography>

                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    {PROPERTY_TYPES[prop.propertyType] || 'Propiedad'}
                  </Typography>

                  <Grid container spacing={1} mb={2}>
                    <Grid item xs={4}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <BedIcon fontSize="small" color="action" />
                        <Typography variant="body2">{prop.bedrooms}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <BathtubIcon fontSize="small" color="action" />
                        <Typography variant="body2">{prop.bathrooms}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <SquareFootIcon fontSize="small" color="action" />
                        <Typography variant="body2">{prop.squareMeters}m²</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Grid container>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Renta Mensual</Typography>
                        <Typography variant="h6" fontWeight={600} color="primary">
                          ${prop.monthlyRent.toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Depósito</Typography>
                        <Typography variant="body1" fontWeight={500}>
                          ${prop.securityDeposit.toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate(`/agreements?propertyId=${prop.id}`)}
                  >
                    Crear Contrato
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box mt={4} p={3} bgcolor="grey.100" borderRadius={3}>
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Información de Red
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Red: {NETWORK_CONFIG.chainName} | Contrato: {PROPERTY_REGISTRY_ADDRESS.slice(0, 10)}...
        </Typography>
      </Box>
    </Box>
  );
}
