import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Portal from '@portal-hq/web'; // CORRECCIÓN: Importación por defecto
import { 
  AppBar, Toolbar, Typography, Button, Container, Box, Paper, Card, CardContent, 
  CardMedia, Avatar, Chip, Stack, Grid, useTheme, useMediaQuery, IconButton, 
  Menu, MenuItem, Modal, Snackbar, Alert, Drawer, List, ListItem, ListItemButton, 
  ListItemText, TextField, Slider, FormControl, InputLabel, Select, OutlinedInput, 
  createTheme, ThemeProvider, Fab 
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import MenuIcon from '@mui/icons-material/Menu';
import ListIcon from '@mui/icons-material/ViewList';
import PoolIcon from '@mui/icons-material/Pool';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import PetsIcon from '@mui/icons-material/Pets';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import FemaleIcon from '@mui/icons-material/Female';
import MaleIcon from '@mui/icons-material/Male';
import ApartmentIcon from '@mui/icons-material/Apartment';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import GroupIcon from '@mui/icons-material/Group';
import BedIcon from '@mui/icons-material/Bed';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

// CORRECCIÓN: Añadir tipos para window.ethereum para que TypeScript no se queje
declare global {
  interface Window {
    ethereum?: any;
  }
}

const listings = [
  {
    id: 1,
    lat: 19.4326,
    lng: -99.1332,
    user: { name: 'Don', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
    date: 'TODAY',
    roommates: 1,
    price: 1900,
    type: 'Private Room',
    bedrooms: 3,
    propertyType: 'Townhouse',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    available: 'Jun 28, 2025 - Flexible',
    location: 'Del Rey, Marina del Rey',
    amenities: ['piscina', 'estacionamiento', 'pet friendly'],
  },
  {
    id: 2,
    lat: 19.427,
    lng: -99.14,
    user: { name: 'Maeva', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', age: 29 },
    date: 'TODAY',
    roommates: 1,
    price: 1590,
    type: 'Private Room',
    bedrooms: 3,
    propertyType: 'Apartment',
    image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=600&q=80',
    available: 'Jun 28, 2025 - Flexible',
    location: 'Manhattan Valley, Manhattan',
    amenities: ['gimnasio', 'baño privado'],
  },
  {
    id: 3,
    lat: 19.44,
    lng: -99.12,
    user: { name: 'Robert', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', age: 53 },
    date: 'TODAY',
    roommates: 1,
    price: 1850,
    type: 'Private Room',
    bedrooms: 3,
    propertyType: 'Apartment',
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80',
    available: 'Jun 28, 2025 - 12 Months',
    location: "Hell's Kitchen, Manhattan",
    amenities: ['amueblado', 'estacionamiento'],
  },
  {
    id: 4,
    user: { name: 'Don', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
    date: 'TODAY',
    roommates: 1,
    price: 1900,
    type: 'Private Room',
    bedrooms: 3,
    propertyType: 'Townhouse',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    available: 'Jun 28, 2025 - Flexible',
    location: 'Del Rey, Marina del Rey',
    amenities: ['piscina', 'pet friendly'],
  },
  {
    id: 5,
    user: { name: 'Maeva', avatar: 'https://randomuser.me/api/portraits/women/2.jpg', age: 29 },
    date: 'TODAY',
    roommates: 1,
    price: 1590,
    type: 'Private Room',
    bedrooms: 3,
    propertyType: 'Apartment',
    image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=600&q=80',
    available: 'Jun 28, 2025 - Flexible',
    location: 'Manhattan Valley, Manhattan',
    amenities: ['gimnasio', 'baño privado', 'amueblado'],
  },
  {
    id: 6,
    user: { name: 'Robert', avatar: 'https://randomuser.me/api/portraits/men/3.jpg', age: 53 },
    date: 'TODAY',
    roommates: 1,
    price: 1850,
    type: 'Private Room',
    bedrooms: 3,
    propertyType: 'Apartment',
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80',
    available: 'Jun 28, 2025 - 12 Months',
    location: "Hell's Kitchen, Manhattan",
    amenities: ['estacionamiento', 'pet friendly'],
  },
  {
    id: 7,
    lat: 19.435,
    lng: -99.13,
    user: { name: 'Sofia', avatar: 'https://randomuser.me/api/portraits/women/4.jpg', age: 25 },
    date: 'TODAY',
    roommates: 2,
    price: 2200,
    type: 'Private Room',
    bedrooms: 2,
    propertyType: 'Condominium',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80',
    available: 'Jul 15, 2025 - 6 Months',
    location: 'Roma Norte, CDMX',
    amenities: ['piscina', 'gimnasio', 'baño privado', 'amueblado'],
  },
  {
    id: 8,
    lat: 19.428,
    lng: -99.135,
    user: { name: 'Carlos', avatar: 'https://randomuser.me/api/portraits/men/5.jpg', age: 31 },
    date: 'TODAY',
    roommates: 1,
    price: 1800,
    type: 'Private Room',
    bedrooms: 4,
    propertyType: 'House',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80',
    available: 'Aug 1, 2025 - Flexible',
    location: 'Condesa, CDMX',
    amenities: ['estacionamiento', 'pet friendly', 'amueblado'],
  },
  {
    id: 9,
    lat: 19.442,
    lng: -99.125,
    user: { name: 'Ana', avatar: 'https://randomuser.me/api/portraits/women/6.jpg', age: 28 },
    date: 'TODAY',
    roommates: 3,
    price: 1600,
    type: 'Private Room',
    bedrooms: 3,
    propertyType: 'Apartment',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80',
    available: 'Jul 10, 2025 - 12 Months',
    location: 'Polanco, CDMX',
    amenities: ['gimnasio', 'baño privado', 'piscina'],
  },
];

const customTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#81c784', // Verde mint suave
      light: '#a5d6a7',
      dark: '#66bb6a',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.125rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];
const TOKEN_ADDRESS = "0x82B9e52b26A2954E113F94Ff26647754d5a4247D"; // Proxy address

function App() {
  const isMobile = useMediaQuery(customTheme.breakpoints.down('md'));
  const isMobileOnly = useMediaQuery(customTheme.breakpoints.down('sm'));
  
  // Estados de UI
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [drawerCardsOpen, setDrawerCardsOpen] = useState(false);
  const [drawerMenuOpen, setDrawerMenuOpen] = useState(false);
  const [precio, setPrecio] = React.useState([1000, 80000]);
  const [amenidades, setAmenidades] = React.useState<string[]>([]);

  // Estados de Web3
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | ethers.BrowserProvider | null>(null);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Estados del Mapa
  const mapCenter = { lat: 19.4326, lng: -99.1333 };
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyB4fQPo0OIqzCgW5muQsodw-xOPMCz5oP0', // <-- Reemplaza por tu API Key
  });
  const [selectedListing, setSelectedListing] = useState<typeof listings[0] | null>(null);

  // Siempre usar el RPC de Arbitrum Sepolia
  const ARBITRUM_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
  const ARBITRUM_SEPOLIA_CHAIN = {
    chainId: 421614,
    name: "arbitrum-sepolia"
  };

  // Handlers UI
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handlePrecioChange = (event: Event, newValue: number | number[]) => setPrecio(newValue as number[]);
  const handleAmenidadChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setAmenidades(typeof value === 'string' ? value.split(',') : value);
  };

  // Handlers Web3
  const handleOnboardingOpen = () => setShowOnboarding(true);
  const handleOnboardingClose = () => setShowOnboarding(false);
  const handleFundingModalOpen = () => setShowFundingModal(true);
  const handleFundingModalClose = () => {
    setShowFundingModal(false);
    setDepositAmount('');
  };
  const handleNotificationClose = () => setNotification({ ...notification, open: false });

  const [tokenBalance, setTokenBalance] = useState<number>(0);

  const fetchTokenBalance = async (
    prov: ethers.JsonRpcProvider | ethers.BrowserProvider,
    acc: string
  ) => {
    if (prov && acc) {
      const contract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, prov);
      const rawBalance = await contract.balanceOf(acc);
      setTokenBalance(Number(ethers.formatUnits(rawBalance, 6)));
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setNotification({ open: true, message: 'Por favor, introduce un monto válido.', severity: 'error' });
      return;
    }
    console.log(`Simulando depósito de ${amount} MXN...`);
    if (provider && account) {
      await fetchTokenBalance(provider, account); // Actualiza el balance real después del depósito
    }
    setNotification({ open: true, message: `¡${amount} MXNB añadidos a tu wallet!`, severity: 'success' });
    handleFundingModalClose();
  };

  const connectWithMetaMask = async () => {
    try {
      const web3Provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC, ARBITRUM_SEPOLIA_CHAIN);
      let address = null;
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        address = accounts[0];
      } else {
        address = ethers.Wallet.createRandom().address;
      }
      setProvider(web3Provider);
      setAccount(address);
      handleOnboardingClose();
      await fetchTokenBalance(web3Provider, address); // Actualiza el balance real después de conectar
    } catch (error) {
      console.error("Error connecting with MetaMask:", error);
      setNotification({ open: true, message: 'Error al conectar con MetaMask.', severity: 'error' });
    }
  };

  const createVirtualWallet = async () => {
    const web3Provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC, ARBITRUM_SEPOLIA_CHAIN);
    const simulatedWallet = ethers.Wallet.createRandom().connect(web3Provider);
    setProvider(web3Provider);
    setAccount(simulatedWallet.address);
    setNotification({ open: true, message: `Wallet virtual creada: ${simulatedWallet.address.substring(0, 10)}...`, severity: 'success' });
    handleOnboardingClose();
    setTokenBalance(0);
  };

  const renderAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case 'piscina':
        return <PoolIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
      case 'gimnasio':
        return <FitnessCenterIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
      case 'estacionamiento':
        return <LocalParkingIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
      case 'pet friendly':
        return <PetsIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: 'primary.main', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
            <img
              src="/roomfilogo2.png"
              alt="RoomFi Logo"
              style={{ height: '50px', objectFit: 'contain', display: 'block' }}
            />
          </Box>
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexGrow: 1 }}>
              <Button sx={{ color: 'primary.main', fontWeight: 600 }}>Como funciona</Button>
              <Button sx={{ color: 'primary.main', fontWeight: 600 }}>Verifica roomie</Button>
              <Button sx={{ color: 'primary.main', fontWeight: 600 }}>Para empresas</Button>
            </Box>
          )}
          {isMobile && <Box sx={{ flexGrow: 1 }} />}
          {isMobile ? (
            <>
              <IconButton
                size="large"
                aria-label="menu"
                onClick={() => setDrawerMenuOpen(true)}
                sx={{ color: 'primary.main' }}
              >
                <MenuIcon />
              </IconButton>
              <Drawer anchor="left" open={drawerMenuOpen} onClose={() => setDrawerMenuOpen(false)}>
                <Box
                  sx={{ width: 250 }}
                  role="presentation"
                  onClick={() => setDrawerMenuOpen(false)}
                  onKeyDown={() => setDrawerMenuOpen(false)}
                >
                  <List>
                    <ListItem disablePadding>
                      <ListItemButton><ListItemText primary="Como funciona" /></ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton><ListItemText primary="Verifica roomie" /></ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton><ListItemText primary="Para empresas" /></ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton onClick={handleOnboardingOpen}><ListItemText primary="Conectar" /></ListItemButton>
                    </ListItem>
                  </List>
                </Box>
              </Drawer>
            </>
          ) : (
            <>
              {account ? (
                <Paper elevation={2} sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{tokenBalance.toFixed(2)} MXNB</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}</Typography>
                  </Box>
                  <Button variant="contained" size="small" onClick={handleFundingModalOpen}>Añadir Fondos</Button>
                </Paper>
              ) : (
                <Button 
                  color="primary" 
                  variant="contained" 
                  onClick={handleOnboardingOpen}
                  sx={{ ml: 2, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                >
                  Conectar
                </Button>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>

      <Modal open={showOnboarding} onClose={handleOnboardingClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper sx={{ p: 4, borderRadius: 2, maxWidth: 400, width: '100%' }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Conecta tu Wallet</Typography>
          <Stack spacing={2}>
            <Button variant="contained" fullWidth onClick={connectWithMetaMask}>Conectar con MetaMask</Button>
            <Button variant="outlined" fullWidth onClick={createVirtualWallet}>Crear Wallet con Email</Button>
          </Stack>
        </Paper>
      </Modal>

      <Modal open={showFundingModal} onClose={handleFundingModalClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <Paper sx={{ p: 4, borderRadius: 2, maxWidth: 400, width: '100%' }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Añadir Fondos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Los depósitos se realizan vía SPEI y se convierten automáticamente a MXNB (1 MXN = 1 MXNB).
          </Typography>
          <Stack spacing={2}>
            <TextField label="Monto a depositar (MXN)" type="number" variant="outlined" fullWidth value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            <Button variant="contained" fullWidth onClick={handleDeposit}>Generar Ficha de Pago SPEI</Button>
          </Stack>
        </Paper>
      </Modal>
      
      <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 4, md: 8 }, px: { xs: 1, sm: 2, md: 3 } }}>
        <Grid container spacing={{ xs: 2, sm: 4 }} alignItems="center">
          <Grid item xs={12} md={5}>
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom 
              sx={{ 
                fontWeight: 800, 
                color: 'primary.main',
                fontSize: { xs: '1.3rem', sm: '1.7rem', md: '2.2rem' },
                lineHeight: { xs: 1.1, sm: 1.2, md: 1.25 },
                mb: 1
              }}
            >
              Encuentra tu Roomie ideal
            </Typography>
            <Typography 
              variant="h5" 
              color="text.secondary" 
              paragraph
              sx={{
                fontSize: { xs: '0.95rem', sm: '1rem', md: '1.1rem' },
                lineHeight: { xs: 1.3, sm: 1.4, md: 1.5 },
                mb: 1
              }}
            >
              Somos RoomFi, una plataforma amigable, confiable y tecnológica para encontrar compañeros de cuarto y compartir hogar de forma segura gracias a Web3, ¡sin complicaciones!
            </Typography>
            <Box sx={{ 
              mt: 2,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1, sm: 1.5 }
            }}>
              <Button 
                variant="contained" 
                size="small" 
                color="primary" 
                sx={{ 
                  width: { xs: '100%', sm: 'auto' },
                  fontSize: { xs: '0.95rem', sm: '1rem' },
                  py: 1.1,
                  px: 2.5
                }}
              >
                Buscar habitaciones
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                color="primary"
                sx={{ 
                  width: { xs: '100%', sm: 'auto' },
                  fontSize: { xs: '0.95rem', sm: '1rem' },
                  py: 1.1,
                  px: 2.5
                }}
              >
                Publicar anuncio
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper elevation={3} sx={{ 
              p: { xs: 1, sm: 2 },
              bgcolor: '#f5f7fa',
              textAlign: 'center',
              borderRadius: 4,
              minHeight: 0
            }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                      fullWidth
                      label="¿En dónde buscas departamento?"
                      variant="outlined"
                      size="small"
                      sx={{ bgcolor: 'white', borderRadius: 2, mb: 1 }}
                    />
                    <Box sx={{ mt: 0.5, px: 2.5 }}>
                      <Typography gutterBottom sx={{ fontWeight: 500, color: 'primary.main', mb: 0.5, fontSize: '0.95rem', textAlign: 'left' }}>
                        ¿Qué precio buscas?
                      </Typography>
                      <Slider
                        value={precio}
                        onChange={handlePrecioChange}
                        valueLabelDisplay="auto"
                        min={1000}
                        max={80000}
                        step={500}
                        marks={[
                          { value: 1000, label: <span style={{fontWeight:500, color:'#1976d2', fontSize:'0.85rem'}}>$1,000</span> },
                          { value: 80000, label: <span style={{fontWeight:500, color:'#1976d2', fontSize:'0.85rem'}}>$80,000</span> }
                        ]}
                        sx={{ color: 'primary.main', height: 4, mb: 2, width: '100%' }}
                      />
                    </Box>
                    <FormControl fullWidth sx={{ mt: 1.5, bgcolor: 'white', borderRadius: 2 }} size="small">
                      <InputLabel id="amenidad-label" sx={{ fontSize: '0.95rem' }}>¿Qué amenidades buscas?</InputLabel>
                      <Select
                        fullWidth
                        labelId="amenidad-label"
                        id="amenidad-select"
                        multiple
                        value={amenidades}
                        onChange={handleAmenidadChange}
                        input={<OutlinedInput label="¿Qué amenidades buscas?" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(selected as string[]).map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        <MenuItem value="amueblado"><BedIcon sx={{ color: '#6d4c41', fontSize: 20, mr: 1 }} />Amueblado</MenuItem>
                        <MenuItem value="baño privado"><MeetingRoomIcon sx={{ color: '#43a047', fontSize: 20, mr: 1 }} />Baño privado</MenuItem>
                        <MenuItem value="pet friendly"><PetsIcon sx={{ color: '#ff9800', fontSize: 20, mr: 1 }} />Pet friendly</MenuItem>
                        <MenuItem value="estacionamiento"><LocalParkingIcon sx={{ color: '#1976d2', fontSize: 20, mr: 1 }} />Estacionamiento</MenuItem>
                        <MenuItem value="piscina"><PoolIcon sx={{ color: '#00bcd4', fontSize: 20, mr: 1 }} />Piscina</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 2 }} size="small">
                      <InputLabel id="tipo-propiedad-label" sx={{ fontSize: '0.95rem' }}>Tipo de propiedad</InputLabel>
                      <Select
                        labelId="tipo-propiedad-label"
                        id="tipo-propiedad-select"
                        label="Tipo de propiedad"
                        defaultValue=""
                      >
                        <MenuItem value="departamento"><ApartmentIcon sx={{ color: '#1976d2', fontSize: 20, mr: 1 }} />Departamento completo</MenuItem>
                        <MenuItem value="privada"><MeetingRoomIcon sx={{ color: '#43a047', fontSize: 20, mr: 1 }} />Habitación privada</MenuItem>
                        <MenuItem value="compartida"><GroupIcon sx={{ color: '#fbc02d', fontSize: 20, mr: 1 }} />Habitación compartida</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 2, mt: { xs: 2, md: 4 } }} size="small">
                      <InputLabel id="genero-label" sx={{ fontSize: '0.95rem' }}>Preferencia de roomie</InputLabel>
                      <Select
                        labelId="genero-label"
                        id="genero-select"
                        label="Preferencia de roomie"
                        defaultValue=""
                      >
                        <MenuItem value="mujeres"><FemaleIcon sx={{ color: '#e91e63', fontSize: 20, mr: 1 }} />Solo mujeres</MenuItem>
                        <MenuItem value="hombres"><MaleIcon sx={{ color: '#1976d2', fontSize: 20, mr: 1 }} />Solo hombres</MenuItem>
                        <MenuItem value="igual"><span style={{ fontSize: 20, marginRight: 8 }}>⚧️</span>Me da igual</MenuItem>
                        <MenuItem value="lgbtq"><span style={{ fontSize: 20, marginRight: 8 }}>🏳️‍🌈</span>LGBTQ+</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ position: 'relative', width: '100%', minHeight: '100vh', mt: { xs: 4, sm: 6, md: 8 } }}>
          <Box sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}>
            {isLoaded && (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={13}
                options={{ disableDefaultUI: true, gestureHandling: 'greedy', styles: [ { featureType: 'poi', stylers: [{ visibility: 'off' }] }, { featureType: 'transit', stylers: [{ visibility: 'off' }] } ] }}
                onClick={() => setSelectedListing(null)}
              >
                {listings.map((listing) => (
                  listing.lat && listing.lng ? (
                    <Marker
                      key={listing.id}
                      position={{ lat: listing.lat, lng: listing.lng }}
                      onClick={() => setSelectedListing(listing)}
                      icon={{
                        url: "/roomcasa.png",
                        scaledSize: new window.google.maps.Size(40, 40)
                      }}
                    />
                  ) : null
                ))}
                {selectedListing && selectedListing.lat && selectedListing.lng && (
                    <InfoWindow
                      position={{ lat: selectedListing.lat, lng: selectedListing.lng }}
                      onCloseClick={() => setSelectedListing(null)}
                    >
                      <Box sx={{ minWidth: 220, maxWidth: 260 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar src={selectedListing.user.avatar} alt={selectedListing.user.name} sx={{ mr: 1 }} />
                          <Typography fontWeight={700}>{selectedListing.user.name}</Typography>
                          <Chip label={selectedListing.date} color="success" size="small" sx={{ mx: 1, fontWeight: 700 }} />
                          <Chip label={`${selectedListing.roommates} ROOMMATE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                          <img src={selectedListing.image} alt={selectedListing.location} style={{ width: '100%', borderRadius: 8, maxHeight: 100, objectFit: 'cover' }} />
                        </Box>
                        <Typography variant="h6" fontWeight={800} gutterBottom>
                          ${selectedListing.price.toLocaleString()} <Typography component="span" variant="body2" color="text.secondary">/ mo</Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">{selectedListing.type} · {selectedListing.bedrooms} Bedrooms · {selectedListing.propertyType}</Typography>
                        <Typography variant="body2" color="text.secondary">{selectedListing.available}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{selectedListing.location}</Typography>
                      </Box>
                    </InfoWindow>
                )}
              </GoogleMap>
            )}
          </Box>
          {isMobileOnly ? (
            <>
              <Fab color="primary" aria-label="Ver lista" onClick={() => setDrawerCardsOpen(true)} sx={{ position: 'absolute', bottom: 24, right: 24, zIndex: 2 }}>
                <ListIcon />
              </Fab>
              <Drawer
                anchor="bottom"
                open={drawerCardsOpen}
                onClose={() => setDrawerCardsOpen(false)}
                PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, bgcolor: 'white', border: '1px solid #e0e0e0', maxHeight: '70vh', p: 2 } }}
              >
                <Box sx={{ overflowY: 'auto', maxHeight: '100vh' }}>
                  {listings.map((listing, index) => (
                    <Card key={`${listing.id}-${index}`} sx={{ borderRadius: 4, boxShadow: 'none', border: '1px solid #e0e0e0', mb: 2, cursor: 'pointer', '&:hover': { boxShadow: 4, borderColor: 'primary.main' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 0 }}>
                        <Avatar src={listing.user.avatar} alt={listing.user.name} sx={{ mr: 1 }} />
                        <Typography fontWeight={700}>{listing.user.name}</Typography>
                        <Chip label={listing.date} color="success" size="small" sx={{ mx: 1, fontWeight: 700 }} />
                        <Chip label={`${listing.roommates} ROOMMATE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                      </Box>
                      <CardMedia component="img" height="120" image={listing.image} alt={listing.location} sx={{ objectFit: 'cover', borderRadius: 2, m: 2, mb: 0 }} />
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight={800} gutterBottom>${listing.price.toLocaleString()} <Typography component="span" variant="body2" color="text.secondary">/ mo</Typography></Typography>
                        <Typography variant="body2" color="text.secondary">{listing.type} · {listing.bedrooms} Bedrooms · {listing.propertyType}</Typography>
                        <Typography variant="body2" color="text.secondary">{listing.available}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{listing.location}</Typography>
                        {listing.amenities && listing.amenities.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                            {listing.amenities.slice(0, 4).map((amenity, idx) => (
                              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {renderAmenityIcon(amenity)}
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{amenity}</Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Drawer>
            </>
          ) : (
            <Box sx={{ position: 'relative', zIndex: 1, width: { xs: '100%', sm: 400 }, maxWidth: 480, height: { xs: 340, sm: 500, md: '100vh' }, overflowY: 'auto', bgcolor: 'white', border: '1px solid #e0e0e0', borderRadius: 3, p: 2, ml: { sm: 4 }, mt: { xs: 0, sm: 0 } }}>
              {listings.map((listing, index) => (
                <Card key={`${listing.id}-${index}`} sx={{ borderRadius: 4, boxShadow: 'none', border: '1px solid #e0e0e0', mb: 2, cursor: 'pointer', '&:hover': { boxShadow: 4, borderColor: 'primary.main' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 0 }}>
                    <Avatar src={listing.user.avatar} alt={listing.user.name} sx={{ mr: 1 }} />
                    <Typography fontWeight={700}>{listing.user.name}</Typography>
                    <Chip label={listing.date} color="success" size="small" sx={{ mx: 1, fontWeight: 700 }} />
                    <Chip label={`${listing.roommates} ROOMMATE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                  </Box>
                  <CardMedia component="img" height="120" image={listing.image} alt={listing.location} sx={{ objectFit: 'cover', borderRadius: 2, m: 2, mb: 0 }} />
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={800} gutterBottom>${listing.price.toLocaleString()} <Typography component="span" variant="body2" color="text.secondary">/ mo</Typography></Typography>
                    <Typography variant="body2" color="text.secondary">{listing.type} · {listing.bedrooms} Bedrooms · {listing.propertyType}</Typography>
                    <Typography variant="body2" color="text.secondary">{listing.available}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{listing.location}</Typography>
                    {listing.amenities && listing.amenities.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        {listing.amenities.slice(0, 4).map((amenity, idx) => (
                          <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {renderAmenityIcon(amenity)}
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{amenity}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </Container>
      
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 4, sm: 6 }, mt: { xs: 4, sm: 6, md: 8 } }}>
        {/* ... Footer ... */}
      </Box>
      
      <Box sx={{ bgcolor: '#222', color: 'white', py: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          &copy; {new Date().getFullYear()} RoomFi. Todos los derechos reservados.
        </Typography>
      </Box>

      <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleNotificationClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleNotificationClose} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Componente wrapper para proveer el tema
const AppWrapper = () => (
  <ThemeProvider theme={customTheme}>
    <App />
  </ThemeProvider>
);

export default AppWrapper;
