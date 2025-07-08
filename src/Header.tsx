import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Paper, Modal
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Link as RouterLink } from 'react-router-dom';

interface HeaderProps {
  account?: string | null;
  tokenBalance?: number;
  onFundingModalOpen?: () => void;
  onConnectGoogle: () => void;
  onConnectMetaMask: () => void;
  onViewNFTClick: () => void;
  onMintNFTClick: () => void;
  onViewMyPropertiesClick: () => void; // Nueva propiedad
  tenantPassportData: any;
  isCreatingWallet?: boolean;
}

export default function Header({ account, tokenBalance, onFundingModalOpen, onConnectGoogle, onConnectMetaMask, onViewNFTClick, onMintNFTClick, onViewMyPropertiesClick, tenantPassportData, isCreatingWallet }: HeaderProps) {
  const [drawerMenuOpen, setDrawerMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isMobile = window.innerWidth < 900;

  const handleOpenOnboarding = () => setShowOnboarding(true);
  const handleCloseOnboarding = () => setShowOnboarding(false);

  return (
    <>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: 'primary.main', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
            <RouterLink to="/" style={{ display: 'block', textDecoration: 'none' }}>
              <img
                src="/roomfilogo2.png"
                alt="RoomFi Logo"
                style={{ height: '50px', objectFit: 'contain', display: 'block', cursor: 'pointer' }}
              />
            </RouterLink>
          </Box>
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexGrow: 1 }}>
              {/* Botones que solo aparecen si la wallet está conectada */}
              {account && (
                <>
                  <Button component={RouterLink} to="/create-pool" sx={{ color: 'primary.main', fontWeight: 600 }}>Crear Pool</Button>
                  <Button onClick={onViewMyPropertiesClick} sx={{ color: 'primary.main', fontWeight: 600 }}>Mis Propiedades</Button>
                </>
              )}
              {/* Botones que siempre son visibles en desktop */}
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
                      <ListItemButton onClick={handleOpenOnboarding}><ListItemText primary="Conectar" /></ListItemButton>
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
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{tokenBalance?.toFixed(2)} MXNB</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{`${account?.substring(0, 6)}...${account?.substring(account.length - 4)}`}</Typography>
                  </Box>
                  <Button variant="contained" size="small" onClick={onFundingModalOpen}>Añadir Fondos</Button>
                  {account && (
                    <Button variant="outlined" size="small" onClick={onViewNFTClick}>Ver mi NFT</Button>
                  )}
                </Paper>
              ) : (
                <Button
                  color="primary"
                  variant="contained"
                  onClick={handleOpenOnboarding}
                  sx={{ ml: 2, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                >
                  Conectar
                </Button>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>
      <Modal open={showOnboarding} onClose={handleCloseOnboarding}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
          minWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Conecta tu Wallet</Typography>
          <Button variant="contained" fullWidth onClick={() => { onConnectMetaMask(); handleCloseOnboarding(); }}>Conectar con MetaMask</Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google"
                style={{ width: 20, height: 20 }}
              />
            }
            onClick={() => { onConnectGoogle(); handleCloseOnboarding(); }}
            disabled={isCreatingWallet}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {isCreatingWallet ? 'Creando wallet...' : 'Iniciar sesión con Google'}
          </Button>
        </Box>
      </Modal>
    </>
  );
} 