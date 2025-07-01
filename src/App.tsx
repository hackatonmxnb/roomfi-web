import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Portal } from '@portal-hq/web';
import { AppBar, Toolbar, Typography, Button, Container, Box, Paper, Card, CardContent, CardMedia, Avatar, Chip, Stack, Grid, useTheme, useMediaQuery, IconButton, Menu, MenuItem, Modal, Snackbar, Alert } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Slider from '@mui/material/Slider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import OutlinedInput from '@mui/material/OutlinedInput';
import type { SelectChangeEvent } from '@mui/material/Select';

const listings = [
  {
    id: 1,
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
  },
  {
    id: 2,
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
  },
  {
    id: 3,
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
  },  
];

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [precio, setPrecio] = React.useState([1000, 80000]);
  const [amenidades, setAmenidades] = React.useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const handleOnboardingOpen = () => setShowOnboarding(true);
  const handleOnboardingClose = () => setShowOnboarding(false);

  const handleFundingModalOpen = () => setShowFundingModal(true);
  const handleFundingModalClose = () => {
    setShowFundingModal(false);
    setDepositAmount(''); // Reset amount on close
  };
  
  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setNotification({ open: true, message: 'Por favor, introduce un monto válido.', severity: 'error' });
      return;
    }

    // --- SIMULACIÓN DE API ---
    //la API de Juno.
    // Por ahora, simulamos el éxito inmediato.
    console.log(`Simulando depósito de ${amount} MXN...`);
    
    setBalance(prevBalance => prevBalance + amount);
    setNotification({ open: true, message: `¡${amount} MXBNT añadidos a tu wallet!`, severity: 'success' });
    handleFundingModalClose();
  };

  const connectWithMetaMask = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        await web3Provider.send("eth_requestAccounts", []);
        const signer = web3Provider.getSigner();
        const address = await signer.getAddress();
        
        setProvider(web3Provider);
        setAccount(address);
        handleOnboardingClose();
      } catch (error) {
        console.error("Error connecting with MetaMask:", error);
      }
    } else {
      alert("MetaMask no está instalado. Por favor, instálalo para continuar.");
    }
  };

  const createVirtualWallet = async () => {
    // NOTE: This is a placeholder for the actual Portal SDK integration.
    const simulatedAddress = ethers.Wallet.createRandom().address;
    setAccount(simulatedAddress);
    setNotification({ open: true, message: `Wallet virtual creada: ${simulatedAddress.substring(0, 10)}...`, severity: 'success' });
    handleOnboardingClose();
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerOpen = () => {
    setDrawerOpen(true);
  };
  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handlePrecioChange = (event: Event, newValue: number | number[]) => {
    setPrecio(newValue as number[]);
  };

  const handleAmenidadChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setAmenidades(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <div>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: 'primary.main', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
            <img
              src="/roomfilogo2.png"
              alt="RoomFi Logo"
              style={{ height: '50px', objectFit: 'contain', display: 'block' }}
            />
          </Box>
          {/* Opciones de menú para desktop */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexGrow: 1 }}>
              <Button sx={{ color: 'primary.main', fontWeight: 600 }}>
                Como funciona
              </Button>
              <Button sx={{ color: 'primary.main', fontWeight: 600 }}>
                Verifica roomie
              </Button>
              <Button sx={{ color: 'primary.main', fontWeight: 600 }}>
                Para empresas
              </Button>
            </Box>
          )}
          {isMobile && <Box sx={{ flexGrow: 1 }} />}
          {isMobile ? (
            <>
              <IconButton
                size="large"
                aria-label="menu"
                onClick={handleDrawerOpen}
                sx={{ color: 'primary.main' }}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={handleDrawerClose}
              >
                <Box
                  sx={{ width: 250 }}
                  role="presentation"
                  onClick={handleDrawerClose}
                  onKeyDown={handleDrawerClose}
                >
                  <List>
                    <ListItem disablePadding>
                      <ListItemButton>
                        <ListItemText primary="Como funciona" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton>
                        <ListItemText primary="Verifica roomie" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton>
                        <ListItemText primary="Para empresas" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton>
                        <ListItemText primary="Iniciar sesión" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton>
                        <ListItemText primary="Regístrate" />
                      </ListItemButton>
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
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{balance.toFixed(2)} MXBNT</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}</Typography>
                  </Box>
                  <Button variant="contained" size="small" onClick={handleFundingModalOpen}>Añadir Fondos</Button>
                </Paper>
              ) : (
                <Button 
                  color="primary" 
                  variant="contained" 
                  onClick={handleOnboardingOpen}
                  sx={{ 
                    ml: 2, 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    fontSize: { sm: '0.875rem', md: '1rem' },
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                >
                  Conectar
                </Button>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>

      <Modal
        open={showOnboarding}
        onClose={handleOnboardingClose}
        aria-labelledby="onboarding-modal-title"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Paper sx={{ p: 4, borderRadius: 2, maxWidth: 400, width: '100%' }}>
          <Typography id="onboarding-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
            Conecta tu Wallet
          </Typography>
          <Stack spacing={2}>
            <Button variant="contained" fullWidth onClick={connectWithMetaMask}>
              Conectar con MetaMask
            </Button>
            <Button variant="outlined" fullWidth onClick={createVirtualWallet}>
              Crear Wallet con Email
            </Button>
          </Stack>
        </Paper>
      </Modal>

      <Modal
        open={showFundingModal}
        onClose={handleFundingModalClose}
        aria-labelledby="funding-modal-title"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Paper sx={{ p: 4, borderRadius: 2, maxWidth: 400, width: '100%' }}>
          <Typography id="funding-modal-title" variant="h6" component="h2" sx={{ mb: 2 }}>
            Añadir Fondos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Los depósitos se realizan vía SPEI y se convierten automáticamente a MXBNT (1 MXN = 1 MXBNT).
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Monto a depositar (MXN)"
              type="number"
              variant="outlined"
              fullWidth
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <Button variant="contained" fullWidth onClick={handleDeposit}>
              Generar Ficha de Pago SPEI
            </Button>
          </Stack>
        </Paper>
      </Modal>
      
      <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4, md: 8 }, px: { xs: 2, sm: 3 } }}>
        <Grid container spacing={{ xs: 2, sm: 4 }} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom 
              sx={{ 
                fontWeight: 800, 
                color: 'primary.main',
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                lineHeight: { xs: 1.2, sm: 1.3, md: 1.4 }
              }}
            >
              Encuentra tu Roomie ideal
            </Typography>
            <Typography 
              variant="h5" 
              color="text.secondary" 
              paragraph
              sx={{
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                lineHeight: { xs: 1.4, sm: 1.5, md: 1.6 }
              }}
            >
              Somos RoomFi, una plataforma amigable, confiable y tecnológica para encontrar compañeros de cuarto y compartir hogar de forma segura gracias a Web3, ¡sin complicaciones!
            </Typography>
            <Box sx={{ 
              mt: 4,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 2 }
            }}>
              <Button 
                variant="contained" 
                size="large" 
                color="primary" 
                sx={{ 
                  width: { xs: '100%', sm: 'auto' },
                  fontSize: { xs: '1rem', sm: '1.1rem' }
                }}
              >
                Buscar habitaciones
              </Button>
              <Button 
                variant="outlined" 
                size="large" 
                color="primary"
                sx={{ 
                  width: { xs: '100%', sm: 'auto' },
                  fontSize: { xs: '1rem', sm: '1.1rem' }
                }}
              >
                Publicar anuncio
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ 
              p: { xs: 2, sm: 4 },
              bgcolor: '#f5f7fa',
              textAlign: 'center',
              borderRadius: 4,
              minHeight: 320,
            }}>
              {/* Fondo con logo y transparencia */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 0,
                  opacity: 0.15,
                  pointerEvents: 'none',
                }}
              ></Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative', zIndex: 1 }}>
                <TextField
                  fullWidth
                  label="¿En dónde buscas departamento?"
                  variant="outlined"
                  sx={{ bgcolor: 'white', borderRadius: 2 }}
                />
                <TextField
                  fullWidth
                  label="¿Qué precio buscas?"
                  variant="outlined"
                  sx={{ display: 'none' }}
                />
                <Box sx={{ mt: 2, px: 1 }}>
                  <Typography gutterBottom sx={{ fontWeight: 500, color: 'primary.main', mb: 1 }}>
                    ¿Qué precio buscas?
                  </Typography>
                  <Slider
                    value={precio}
                    onChange={handlePrecioChange}
                    valueLabelDisplay="auto"
                    min={1000}
                    max={80000}
                    step={500}
                    marks={[{ value: 1000, label: '$1,000' }, { value: 80000, label: '$80,000' }]}
                    sx={{ color: 'primary.main' }}
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Rango seleccionado: ${precio[0].toLocaleString()} MXN - ${precio[1].toLocaleString()} MXN
                  </Typography>
                  <FormControl fullWidth sx={{ mt: 3, bgcolor: 'white', borderRadius: 2 }}>
                    <InputLabel id="amenidad-label">¿Qué amenidades buscas?</InputLabel>
                    <Select
                      labelId="amenidad-label"
                      id="amenidad-select"
                      multiple
                      value={amenidades}
                      onChange={handleAmenidadChange}
                      input={<OutlinedInput label="¿Qué amenidades buscas?" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                    >
                      <MenuItem value="amueblado">Amueblado</MenuItem>
                      <MenuItem value="baño privado">Baño privado</MenuItem>
                      <MenuItem value="pet friendly">Pet friendly</MenuItem>
                      <MenuItem value="estacionamiento">Estacionamiento</MenuItem>
                      <MenuItem value="piscina">Piscina</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Panel de tarjetas de departamentos en renta */}
        <Box sx={{ mt: { xs: 4, sm: 6, md: 8 } }}>
          <Typography 
            variant="h4" 
            sx={{ 
              mb: 4, 
              textAlign: 'center',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
              fontWeight: 700
            }}
          >
            Habitaciones disponibles
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3 }} justifyContent="center">
            {listings.map((listing, index) => (
              <Grid item xs={12} sm={6} md={4} key={`${listing.id}-${index}`}>
                <Card sx={{ 
                  borderRadius: 4, 
                  boxShadow: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    p: { xs: 1.5, sm: 2 }, 
                    pb: 0,
                    flexWrap: 'wrap',
                    gap: 1
                  }}>
                    <Avatar 
                      src={listing.user.avatar} 
                      alt={listing.user.name} 
                      sx={{ mr: 1, width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }} 
                    />
                    <Typography 
                      fontWeight={700}
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                    >
                      {listing.user.name}
                    </Typography>
                    <Chip 
                      label={listing.date} 
                      color="success" 
                      size="small" 
                      sx={{ 
                        mx: 1, 
                        fontWeight: 700,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }} 
                    />
                    <Chip 
                      label={`${listing.roommates} ROOMMATE`} 
                      color="primary" 
                      size="small" 
                      sx={{ 
                        fontWeight: 700,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }} 
                    />
                  </Box>
                  <CardMedia
                    component="img"
                    height="160"
                    image={listing.image}
                    alt={listing.location}
                    sx={{ 
                      objectFit: 'cover', 
                      borderRadius: 2, 
                      m: { xs: 1.5, sm: 2 }, 
                      mb: 0 
                    }}
                  />
                  <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 } }}>
                    <Typography 
                      variant="h6" 
                      fontWeight={800} 
                      gutterBottom
                      sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                    >
                      ${listing.price.toLocaleString()} 
                      <Typography 
                        component="span" 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                      >
                        / mo
                      </Typography>
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    >
                      {listing.type} · {listing.bedrooms} Bedrooms · {listing.propertyType}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    >
                      {listing.available}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mt: 1,
                        fontSize: { xs: '0.8rem', sm: '0.875rem' }
                      }}
                    >
                      {listing.location}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
      
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 4, sm: 6 }, mt: { xs: 4, sm: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
              textAlign: 'center',
              mb: { xs: 3, sm: 4 }
            }}
          >
            ¿Por qué elegir RoomFi?
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 4 }}>
            <Grid item xs={12} md={4}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  mb: 1
                }}
              >
                Seguro y confiable
              </Typography>
              <Typography 
                variant="body1"
                sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                Verificamos perfiles y anuncios para tu tranquilidad.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  mb: 1
                }}
              >
                Fácil de usar
              </Typography>
              <Typography 
                variant="body1"
                sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                Publica o busca habitaciones en minutos, sin complicaciones.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  mb: 1
                }}
              >
                Comunidad activa
              </Typography>
              <Typography 
                variant="body1"
                sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                Miles de usuarios encuentran roomies cada mes.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
      
      <Box sx={{ bgcolor: '#222', color: 'white', py: 3, textAlign: 'center' }}>
        <Typography 
          variant="body2"
          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          &copy; {new Date().getFullYear()} RoomFi. Todos los derechos reservados.
        </Typography>
      </Box>

      <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleNotificationClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleNotificationClose} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default App; 