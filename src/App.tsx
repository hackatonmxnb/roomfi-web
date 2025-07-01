import React from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box, Paper, Card, CardContent, CardMedia, Avatar, Chip, Stack, Grid, useTheme, useMediaQuery, IconButton, Menu, MenuItem } from '@mui/material';
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
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useEffect, useState } from 'react';
import Fab from '@mui/material/Fab';
import ListIcon from '@mui/icons-material/ViewList';

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
  },
];

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileOnly = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [drawerCardsOpen, setDrawerCardsOpen] = useState(false);
  const [drawerMenuOpen, setDrawerMenuOpen] = useState(false);
  const [precio, setPrecio] = React.useState([1000, 80000]);
  const [amenidades, setAmenidades] = React.useState<string[]>([]);
  const mapCenter = { lat: 19.4326, lng: -99.1333 };
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyB4fQPo0OIqzCgW5muQsodw-xOPMCz5oP0', // <-- Reemplaza por tu API Key
  });
  const [selectedListing, setSelectedListing] = useState<typeof listings[0] | null>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
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
                onClick={() => {
                  setDrawerMenuOpen(true);
                  setDrawerCardsOpen(false);
                }}
                sx={{ color: 'primary.main' }}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="left"
                open={drawerMenuOpen}
                onClose={() => setDrawerMenuOpen(false)}
              >
                <Box
                  sx={{ width: 250 }}
                  role="presentation"
                  onClick={() => setDrawerMenuOpen(false)}
                  onKeyDown={() => setDrawerMenuOpen(false)}
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
              <Button color="inherit" sx={{ fontSize: { sm: '0.875rem', md: '1rem' }, color: 'primary.main' }}>
                Iniciar sesión
              </Button>
              <Button 
                color="primary" 
                variant="outlined" 
                sx={{ 
                  ml: 2, 
                  bgcolor: 'white', 
                  color: 'primary.main', 
                  borderColor: 'primary.main',
                  fontSize: { sm: '0.875rem', md: '1rem' },
                  '&:hover': { bgcolor: '#f5f7fa' }
                }}
              >
                Regístrate
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      
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
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ 
              p: { xs: 1, sm: 2 },
              bgcolor: '#f5f7fa',
              textAlign: 'center',
              borderRadius: 4,
              minHeight: 0,
            }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField
                  fullWidth
                  label="¿En dónde buscas departamento?"
                  variant="outlined"
                  size="small"
                  sx={{ bgcolor: 'white', borderRadius: 2, mb: 1 }}
                />
                <TextField
                  fullWidth
                  label="¿Qué precio buscas?"
                  variant="outlined"
                  sx={{ display: 'none' }}
                />
                <Box sx={{ mt: 0.5, px: 0 }}>
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
                  <FormControl fullWidth sx={{ mt: 1.5, bgcolor: 'white', borderRadius: 2 }} size="small">
                    <InputLabel id="amenidad-label" sx={{ fontSize: '0.95rem' }}>¿Qué amenidades buscas?</InputLabel>
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
                            <Chip key={value} label={value} size="small" />
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
        
        {/* Vista tipo Google Maps: mapa de fondo y lista de cards encima */}
        <Box sx={{ position: 'relative', width: '100%', minHeight: '60vh', mt: { xs: 4, sm: 6, md: 8 } }}>
          {/* Google Maps de fondo */}
          <Box sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
          }}>
            {isLoaded && (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={13}
                options={{
                  disableDefaultUI: true,
                  gestureHandling: 'greedy',
                  styles: [
                    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                  ],
                }}
                onClick={() => setSelectedListing(null)}
              >
                {listings.map((listing) => {
                  if (
                    typeof listing.lat === 'number' &&
                    typeof listing.lng === 'number' &&
                    isLoaded &&
                    typeof window !== 'undefined' &&
                    window.google &&
                    window.google.maps &&
                    typeof window.google.maps.Size === 'function'
                  ) {
                    const icon = {
                      url: '/roomcasa.png',
                      scaledSize: new window.google.maps.Size(36, 36)
                    } as any;
                    return (
                      <Marker
                        key={listing.id}
                        position={{ lat: listing.lat, lng: listing.lng }}
                        icon={icon}
                        onClick={() => setSelectedListing(listing)}
                      />
                    );
                  }
                  if (typeof listing.lat === 'number' && typeof listing.lng === 'number') {
                    return (
                      <Marker
                        key={listing.id}
                        position={{ lat: listing.lat, lng: listing.lng }}
                        onClick={() => setSelectedListing(listing)}
                      />
                    );
                  }
                  return null;
                })}
                {selectedListing &&
                  typeof selectedListing.lat === 'number' &&
                  typeof selectedListing.lng === 'number' && (
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
                        <Typography variant="body2" color="text.secondary">
                          {selectedListing.type} · {selectedListing.bedrooms} Bedrooms · {selectedListing.propertyType}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedListing.available}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {selectedListing.location}
                        </Typography>
                      </Box>
                    </InfoWindow>
                )}
              </GoogleMap>
            )}
          </Box>
          {/* Panel de cards encima: Drawer en móvil, fijo en desktop */}
          {isMobileOnly ? (
            <>
              <Fab color="primary" aria-label="Ver lista" onClick={() => { setDrawerCardsOpen(true); setDrawerMenuOpen(false); }} sx={{ position: 'absolute', bottom: 24, right: 24, zIndex: 2 }}>
                <ListIcon />
              </Fab>
              <Drawer
                anchor="bottom"
                open={drawerCardsOpen}
                onClose={() => setDrawerCardsOpen(false)}
                PaperProps={{
                  sx: {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    bgcolor: 'white',
                    border: '1px solid #e0e0e0',
                    maxHeight: '70vh',
                    p: 2,
                  }
                }}
              >
                <Box sx={{ overflowY: 'auto', maxHeight: '60vh' }}>
                  {listings.map((listing, index) => (
                    <Card
                      key={`${listing.id}-${index}`}
                      sx={{
                        borderRadius: 4,
                        boxShadow: 'none',
                        border: '1px solid #e0e0e0',
                        mb: 2,
                        transition: 'box-shadow 0.2s, border-color 0.2s',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 4,
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 0 }}>
                        <Avatar src={listing.user.avatar} alt={listing.user.name} sx={{ mr: 1 }} />
                        <Typography fontWeight={700}>{listing.user.name}</Typography>
                        <Chip label={listing.date} color="success" size="small" sx={{ mx: 1, fontWeight: 700 }} />
                        <Chip label={`${listing.roommates} ROOMMATE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                      </Box>
                      <CardMedia
                        component="img"
                        height="120"
                        image={listing.image}
                        alt={listing.location}
                        sx={{ objectFit: 'cover', borderRadius: 2, m: 2, mb: 0 }}
                      />
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight={800} gutterBottom>
                          ${listing.price.toLocaleString()} <Typography component="span" variant="body2" color="text.secondary">/ mo</Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {listing.type} · {listing.bedrooms} Bedrooms · {listing.propertyType}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {listing.available}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {listing.location}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Drawer>
            </>
          ) : (
            <Box sx={{
              position: 'relative',
              zIndex: 1,
              width: { xs: '100%', sm: 400 },
              maxWidth: 480,
              height: { xs: 340, sm: 500 },
              overflowY: 'auto',
              bgcolor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: 3,
              p: 2,
              ml: { sm: 4 },
              mt: { xs: 0, sm: 0 },
            }}>
              {listings.map((listing, index) => (
                <Card
                  key={`${listing.id}-${index}`}
                  sx={{
                    borderRadius: 4,
                    boxShadow: 'none',
                    border: '1px solid #e0e0e0',
                    mb: 2,
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 4,
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 0 }}>
                    <Avatar src={listing.user.avatar} alt={listing.user.name} sx={{ mr: 1 }} />
                    <Typography fontWeight={700}>{listing.user.name}</Typography>
                    <Chip label={listing.date} color="success" size="small" sx={{ mx: 1, fontWeight: 700 }} />
                    <Chip label={`${listing.roommates} ROOMMATE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                  </Box>
                  <CardMedia
                    component="img"
                    height="120"
                    image={listing.image}
                    alt={listing.location}
                    sx={{ objectFit: 'cover', borderRadius: 2, m: 2, mb: 0 }}
                  />
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={800} gutterBottom>
                      ${listing.price.toLocaleString()} <Typography component="span" variant="body2" color="text.secondary">/ mo</Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {listing.type} · {listing.bedrooms} Bedrooms · {listing.propertyType}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {listing.available}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {listing.location}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
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
    </div>
  );
}

export default App; 