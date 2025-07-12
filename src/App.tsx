import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Typography, Button, Container, Box, Paper, Card, CardContent,
  CardMedia, Avatar, Chip, Stack, Grid, useTheme, useMediaQuery, IconButton,
  Menu, MenuItem, Modal, Snackbar, Alert, Drawer, List, ListItem, ListItemButton,
  ListItemText, TextField, Slider, FormControl, InputLabel, Select, OutlinedInput,
  createTheme, ThemeProvider, Fab
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import ListIcon from '@mui/icons-material/ViewList';
import PoolIcon from '@mui/icons-material/Pool';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import PetsIcon from '@mui/icons-material/Pets';
import FemaleIcon from '@mui/icons-material/Female';
import MaleIcon from '@mui/icons-material/Male';
import ApartmentIcon from '@mui/icons-material/Apartment';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import GroupIcon from '@mui/icons-material/Group';
import BedIcon from '@mui/icons-material/Bed';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleLogin } from '@react-oauth/google';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import CreatePoolPage from './CreatePoolPage';
import RegisterPage from './RegisterPage';
import Header from './Header';
import {
  TENANT_PASSPORT_ABI,
  TENANT_PASSPORT_ADDRESS,
  PROPERTY_INTEREST_POOL_ADDRESS,
  PROPERTY_INTEREST_POOL_ABI,
  NETWORK_CONFIG,
  MXNBT_ADDRESS,
  MXNB_ABI,
  INTEREST_GENERATOR_ADDRESS,
  INTEREST_GENERATOR_ABI,
} from './web3/config';
import Portal from '@portal-hq/web';
import { renderAmenityIcon, getDaysAgo } from './utils/icons';
import { useUser, UserProvider } from './UserContext';
import DashboardPage from './DashboardPage';


declare global {
  interface Window {
    ethereum?: any;
  }
}

interface TenantPassportData {
  reputation: number;
  paymentsMade: number;
  paymentsMissed: number;
  outstandingBalance: number;
  propertiesOwned: number;
  tokenId: BigInt;
  mintingWalletAddress?: string;
}

const customTheme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#81c784',
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

const portal = new Portal({
  apiKey: process.env.REACT_APP_PORTAL_API_KEY,
  rpcConfig: {
    [NETWORK_CONFIG.chainId.toString()]: NETWORK_CONFIG.rpcUrl,
  },
  chainId: NETWORK_CONFIG.chainId.toString(),
});

function App() {
  const isMobileOnly = useMediaQuery(customTheme.breakpoints.down('sm'));
  const location = useLocation();
  const [matches, setMatches] = useState<any[] | null>(null);

  // Estados de UI
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [drawerCardsOpen, setDrawerCardsOpen] = useState(false);
  const [drawerMenuOpen, setDrawerMenuOpen] = useState(false);
  const [precio, setPrecio] = React.useState([1000, 80000]);
  const [amenidades, setAmenidades] = React.useState<string[]>([]);

  // Estados de Web3
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [tenantPassportData, setTenantPassportData] = useState<TenantPassportData | null>(null);
  const [showTenantPassportModal, setShowTenantPassportModal] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenDecimals, setTokenDecimals] = useState<number>(18); // Default to 18, will be updated

  // --- NUEVOS ESTADOS PARA LA BÓVEDA ---
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultBalance, setVaultBalance] = useState<number>(0);
  const [interestEarned, setInterestEarned] = useState<number>(0);
  const [vaultAmount, setVaultAmount] = useState('');
  const [allowance, setAllowance] = useState<number>(0);
  // --- FIN DE NUEVOS ESTADOS ---

  // Estados del Mapa
  const mapCenter = { lat: 19.4326, lng: -99.1333 };
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
  });
  const [selectedListing, setSelectedListing] = useState<any>(null);

  // Estados para el popup de interés
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [selectedInterestListing, setSelectedInterestListing] = useState<any>(null);
  // Estado para el popup de SPEI
  const [showSpeiModal, setShowSpeiModal] = useState(false);

  // Handlers UI
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handlePrecioChange = (event: Event, newValue: number | number[]) => setPrecio(newValue as number[]);
  const handleAmenidadChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setAmenidades(typeof value === 'string' ? value.split(',') : value);
  };

  const [showMyPropertiesModal, setShowMyPropertiesModal] = useState(false);
  const [myProperties, setMyProperties] = useState<any[]>([]);
  const [landlordFundAmount, setLandlordFundAmount] = useState(''); // --- NUEVO ---

  // Handlers Web3
  const handleOnboardingOpen = () => setShowOnboarding(true);
  const handleOnboardingClose = () => setShowOnboarding(false);
  const handleFundingModalOpen = () => setShowFundingModal(true);
  const handleFundingModalClose = () => {
    setShowFundingModal(false);
    setDepositAmount('');
  };
  const handleNotificationClose = () => setNotification({ ...notification, open: false });

  // --- LÓGICA DE LA BÓVEDA (CORREGIDA CON DECIMALES DINÁMICOS) ---
  const handleVaultModalOpen = () => setShowVaultModal(true);
  const handleVaultModalClose = () => {
    setShowVaultModal(false);
    setVaultAmount('');
    setAllowance(0); // Resetear al cerrar
  };

  const checkAllowance = useCallback(async () => {
    if (!account || !provider || !vaultAmount) return;
    try {
      const tokenContract = new ethers.Contract(MXNBT_ADDRESS, MXNB_ABI, provider);
      const currentAllowance = await tokenContract.allowance(account, INTEREST_GENERATOR_ADDRESS);
      setAllowance(Number(ethers.formatUnits(currentAllowance, tokenDecimals)));
    } catch (error) {
      console.error("Error checking allowance:", error);
    }
  }, [account, provider, vaultAmount, tokenDecimals]);

  const fetchVaultData = useCallback(async () => {
    if (!account || !provider) return;
    try {
      const interestContract = new ethers.Contract(INTEREST_GENERATOR_ADDRESS, INTEREST_GENERATOR_ABI, provider);
      const [rawBalance, rawInterest] = await Promise.all([
        interestContract.balanceOf(account),
        interestContract.calculateInterest(account)
      ]);
      setVaultBalance(Number(ethers.formatUnits(rawBalance, tokenDecimals)));
      setInterestEarned(Number(ethers.formatUnits(rawInterest, tokenDecimals)));
    } catch (error) {
      console.error("Error fetching vault data:", error);
    }
  }, [account, provider, tokenDecimals]);

  const handleApprove = async () => {
    if (!account || !provider || !vaultAmount) return;
    if (!(await checkNetwork(provider))) return;

    try {
      const signer = await provider.getSigner();
      const amountToApprove = ethers.parseUnits(vaultAmount, tokenDecimals);
      const tokenContract = new ethers.Contract(MXNBT_ADDRESS, MXNB_ABI, signer);
      
      setNotification({ open: true, message: 'Enviando transacción de aprobación...', severity: 'info' });
      const tx = await tokenContract.approve(INTEREST_GENERATOR_ADDRESS, amountToApprove);
      await tx.wait();
      
      setNotification({ open: true, message: '¡Aprobación exitosa!', severity: 'success' });
      await checkAllowance();
    } catch (error) {
      console.error("Error approving:", error);
      setNotification({ open: true, message: 'Error al aprobar la transacción.', severity: 'error' });
    }
  };

  const handleDeposit = async () => {
    if (!account || !provider || !vaultAmount) return;
    if (!(await checkNetwork(provider))) return;

    try {
      const signer = await provider.getSigner();
      const amountToDeposit = ethers.parseUnits(vaultAmount, tokenDecimals);
      const interestContract = new ethers.Contract(INTEREST_GENERATOR_ADDRESS, INTEREST_GENERATOR_ABI, signer);

      setNotification({ open: true, message: 'Enviando transacción de depósito...', severity: 'info' });
      const tx = await interestContract.deposit(amountToDeposit);
      await tx.wait();

      setNotification({ open: true, message: '¡Depósito realizado con éxito!', severity: 'success' });
      await fetchVaultData();
      await fetchTokenBalance(provider, account);
      handleVaultModalClose();
    } catch (error) {
      console.error("Error depositing to vault:", error);
      setNotification({ open: true, message: 'Error al realizar el depósito.', severity: 'error' });
    }
  };

  const handleWithdrawFromVault = async () => {
    if (!account || !provider || !vaultAmount) return;
    if (!(await checkNetwork(provider))) return;

    try {
      const signer = await provider.getSigner();
      const amount = ethers.parseUnits(vaultAmount, tokenDecimals);
      
      const interestContract = new ethers.Contract(INTEREST_GENERATOR_ADDRESS, INTEREST_GENERATOR_ABI, signer);
      setNotification({ open: true, message: 'Retirando fondos...', severity: 'info' });
      const withdrawTx = await interestContract.withdraw(amount);
      await withdrawTx.wait();

      setNotification({ open: true, message: '¡Retiro realizado con éxito!', severity: 'success' });
      await fetchVaultData();
      await fetchTokenBalance(provider, account);
      handleVaultModalClose();

    } catch (error) {
      console.error("Error withdrawing from vault:", error);
      setNotification({ open: true, message: 'Error al realizar el retiro.', severity: 'error' });
    }
  };
  // --- FIN DE LÓGICA DE BÓVEDA ---

  // --- NUEVA LÓGICA PARA GESTIÓN DE FONDOS DEL POOL ---
  const handleApproveLandlordFunds = async (propertyId: number) => {
    if (!account || !provider || !landlordFundAmount) return;
    if (!(await checkNetwork(provider))) return;

    try {
      const signer = await provider.getSigner();
      const amountToApprove = ethers.parseUnits(landlordFundAmount, tokenDecimals);
      const tokenContract = new ethers.Contract(MXNBT_ADDRESS, MXNB_ABI, signer);
      
      setNotification({ open: true, message: 'Aprobando fondos...', severity: 'info' });
      const tx = await tokenContract.approve(PROPERTY_INTEREST_POOL_ADDRESS, amountToApprove);
      await tx.wait();
      
      setNotification({ open: true, message: '¡Aprobación exitosa! Ahora puedes añadir los fondos.', severity: 'success' });
      // Aquí podríamos forzar una re-renderización o simplemente confiar en que el usuario hará clic en "Añadir Fondos"
    } catch (error) {
      console.error("Error approving landlord funds:", error);
      setNotification({ open: true, message: 'Error al aprobar los fondos.', severity: 'error' });
    }
  };

  const handleAddLandlordFunds = async (propertyId: number) => {
    if (!account || !provider || !landlordFundAmount) return;
    if (!(await checkNetwork(provider))) return;

    try {
      const signer = await provider.getSigner();
      const amountToAdd = ethers.parseUnits(landlordFundAmount, tokenDecimals);
      const poolContract = new ethers.Contract(PROPERTY_INTEREST_POOL_ADDRESS, PROPERTY_INTEREST_POOL_ABI, signer);

      setNotification({ open: true, message: 'Añadiendo fondos al pool...', severity: 'info' });
      const tx = await poolContract.addLandlordFunds(propertyId, amountToAdd);
      await tx.wait();

      setNotification({ open: true, message: '¡Fondos añadidos exitosamente!', severity: 'success' });
      await handleViewMyProperties(); // Recargar datos de propiedades
      setLandlordFundAmount('');
    } catch (error) {
      console.error("Error adding landlord funds:", error);
      setNotification({ open: true, message: 'Error al añadir los fondos.', severity: 'error' });
    }
  };

  const handleDepositPoolToVault = async (propertyId: number) => {
    if (!account || !provider) return;
    if (!(await checkNetwork(provider))) return;

    try {
      const signer = await provider.getSigner();
      const poolContract = new ethers.Contract(PROPERTY_INTEREST_POOL_ADDRESS, PROPERTY_INTEREST_POOL_ABI, signer);

      setNotification({ open: true, message: 'Moviendo fondos del pool a la bóveda...', severity: 'info' });
      const tx = await poolContract.depositToVault(propertyId);
      await tx.wait();

      setNotification({ open: true, message: '¡Fondos movidos a la bóveda exitosamente!', severity: 'success' });
      await handleViewMyProperties();
    } catch (error) {
      console.error("Error depositing pool funds to vault:", error);
      setNotification({ open: true, message: 'Error al mover los fondos a la bóveda.', severity: 'error' });
    }
  };

  const handleWithdrawPoolFromVault = async (propertyId: number, amount: string) => {
    if (!account || !provider) return;
    if (!(await checkNetwork(provider))) return;

    try {
      const signer = await provider.getSigner();
      const amountToWithdraw = ethers.parseUnits(amount, tokenDecimals);
      const poolContract = new ethers.Contract(PROPERTY_INTEREST_POOL_ADDRESS, PROPERTY_INTEREST_POOL_ABI, signer);

      setNotification({ open: true, message: 'Retirando fondos de la bóveda al pool...', severity: 'info' });
      const tx = await poolContract.withdrawFromVault(propertyId, amountToWithdraw);
      await tx.wait();

      setNotification({ open: true, message: '¡Fondos retirados exitosamente!', severity: 'success' });
      await handleViewMyProperties();
    } catch (error) {
      console.error("Error withdrawing pool funds from vault:", error);
      setNotification({ open: true, message: 'Error al retirar los fondos de la bóveda.', severity: 'error' });
    }
  };
  // --- FIN DE NUEVA LÓGICA ---

  const checkNetwork = async (prov: ethers.BrowserProvider): Promise<boolean> => {
    const network = await prov.getNetwork();
    if (network.chainId !== BigInt(NETWORK_CONFIG.chainId)) {
      setNotification({
        open: true,
        message: `Por favor, cambia tu wallet a la red ${NETWORK_CONFIG.chainName}.`,
        severity: 'warning',
      });
      return false;
    }
    return true;
  };

  const connectWithMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      setNotification({ open: true, message: 'MetaMask no está instalado.', severity: 'warning' });
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAccount = accounts[0];
      
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      
      if (await checkNetwork(browserProvider)) {
        setProvider(browserProvider);
        setAccount(userAccount);
        setNotification({ open: true, message: 'Wallet conectada exitosamente.', severity: 'success' });
      } else {
        setAccount(null);
        setProvider(null);
      }
      
      handleOnboardingClose();

    } catch (error) {
      console.error("Error connecting with MetaMask:", error);
      setNotification({ open: true, message: 'Error al conectar con MetaMask.', severity: 'error' });
    }
  };

  const fetchTokenBalance = useCallback(async (prov: ethers.Provider, acc: string) => {
    try {
        const contract = new ethers.Contract(MXNBT_ADDRESS, MXNB_ABI, prov);
        
        const [rawBalance, decimals] = await Promise.all([
            contract.balanceOf(acc),
            contract.decimals()
        ]);

        console.log("--- [DIAGNÓSTICO DE BALANCE] ---");
        console.log("Billetera (Account):", acc);
        console.log("Contrato del Token (Address):", MXNBT_ADDRESS);
        console.log("Decimales del Contrato:", decimals.toString());
        console.log("Balance Crudo (Raw):", rawBalance.toString());
        console.log("---------------------------------");
        
        const numDecimals = Number(decimals);
        setTokenDecimals(numDecimals);
        setTokenBalance(Number(ethers.formatUnits(rawBalance, numDecimals)));
    } catch (error) {
        console.error("Error fetching token balance:", error);
        setNotification({ open: true, message: 'Error al obtener el balance del token.', severity: 'error' });
    }
  }, []);

  const handleViewMyProperties = async () => {
    if (!account || !provider) {
      setNotification({ open: true, message: 'Por favor, conecta tu wallet primero.', severity: 'error' });
      return;
    }
    if (!(await checkNetwork(provider))) return;

    try {
      // --- DEBUGGING STEP ---
      const network = await provider.getNetwork();
      const contractAddress = PROPERTY_INTEREST_POOL_ADDRESS;
      console.log(`[DEBUG] Intentando llamar a 'propertyCounter' en:`);
      console.log(`[DEBUG] Contrato: ${contractAddress}`);
      console.log(`[DEBUG] Chain ID: ${network.chainId}`);
      const code = await provider.getCode(contractAddress);
      console.log(`[DEBUG] Bytecode en la dirección: ${code.substring(0, 40)}...`);
      if (code === '0x') {
        setNotification({ open: true, message: '[DEBUG] ¡Error Crítico! No se encontró código de contrato en la dirección proporcionada. Verifica que el contrato esté desplegado y la dirección sea correcta.', severity: 'error' });
        return;
      }
      // --- END DEBUGGING ---

      const contract = new ethers.Contract(PROPERTY_INTEREST_POOL_ADDRESS, PROPERTY_INTEREST_POOL_ABI, provider);
      const count = await contract.propertyCounter();
      const properties = [];
      for (let i = 1; i <= count; i++) {
        const p = await contract.getPropertyInfo(i);
        if (p[0].toLowerCase() === account.toLowerCase()) {
          properties.push({
            id: i,
            landlord: p[0],
            totalRentAmount: p[1],
            seriousnessDeposit: p[2],
            requiredTenantCount: p[3],
            amountPooledForRent: p[4],
            amountInVault: p[5], // --- NUEVO ---
            interestedTenants: p[6],
            state: p[7],
            paymentDayStart: p[8],
            paymentDayEnd: p[9],
          });
        }
      }
      setMyProperties(properties);
      setShowMyPropertiesModal(true);
    } catch (error: any) {
      console.error("Error fetching properties:", error);
      const errorMessage = error.code === 'BAD_DATA' 
        ? 'No se pudo leer la información del contrato. ¿Estás en la red correcta?' 
        : 'Error al obtener tus propiedades.';
      setNotification({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const getOrCreateTenantPassport = useCallback(async (userAddress: string) => {
    if (!provider) {
        setNotification({ open: true, message: 'Provider no inicializado. Conecta tu wallet.', severity: 'error' });
        return null;
    }
    if (!(await checkNetwork(provider))) return null;

    try {
      const readOnlyContract = new ethers.Contract(TENANT_PASSPORT_ADDRESS, TENANT_PASSPORT_ABI, provider);
      const balance = await readOnlyContract.balanceOf(userAddress);
      let finalTokenId: BigInt;

      if (balance.toString() === '0') {
        console.log("No Tenant Passport found. Minting a new one...");
        const signer = await provider.getSigner();
        const contractWithSigner = new ethers.Contract(TENANT_PASSPORT_ADDRESS, TENANT_PASSPORT_ABI, signer);
        const tx = await contractWithSigner.mintForSelf();
        await tx.wait();
        setNotification({ open: true, message: '¡Tu Tenant Passport se ha creado!', severity: 'success' });
        const newBalance = await readOnlyContract.balanceOf(userAddress);
        finalTokenId = await readOnlyContract.tokenOfOwnerByIndex(userAddress, newBalance - 1);
      } else {
        finalTokenId = await readOnlyContract.tokenOfOwnerByIndex(userAddress, 0);
      }

      const info = await readOnlyContract.getTenantInfo(finalTokenId);
      const passportData = {
        reputation: Number(info.reputation),
        paymentsMade: Number(info.paymentsMade),
        paymentsMissed: Number(info.paymentsMissed),
        outstandingBalance: Number(info.outstandingBalance),
        propertiesOwned: Number(info.propertiesOwned),
        tokenId: finalTokenId,
        mintingWalletAddress: userAddress,
      };

      setTenantPassportData(passportData);
      return passportData;
    } catch (error) {
      console.error("Error getting or creating Tenant Passport:", error);
      setNotification({ open: true, message: 'Error al gestionar el Tenant Passport.', severity: 'error' });
      return null;
    }
  }, [provider]);

  const handleViewNFTClick = async () => {
    if (account) {
      await getOrCreateTenantPassport(account);
      setShowTenantPassportModal(true);
    } else {
      setNotification({ open: true, message: 'Por favor, conecta tu wallet primero.', severity: 'error' });
    }
  };
  
  const mintNewTenantPassport = async () => {
      if (!account || !provider) {
          setNotification({ open: true, message: 'Por favor, conecta tu wallet primero para mintear.', severity: 'error' });
          return;
      }
      if (!(await checkNetwork(provider))) return;

      try {
          const signer = await provider.getSigner();
          const contract = new ethers.Contract(TENANT_PASSPORT_ADDRESS, TENANT_PASSPORT_ABI, signer);
          const tx = await contract.mintForSelf();
          await tx.wait();
          setNotification({ open: true, message: '¡Tu Tenant Passport se ha minteado exitosamente!', severity: 'success' });
          await getOrCreateTenantPassport(account);
      } catch (error) {
          console.error("Error minting new Tenant Passport:", error);
          setNotification({ open: true, message: 'Error al mintear un nuevo Tenant Passport.', severity: 'error' });
      }
  };

  const handleCreatePoolClick = async () => {
    if (!account || !provider) {
      setNotification({ open: true, message: 'Por favor, conecta tu wallet primero.', severity: 'warning' });
      return;
    }
    
    // Verificar si el usuario tiene un Tenant Passport
    const passportContract = new ethers.Contract(TENANT_PASSPORT_ADDRESS, TENANT_PASSPORT_ABI, provider);
    const balance = await passportContract.balanceOf(account);

    if (balance.toString() === '0') {
      setNotification({ 
        open: true, 
        message: 'Necesitas un Tenant Passport para crear un pool. Obtenlo en la sección "Ver mi NFT".', 
        severity: 'info' 
      });
    } else {
      navigate('/create-pool');
    }
  };

  const { updateUser, user } = useUser();
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: async tokenResponse => {
      if (tokenResponse.access_token) {
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });
          const profile = await res.json();
          setIsCreatingWallet(true);
          
          const ethAddress = await portal.createWallet();
          setAccount(ethAddress);
          updateUser({ wallet: ethAddress });

          setIsCreatingWallet(false);
          handleOnboardingClose();

          const fullName = profile.name || (profile.given_name ? (profile.given_name + (profile.family_name ? ' ' + profile.family_name : '')) : '');
          navigate('/register', {
            state: {
              email: profile.email,
              name: fullName,
              picture: profile.picture,
              walletAddress: ethAddress
            }
          });
        } catch (error) {
          setIsCreatingWallet(false);
          setNotification({ open: true, message: 'Error al procesar el login de Google', severity: 'error' });
        }
      }
    },
    onError: () => {
      setNotification({ open: true, message: 'Error al iniciar sesión con Google', severity: 'error' });
    },
    flow: 'implicit',
    scope: 'openid email profile',
  });

  useEffect(() => {
    if (location.state?.matches && location.state.matches.length > 0) {
      setMatches(location.state.matches);
    } else {
      const user_id = '7c74d216-7c65-47e6-b02d-1e6954f39ba7';
      fetch(process.env.REACT_APP_API + "/matchmaking/match/top?user_id=" + user_id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.property_matches)) {
            const baseLat = 19.4326;
            const baseLng = -99.1333;
            const randomNearby = (base: number, delta: number) => base + (Math.random() - 0.5) * delta;
            const matchesWithCoords = data.property_matches.map((match: any) => ({
              ...match,
              lat: randomNearby(baseLat, 0.025),
              lng: randomNearby(baseLng, 0.025),
            }));
            setMatches(matchesWithCoords);
          } else {
            setMatches([]);
          }
        })
        .catch(() => setMatches(null));
    }
  }, [location.state]);

  useEffect(() => {
    if (provider && account) {
      fetchTokenBalance(provider, account);
      const intervalId = setInterval(() => fetchTokenBalance(provider, account), 10000);
      return () => clearInterval(intervalId);
    }
  }, [provider, account, fetchTokenBalance]);

  // Listener for account and network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
          setProvider(null);
        }
      };

      const handleChainChanged = () => {
        // Reload the app to re-initialize the provider and check the network
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // --- USE EFFECT PARA LA BÓVEDA ---
  useEffect(() => {
    if (showVaultModal && account && provider) {
      fetchVaultData(); // Carga inicial de datos de la bóveda
      checkAllowance(); // Carga inicial del allowance

      const intervalId = setInterval(fetchVaultData, 5000);
      return () => clearInterval(intervalId);
    }
  }, [showVaultModal, account, provider, fetchVaultData, checkAllowance]);

  // Comprobar el allowance cada vez que el monto a depositar cambia
  useEffect(() => {
    if (showVaultModal) {
      checkAllowance();
    }
  }, [vaultAmount, showVaultModal, checkAllowance]);
  // --- FIN DE USE EFFECT ---

  return (
    <>
      <Header
        account={account}
        tokenBalance={tokenBalance}
        onFundingModalOpen={handleFundingModalOpen}
        onConnectGoogle={login}
        onConnectMetaMask={connectWithMetaMask}
        onViewNFTClick={handleViewNFTClick}
        onMintNFTClick={mintNewTenantPassport}
        onViewMyPropertiesClick={handleViewMyProperties}
        onSavingsClick={handleVaultModalOpen}
        tenantPassportData={tenantPassportData}
        isCreatingWallet={isCreatingWallet}
        setShowOnboarding={setShowOnboarding}
        showOnboarding={showOnboarding}
      />
      <Routes>
        <Route path="/" element={
          <>
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
                      Buscar Roomies
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
                      onClick={() => navigate('/dashboard')}
                    >
                      Publicar propiedades
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
                                { value: 1000, label: <span style={{ fontWeight: 500, color: '#1976d2', fontSize: '0.85rem' }}>$1,000</span> },
                                { value: 80000, label: <span style={{ fontWeight: 500, color: '#1976d2', fontSize: '0.85rem' }}>$80,000</span> }
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
                      options={{ disableDefaultUI: true, gestureHandling: 'greedy', styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }, { featureType: 'transit', stylers: [{ visibility: 'off' }] }] }}
                      onClick={() => setSelectedListing(null)}
                    >
                      {(matches ?? []).map((listing: any) => (
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
                      {selectedListing && (selectedListing as any).lat && (selectedListing as any).lng && (
                        <InfoWindow
                          position={{ lat: (selectedListing as any).lat, lng: (selectedListing as any).lng }}
                          onCloseClick={() => setSelectedListing(null)}
                        >
                          <Box sx={{ minWidth: 220, maxWidth: 260 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Avatar src={(selectedListing as any).user?.avatar} alt={(selectedListing as any).user?.name} sx={{ mr: 1 }} />
                              <Typography fontWeight={700}>John</Typography>
                              <Chip label={getDaysAgo(selectedListing.created_at)} color="success" size="small" sx={{ mx: 1, fontWeight: 700 }} />
                              <Chip label={`1 ROOMIE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                              <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d" alt={(selectedListing as any).location} style={{ width: '100%', borderRadius: 8, maxHeight: 100, objectFit: 'cover' }} />
                            </Box>
                            <Typography variant="h6" fontWeight={800} gutterBottom>
                              ${(selectedListing as any).price?.toLocaleString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{selectedListing.address}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                              {selectedListing.amenities.slice(0, 4).map((amenity: any, idx: any) => (
                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {renderAmenityIcon(amenity)}
                                </Box>
                              ))}
                            </Box>
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
                        {(matches ?? []).map((listing: any, index: number) => (
                          <Card key={`${listing.id}-${index}`} sx={{ borderRadius: 4, boxShadow: 'none', border: '1px solid #e0e0e0', mb: 2, cursor: 'pointer', '&:hover': { boxShadow: 4, borderColor: 'primary.main' } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 0 }}>
                              <Avatar src={listing.user?.avatar} alt={listing.user?.name} sx={{ mr: 1 }} />
                              <Typography fontWeight={700}>Sara</Typography>
                              <Chip label={getDaysAgo(listing.created_at)} color="success" size="small" sx={{ mx: 1, fontWeight: 700 }} />
                              <Chip label={`1 ROOMIE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                            </Box>
                            <CardMedia component="img" height="120" image="https://images.unsplash.com/photo-1571896349842-33c89424de2d" alt={listing.location} sx={{ objectFit: 'cover', borderRadius: 2, m: 2, mb: 0 }} />
                            <CardContent sx={{ p: 2 }}>
                              <Typography variant="h6" fontWeight={800} gutterBottom>${listing.price.toLocaleString()} <Typography component="span" variant="body2" color="text.secondary">/ mo</Typography></Typography>
                              <Typography variant="body2" color="text.secondary">{listing.available}</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{listing.address}</Typography>
                              {listing.amenities && listing.amenities.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                  {listing.amenities.slice(0, 4).map((amenity: any, idx: any) => (
                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      {renderAmenityIcon(amenity)}
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
                    {(matches ?? []).map((listing: any, index: number) => (
                      <Card key={`${listing.id}-${index}`} sx={{ borderRadius: 4, boxShadow: 'none', border: '1px solid #e0e0e0', mb: 2, cursor: 'pointer', '&:hover': { boxShadow: 4, borderColor: 'primary.main' } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 0 }}>
                          <Avatar src={listing.user?.avatar || ''} alt={listing.user?.name || ''} sx={{ mr: 1 }} />
                          <Typography fontWeight={700}>John</Typography>
                          <Box sx={{ flexGrow: 1 }} />
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip label={getDaysAgo(listing.created_at)} color="success" size="small" sx={{ mx: 1, fontWeight: 700 }} />
                            <Chip label={`1 ROOMIE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                          </Box>
                        </Box>
                        <CardMedia component="img" height="120" image="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80" alt={listing.address} sx={{ objectFit: 'cover', borderRadius: 2, m: 2, mb: 0 }} />
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="h6" fontWeight={800} gutterBottom>${listing.price.toLocaleString()}</Typography>
                          <Typography variant="body2" color="text.secondary">{listing.available}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{listing.address}</Typography>
                          {listing.amenities && listing.amenities.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {listing.amenities.slice(0, 4).map((amenity: any, idx: any) => (
                                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {renderAmenityIcon(amenity)}
                                  </Box>
                                ))}
                              </Box>
                              <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                sx={{ width: { xs: '100%', sm: 'auto' }, fontSize: { xs: '0.75rem', sm: '1rem' }, py: 1.1, px: 2.5 }}
                                onClick={() => { setSelectedInterestListing(listing); setShowInterestModal(true); }}
                              >
                                ¡Me interesa!
                              </Button>
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

            <Modal open={showMyPropertiesModal} onClose={() => setShowMyPropertiesModal(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Paper sx={{ p: 4, borderRadius: 4, maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 700 }}>
                  Panel de Mis Propiedades
                </Typography>
                {myProperties.length > 0 ? (
                  <Stack spacing={3}>
                    {myProperties.map(prop => {
                      const amountInVault = parseFloat(ethers.formatUnits(prop.amountInVault, tokenDecimals));
                      const amountInPool = parseFloat(ethers.formatUnits(prop.amountPooledForRent, tokenDecimals));
                      const isInVault = amountInVault > 0;

                      return (
                        <Paper key={prop.id} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight="600">
                              Propiedad ID: {prop.id.toString()}
                            </Typography>
                            <Chip 
                              label={isInVault ? "En Bóveda" : (prop.state === 0 ? 'Abierto' : prop.state === 1 ? 'Fondeando' : prop.state === 2 ? 'Rentado' : 'Cancelado')}
                              color={isInVault ? "success" : "primary"}
                              variant="filled"
                            />
                          </Stack>
                          
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={6}>
                              <Typography variant="body1">
                                <Typography component="span" fontWeight="bold">Fondos en Pool:</Typography> {amountInPool.toFixed(4)} MXNBT
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body1">
                                <Typography component="span" fontWeight="bold">Fondos en B��veda:</Typography> {amountInVault.toFixed(4)} MXNBT
                              </Typography>
                            </Grid>
                            <Grid item xs={12}>
                               <Typography variant="body1" color="secondary.main">
                                <Typography component="span" fontWeight="bold" color="text.primary">Intereses Ganados:</Typography> {/* Placeholder, la lógica real es más compleja */}
                                + 0.0000 MXNBT
                              </Typography>
                            </Grid>
                          </Grid>

                          <Stack spacing={2}>
                            {/* Sección para mover fondos a la bóveda */}
                            <Button 
                              variant="contained" 
                              onClick={() => handleDepositPoolToVault(prop.id)}
                              disabled={amountInPool <= 0}
                            >
                              Mover Fondos del Pool a la Bóveda
                            </Button>
                            
                            {/* Sección para retirar fondos de la bóveda */}
                            {isInVault && (
                              <Button 
                                variant="outlined" 
                                color="secondary"
                                onClick={() => handleWithdrawPoolFromVault(prop.id, prop.amountInVault.toString())}
                              >
                                Retirar Todo de la Bóveda
                              </Button>
                            )}

                            {/* Sección para añadir fondos del landlord */}
                            <Box sx={{ pt: 2, borderTop: '1px solid #e0e0e0' }}>
                               <Typography variant="body2" sx={{mb: 1}}>¿Deseas añadir tus propios fondos a este pool?</Typography>
                               <Stack direction="row" spacing={1}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  type="number"
                                  label="Monto a añadir"
                                  variant="outlined"
                                  onChange={(e) => setLandlordFundAmount(e.target.value)}
                                />
                                <Button onClick={() => handleApproveLandlordFunds(prop.id)}>Aprobar</Button>
                                <Button onClick={() => handleAddLandlordFunds(prop.id)}>Añadir</Button>
                              </Stack>
                            </Box>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="body1">No has creado ninguna propiedad aún.</Typography>
                )}
                <Button variant="contained" fullWidth onClick={() => setShowMyPropertiesModal(false)} sx={{ mt: 3 }}>Cerrar</Button>
              </Paper>
            </Modal>

            <Modal open={showTenantPassportModal} onClose={() => setShowTenantPassportModal(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Paper sx={{ p: 4, borderRadius: 2, maxWidth: 400, width: '100%' }}>
                <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Tu Tenant Passport</Typography>
                {tenantPassportData ? (
                  <Stack spacing={1}>
                    <Typography variant="body1">
                      <Typography component="span" fontWeight="bold">Reputación:</Typography> {tenantPassportData.reputation}%
                    </Typography>
                    <Typography variant="body1">
                      <Typography component="span" fontWeight="bold">Pagos a tiempo:</Typography> {tenantPassportData.paymentsMade}
                    </Typography>
                    <Typography variant="body1">
                      <Typography component="span" fontWeight="bold">Pagos no realizados:</Typography> {tenantPassportData.paymentsMissed}
                    </Typography>
                    <Typography variant="body1">
                      <Typography component="span" fontWeight="bold">Propiedades Poseídas:</Typography> {tenantPassportData.propertiesOwned}
                    </Typography>
                    <Typography variant="body1">
                      <Typography component="span" fontWeight="bold">Saldo pendiente:</Typography> ${tenantPassportData.outstandingBalance.toLocaleString()} MXNB
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Token ID: {tenantPassportData.tokenId.toString()}
                    </Typography>
                    {tenantPassportData.mintingWalletAddress && (
                      <Typography variant="body2" color="text.secondary">
                        Wallet: {tenantPassportData.mintingWalletAddress.substring(0, 6)}...{tenantPassportData.mintingWalletAddress.substring(tenantPassportData.mintingWalletAddress.length - 4)}
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="body1">No se encontró un Tenant Passport para tu wallet.</Typography>
                )}
                <Button variant="contained" fullWidth onClick={() => setShowTenantPassportModal(false)} sx={{ mt: 3 }}>Cerrar</Button>
              </Paper>
            </Modal>

            <Modal open={showInterestModal} onClose={() => setShowInterestModal(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Paper sx={{ p: 4, borderRadius: 2, maxWidth: 400, width: '100%' }}>
                <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Reservar propiedad</Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Necesita depositar el 5% del valor de la renta mensual como anticipo para reservar.
                </Typography>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button variant="outlined" onClick={() => setShowInterestModal(false)}>Cancelar</Button>
                  <Button variant="contained" color="primary" onClick={() => { setShowInterestModal(false); setShowSpeiModal(true); }}>De acuerdo</Button>
                </Stack>
              </Paper>
            </Modal>

            <Modal open={showSpeiModal} onClose={() => setShowSpeiModal(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Paper sx={{ p: 4, borderRadius: 2, maxWidth: 400, width: '100%' }}>
                <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Datos para transferencia SPEI</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Para reservar la propiedad, realiza una transferencia SPEI con los siguientes datos. Una vez realizado el pago, guarda tu comprobante y notifícalo en la plataforma.
                </Typography>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="body2"><b>Banco:</b> Nvio</Typography>
                  <Typography variant="body2"><b>Cuenta CLABE:</b> {user?.clabe || "Registrate primero"}</Typography>
                  <Typography variant="body2"><b>Beneficiario:</b> RoomFi</Typography>
                  <Typography variant="body2"><b>Monto sugerido:</b> $ {selectedInterestListing ? (selectedInterestListing.price * 0.05).toLocaleString() : '--'} MXN</Typography>
                  <Typography variant="body2"><b>Referencia:</b> {selectedInterestListing ? `RESERVA-${selectedInterestListing.id}` : '--'} </Typography>
                </Stack>
                <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                  * El depósito es un anticipo para reservar la propiedad. Si tienes dudas, contacta a soporte RoomFi.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setShowSpeiModal(false);
                    if (!user?.clabe) {
                      handleOnboardingOpen();
                    }
                  }}
                  sx={{ mt: 2 }}
                >
                  {user?.clabe ? 'Cerrar' : 'Registrar'}
                </Button>
              </Paper>
            </Modal>
          </>
        } />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/create-pool" element={<CreatePoolPage account={account} tokenDecimals={tokenDecimals} />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>

      {/* --- MODAL DE LA BÓVEDA (CORREGIDO) --- */}
      <Modal open={showVaultModal} onClose={handleVaultModalClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper sx={{ p: 4, borderRadius: 4, maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 700 }}>
            Mi Bóveda de Ahorros
          </Typography>
          
          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
            <Typography variant="h6" color="text.secondary">Saldo en Bóveda</Typography>
            <Typography variant="h4" fontWeight="bold" color="primary.main" sx={{ mb: 1 }}>
              {vaultBalance.toFixed(4)} MXNBT
            </Typography>
            <Typography variant="body1" color="secondary.main" sx={{ fontWeight: 600 }}>
              + {interestEarned.toFixed(6)} Intereses Ganados
            </Typography>
          </Paper>

          <Typography variant="body2" sx={{ mb: 2 }}>
            Tu balance disponible: {tokenBalance.toFixed(4)} MXNBT
          </Typography>

          <TextField
            fullWidth
            type="number"
            label="Monto a depositar / retirar"
            variant="outlined"
            value={vaultAmount}
            onChange={(e) => setVaultAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Stack direction="row" spacing={2} justifyContent="center">
            {allowance < parseFloat(vaultAmount || '0') ? (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleApprove}
                disabled={!vaultAmount || parseFloat(vaultAmount) <= 0}
              >
                Aprobar
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleDeposit}
                disabled={!vaultAmount || parseFloat(vaultAmount) <= 0}
              >
                Depositar
              </Button>
            )}
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={handleWithdrawFromVault}
              disabled={!vaultAmount || parseFloat(vaultAmount) <= 0}
            >
              Retirar
            </Button>
          </Stack>
        </Paper>
      </Modal>
      {/* --- FIN DE MODAL --- */}
    </>
  );
}

// Componente wrapper para proveer el tema
const AppWrapper = () => (
  <ThemeProvider theme={customTheme}>
    <UserProvider>
      <App />
    </UserProvider>
  </ThemeProvider>
);

export default AppWrapper;