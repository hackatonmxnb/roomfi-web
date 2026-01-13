import React,{ useState,useEffect,useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Typography,Button,Container,Box,Paper,Card,CardContent,
  CardMedia,Avatar,Chip,Stack,Grid,useMediaQuery,
  MenuItem,Modal,Snackbar,Alert,Drawer,
  TextField,Slider,FormControl,InputLabel,Select,OutlinedInput,
  createTheme,ThemeProvider,Fab
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
import { GoogleMap,useJsApiLoader,Marker,InfoWindow } from '@react-google-maps/api';
import { useGoogleLogin } from '@react-oauth/google';
import { Routes,Route,useNavigate,useLocation } from 'react-router-dom';
import CreatePoolPage from './CreatePoolPage';
import LandingPage from './LandingPage';
import RegisterPage from './RegisterPage';
import Header from './Header';
import {
  TENANT_PASSPORT_ABI,
  TENANT_PASSPORT_ADDRESS,
  PROPERTY_REGISTRY_ADDRESS,
  PROPERTY_REGISTRY_ABI,
  NETWORK_CONFIG,
  USDT_ADDRESS,
  USDT_ABI,
  ROOM_FI_VAULT_ADDRESS,
  ROOM_FI_VAULT_ABI,
} from './web3/config';
import Portal from '@portal-hq/web';
import { renderAmenityIcon,getDaysAgo } from './utils/icons';
import { useUser,UserProvider } from './UserContext';
import DashboardPage from './DashboardPage';
import RentalAgreementsPage from './RentalAgreementsPage';
import BadgesDisplay from './components/BadgesDisplay';
import MyPropertiesPage from './MyPropertiesPage';
import CreatePropertyPage from './CreatePropertyPage';


declare global {
  interface Window {
    ethereum?: any;
  }
}

interface TenantPassportData {
  // V2 TenantPassport fields
  reputation: number;
  paymentsMade: number;
  paymentsMissed: number;
  propertiesRented: number;
  propertiesOwned: number;
  consecutiveOnTimePayments: number;
  totalMonthsRented: number;
  referralCount: number;
  disputesCount: number;
  outstandingBalance: number;
  totalRentPaid: number;
  lastActivityTime: number;
  lastPaymentTime: number;
  isVerified: boolean;
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

function App() {
  const { updateUser,user } = useUser();
  const navigate = useNavigate();

  // Initialize portal instance
  const portal = new Portal({
    apiKey: process.env.REACT_APP_PORTAL_API_KEY,
    rpcConfig: {
      [NETWORK_CONFIG.chainId.toString()]: NETWORK_CONFIG.rpcUrl,
    },
    chainId: NETWORK_CONFIG.chainId.toString(),
  });

  const createPortalWallet = async () => {
    return new Promise<string>(async resolve => {
      portal.onReady(async () => {
        const walletExists = await portal.doesWalletExist();
        if (!walletExists) {
          await portal.createWallet();
        }
        const ethAddress = await portal.getEip155Address();
        updateUser({ wallet: ethAddress });
        resolve(ethAddress);
      });
    });
  };

  const isMobileOnly = useMediaQuery(customTheme.breakpoints.down('sm'));
  const location = useLocation();
  const [matches,setMatches] = useState<any[] | null>(null);

  // Estados de UI
  const [anchorEl,setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [drawerCardsOpen,setDrawerCardsOpen] = useState(false);
  const [drawerMenuOpen,setDrawerMenuOpen] = useState(false);
  const [precio,setPrecio] = React.useState([1000,80000]);
  const [amenidades,setAmenidades] = React.useState<string[]>([]);

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
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  // --- NUEVOS ESTADOS PARA LA BÓVEDA ---
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultBalance, setVaultBalance] = useState<number>(0);
  const [interestEarned, setInterestEarned] = useState<number>(0);
  const [vaultAmount, setVaultAmount] = useState('');
  const [allowance, setAllowance] = useState<number>(0);
  // --- FIN DE NUEVOS ESTADOS ---

  // Estados del Mapa
  const mapCenter = { lat: 19.4326,lng: -99.1333 };
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
  });
  const [selectedListing,setSelectedListing] = useState<any>(null);

  // Estados para el popup de interés
  const [showInterestModal,setShowInterestModal] = useState(false);
  const [selectedInterestListing,setSelectedInterestListing] = useState<any>(null);
  // Estado para el popup de SPEI
  const [showSpeiModal,setShowSpeiModal] = useState(false);

  // Handlers UI
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handlePrecioChange = (event: Event,newValue: number | number[]) => setPrecio(newValue as number[]);
  const handleAmenidadChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setAmenidades(typeof value === 'string' ? value.split(',') : value);
  };

  const [showMyPropertiesModal,setShowMyPropertiesModal] = useState(false);
  const [myProperties,setMyProperties] = useState<any[]>([]);
  const [landlordFundAmount,setLandlordFundAmount] = useState(''); // --- NUEVO ---

  // Handlers Web3
  const handleOnboardingOpen = () => setShowOnboarding(true);
  const handleOnboardingClose = () => setShowOnboarding(false);
  const handleFundingModalOpen = () => setShowFundingModal(true);
  const handleFundingModalClose = () => {
    setShowFundingModal(false);
    setDepositAmount('');
  };
  const handleNotificationClose = () => setNotification({ ...notification,open: false });

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
      const tokenContract = new ethers.Contract(USDT_ADDRESS,USDT_ABI,provider);
      const currentAllowance = await tokenContract.allowance(account,ROOM_FI_VAULT_ADDRESS);
      setAllowance(Number(ethers.formatUnits(currentAllowance,6))); // USDT has 6 decimals
    } catch (error) {
      console.error("Error checking allowance:",error);
    }
  },[account,provider,vaultAmount]);

  const fetchVaultData = useCallback(async () => {
    if (!account || !provider) return;
    try {
      const vaultContract = new ethers.Contract(ROOM_FI_VAULT_ADDRESS, ROOM_FI_VAULT_ABI, provider);
      // V2: RoomFiVault uses different method names - adjust based on actual ABI
      const rawBalance = await vaultContract.balanceOf(account);
      setVaultBalance(Number(ethers.formatUnits(rawBalance, 6))); // USDT has 6 decimals
      // TODO: Add yield calculation when method is confirmed in ABI
      setInterestEarned(0);
    } catch (error) {
      console.error("Error fetching vault data:",error);
    }
  },[account,provider]);

  const handleApprove = async () => {
    if (!account || !provider || !vaultAmount) return;
    if (!(await checkNetwork(provider))) return;

    try {
      const signer = await provider.getSigner();
      const amountToApprove = ethers.parseUnits(vaultAmount,6); // USDT has 6 decimals
      const tokenContract = new ethers.Contract(USDT_ADDRESS,USDT_ABI,signer);

      setNotification({ open: true,message: 'Enviando transacción de aprobación...',severity: 'info' });
      const tx = await tokenContract.approve(ROOM_FI_VAULT_ADDRESS,amountToApprove);
      await tx.wait();

      setNotification({ open: true,message: '¡Aprobación exitosa!',severity: 'success' });
      await checkAllowance();
    } catch (error) {
      console.error("Error approving:",error);
      setNotification({ open: true,message: 'Error al aprobar la transacción.',severity: 'error' });
    }
  };

  const handleDeposit = async () => {
    if (!account || !provider || !vaultAmount) return;
    if (!(await checkNetwork(provider))) return;

    try {
      const signer = await provider.getSigner();
      const amountToDeposit = ethers.parseUnits(vaultAmount,6); // USDT has 6 decimals
      const vaultContract = new ethers.Contract(ROOM_FI_VAULT_ADDRESS,ROOM_FI_VAULT_ABI,signer);

      setNotification({ open: true,message: 'Enviando transacción de depósito...',severity: 'info' });
      const tx = await vaultContract.deposit(account,amountToDeposit);
      await tx.wait(2); // Esperar 2 confirmaciones para asegurar la propagación del estado

      setNotification({ open: true,message: '¡Depósito realizado con éxito!',severity: 'success' });
      await fetchVaultData();
      await fetchTokenBalance(provider,account);
      handleVaultModalClose();
    } catch (error) {
      console.error("Error depositing to vault:",error);
      setNotification({ open: true,message: 'Error al realizar el depósito.',severity: 'error' });
    }
  };

  const handleWithdrawFromVault = async () => {
    if (!account || !provider || !vaultAmount) return;
    if (!(await checkNetwork(provider))) return;

    try {
      const signer = await provider.getSigner();
      const amount = ethers.parseUnits(vaultAmount,6); // USDT has 6 decimals

      const vaultContract = new ethers.Contract(ROOM_FI_VAULT_ADDRESS,ROOM_FI_VAULT_ABI,signer);
      setNotification({ open: true,message: 'Retirando fondos...',severity: 'info' });
      const withdrawTx = await vaultContract.withdraw(account,amount);
      await withdrawTx.wait();

      setNotification({ open: true,message: '¡Retiro realizado con éxito!',severity: 'success' });
      await fetchVaultData();
      await fetchTokenBalance(provider,account);
      handleVaultModalClose();

    } catch (error) {
      console.error("Error withdrawing from vault:",error);
      setNotification({ open: true,message: 'Error al realizar el retiro.',severity: 'error' });
    }
  };
  // --- FIN DE LÓGICA DE BÓVEDA ---

  // --- LÓGICA DE POOL V1 DESHABILITADA - TODO: Refactorizar para V2 con RentalAgreementNFT ---
  // Estas funciones usaban PropertyInterestPool que ya no existe en V2
  // En V2, los fondos se manejan a través de RentalAgreementNFT y RoomFiVault
  const handleApproveLandlordFunds = async (_propertyId: number) => {
    setNotification({ open: true,message: 'Esta función será implementada con los nuevos contratos V2.',severity: 'info' });
  };

  const handleAddLandlordFunds = async (_propertyId: number) => {
    setNotification({ open: true,message: 'Esta función será implementada con los nuevos contratos V2.',severity: 'info' });
  };

  const handleDepositPoolToVault = async (_propertyId: number) => {
    setNotification({ open: true,message: 'Esta función será implementada con los nuevos contratos V2.',severity: 'info' });
  };

  const handleWithdrawPoolFromVault = async (_propertyId: number,_amount: string) => {
    setNotification({ open: true,message: 'Esta función será implementada con los nuevos contratos V2.',severity: 'info' });
  };

  const handleCancelPool = async (_propertyId: number) => {
    setNotification({ open: true,message: 'Esta función será implementada con los nuevos contratos V2.',severity: 'info' });
  };
  // --- FIN DE LÓGICA DE POOL ---

  const checkNetwork = async (prov: ethers.BrowserProvider): Promise<boolean> => {
    const network = await prov.getNetwork();
    if (network.chainId !== BigInt(NETWORK_CONFIG.chainId)) {
      // Try to switch to Mantle Sepolia
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
        });
        return true;
      } catch (switchError: any) {
        // Chain not added, try to add it
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
                chainName: NETWORK_CONFIG.chainName,
                nativeCurrency: NETWORK_CONFIG.nativeCurrency,
                rpcUrls: [NETWORK_CONFIG.rpcUrl],
                blockExplorerUrls: [NETWORK_CONFIG.blockExplorerUrl],
              }],
            });
            return true;
          } catch (addError) {
            console.error("Error adding network:", addError);
            setNotification({
              open: true,
              message: `Error al agregar la red ${NETWORK_CONFIG.chainName}.`,
              severity: 'error',
            });
            return false;
          }
        }
        console.error("Error switching network:", switchError);
        setNotification({
          open: true,
          message: `Por favor, cambia manualmente a la red ${NETWORK_CONFIG.chainName}.`,
          severity: 'warning',
        });
        return false;
      }
    }
    return true;
  };

  const connectWithMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      setNotification({ open: true,message: 'MetaMask no está instalado.',severity: 'warning' });
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAccount = accounts[0];

      const browserProvider = new ethers.BrowserProvider(window.ethereum);

      if (await checkNetwork(browserProvider)) {
        setProvider(browserProvider);
        setAccount(userAccount);
        setNotification({ open: true,message: 'Wallet conectada exitosamente.',severity: 'success' });
      } else {
        setAccount(null);
        setProvider(null);
      }

      handleOnboardingClose();

    } catch (error) {
      console.error("Error connecting with MetaMask:",error);
      setNotification({ open: true,message: 'Error al conectar con MetaMask.',severity: 'error' });
    }
  };

  const fetchTokenBalance = useCallback(async (prov: ethers.Provider,acc: string) => {
    try {
      const contract = new ethers.Contract(USDT_ADDRESS,USDT_ABI,prov);

      const rawBalance = await contract.balanceOf(acc);
      const decimals = 6; // USDT always has 6 decimals

      console.log("--- [DIAGNÓSTICO DE BALANCE USDT] ---");
      console.log("Billetera (Account):",acc);
      console.log("Contrato del Token (Address):",USDT_ADDRESS);
      console.log("Decimales:",decimals);
      console.log("Balance Crudo (Raw):",rawBalance.toString());
      console.log("---------------------------------");

      setTokenDecimals(decimals);
      setTokenBalance(Number(ethers.formatUnits(rawBalance,decimals)));
    } catch (error) {
      console.error("Error fetching token balance:",error);
      setNotification({ open: true,message: 'Error al obtener el balance del token.',severity: 'error' });
    }
  },[]);

  const handleViewMyProperties = async () => {
    if (!account || !provider) {
      setNotification({ open: true,message: 'Por favor, conecta tu wallet primero.',severity: 'error' });
      return;
    }
    if (!(await checkNetwork(provider))) return;

    try {
      // V2: Usar PropertyRegistry en lugar de PropertyInterestPool
      const network = await provider.getNetwork();
      const contractAddress = PROPERTY_REGISTRY_ADDRESS;
      console.log(`[DEBUG] Intentando llamar a PropertyRegistry en:`);
      console.log(`[DEBUG] Contrato: ${contractAddress}`);
      console.log(`[DEBUG] Chain ID: ${network.chainId}`);
      const code = await provider.getCode(contractAddress);
      console.log(`[DEBUG] Bytecode en la dirección: ${code.substring(0,40)}...`);
      if (code === '0x') {
        setNotification({ open: true,message: '[DEBUG] ¡Error Crítico! No se encontró código de contrato en la dirección proporcionada. Verifica que el contrato esté desplegado y la dirección sea correcta.',severity: 'error' });
        return;
      }

      const contract = new ethers.Contract(PROPERTY_REGISTRY_ADDRESS,PROPERTY_REGISTRY_ABI,provider);
      // V2: Usar getLandlordProperties o iterar sobre propiedades
      // TODO: Verificar método exacto en el ABI de PropertyRegistry
      const propertyCount = await contract.propertyCounter();

      const properties = [];
      for (let i = 1; i <= Number(propertyCount); i++) {
        try {
          const p = await contract.getProperty(i);
          // Solo mostrar propiedades del landlord actual
          if (p.landlord && p.landlord.toLowerCase() === account.toLowerCase()) {
            properties.push({
              id: i,
              name: p.name || `Propiedad ${i}`,
              description: p.location || '',
              landlord: p.landlord,
              propertyType: Number(p.propertyType),
              bedroomCount: Number(p.bedroomCount),
              bathroomCount: Number(p.bathroomCount),
              squareMeters: Number(p.squareMeters),
              isVerified: p.isVerified,
              isActive: p.isActive,
            });
          }
        } catch (e) {
          console.log(`Property ${i} not found or error:`,e);
        }
      }

      setMyProperties(properties);
      setShowMyPropertiesModal(true);
    } catch (error: any) {
      console.error("Error fetching properties:",error);
      const errorMessage = error.code === 'BAD_DATA'
        ? 'No se pudo leer la información del contrato. ¿Estás en la red correcta?'
        : 'Error al obtener tus propiedades.';
      setNotification({ open: true,message: errorMessage,severity: 'error' });
    }
  };

  const getOrCreateTenantPassport = useCallback(async (userAddress: string) => {
    if (!provider) {
      setNotification({ open: true,message: 'Provider no inicializado. Conecta tu wallet.',severity: 'error' });
      return null;
    }
    if (!(await checkNetwork(provider))) return null;

    try {
      const readOnlyContract = new ethers.Contract(TENANT_PASSPORT_ADDRESS,TENANT_PASSPORT_ABI,provider);
      const balance = await readOnlyContract.balanceOf(userAddress);
      let finalTokenId: BigInt;

      if (balance.toString() === '0') {
        console.log("No Tenant Passport found. Minting a new one...");
        const signer = await provider.getSigner();
        const contractWithSigner = new ethers.Contract(TENANT_PASSPORT_ADDRESS,TENANT_PASSPORT_ABI,signer);
        const tx = await contractWithSigner.mintForSelf();
        await tx.wait();
        setNotification({ open: true,message: '¡Tu Tenant Passport se ha creado!',severity: 'success' });
        const newBalance = await readOnlyContract.balanceOf(userAddress);
        finalTokenId = await readOnlyContract.tokenOfOwnerByIndex(userAddress,newBalance - 1);
      } else {
        finalTokenId = await readOnlyContract.tokenOfOwnerByIndex(userAddress,0);
      }

      const info = await readOnlyContract.getTenantInfo(finalTokenId);
      // V2: TenantInfo struct has more fields
      const passportData: TenantPassportData = {
        reputation: Number(info.reputation),
        paymentsMade: Number(info.paymentsMade),
        paymentsMissed: Number(info.paymentsMissed),
        propertiesRented: Number(info.propertiesRented),
        propertiesOwned: Number(info.propertiesOwned),
        consecutiveOnTimePayments: Number(info.consecutiveOnTimePayments),
        totalMonthsRented: Number(info.totalMonthsRented),
        referralCount: Number(info.referralCount),
        disputesCount: Number(info.disputesCount),
        outstandingBalance: Number(ethers.formatUnits(info.outstandingBalance,6)), // USDT decimals
        totalRentPaid: Number(ethers.formatUnits(info.totalRentPaid,6)), // USDT decimals
        lastActivityTime: Number(info.lastActivityTime),
        lastPaymentTime: Number(info.lastPaymentTime),
        isVerified: info.isVerified,
        tokenId: finalTokenId,
        mintingWalletAddress: userAddress,
      };

      setTenantPassportData(passportData);

      // Fetch badges
      try {
        const badgesList = await readOnlyContract.getAllBadges(finalTokenId);
        setTenantBadges([...badgesList]);
      } catch (badgeError) {
        console.error("Error fetching badges:", badgeError);
        setTenantBadges(new Array(14).fill(false));
      }

      return passportData;
    } catch (error) {
      console.error("Error getting or creating Tenant Passport:",error);
      setNotification({ open: true,message: 'Error al gestionar el Tenant Passport.',severity: 'error' });
      return null;
    }
  },[provider]);

  const handleViewNFTClick = async () => {
    if (account) {
      await getOrCreateTenantPassport(account);
      setShowTenantPassportModal(true);
    } else {
      setNotification({ open: true,message: 'Por favor, conecta tu wallet primero.',severity: 'error' });
    }
  };

  const mintNewTenantPassport = async () => {
    if (!account || !provider) {
      setNotification({ open: true,message: 'Por favor, conecta tu wallet primero para mintear.',severity: 'error' });
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
      setNotification({ open: true,message: 'Por favor, conecta tu wallet primero.',severity: 'warning' });
      return;
    }

    // Verificar si el usuario tiene un Tenant Passport
    const passportContract = new ethers.Contract(TENANT_PASSPORT_ADDRESS,TENANT_PASSPORT_ABI,provider);
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

  const login = useGoogleLogin({
    onSuccess: async tokenResponse => {
      if (tokenResponse.access_token) {
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });
          const profile = await res.json();
          setIsCreatingWallet(true);

          const ethAddress = await createPortalWallet();
          setAccount(ethAddress);
          updateUser({ wallet: ethAddress });

          setIsCreatingWallet(false);
          handleOnboardingClose();

          const fullName = profile.name || (profile.given_name ? (profile.given_name + (profile.family_name ? ' ' + profile.family_name : '')) : '');
          navigate('/register',{
            state: {
              email: profile.email,
              name: fullName,
              picture: profile.picture,
              walletAddress: ethAddress
            }
          });
        } catch (error) {
          setIsCreatingWallet(false);
          setNotification({ open: true,message: 'Error al procesar el login de Google',severity: 'error' });
        }
      }
    },
    onError: () => {
      setNotification({ open: true,message: 'Error al iniciar sesión con Google',severity: 'error' });
    },
    flow: 'implicit',
    scope: 'openid email profile',
  });

  useEffect(() => {
    if (location.state?.matches && location.state.matches.length > 0) {
      setMatches(location.state.matches);
    } else {
      const user_id = '7c74d216-7c65-47e6-b02d-1e6954f39ba7';
      fetch(process.env.REACT_APP_API + "/matchmaking/match/top?user_id=" + user_id,{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.property_matches)) {
            const baseLat = 19.4326;
            const baseLng = -99.1333;
            const randomNearby = (base: number,delta: number) => base + (Math.random() - 0.5) * delta;
            const matchesWithCoords = data.property_matches.map((match: any) => ({
              ...match,
              lat: randomNearby(baseLat,0.025),
              lng: randomNearby(baseLng,0.025),
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

      window.ethereum.on('accountsChanged',handleAccountsChanged);
      window.ethereum.on('chainChanged',handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged',handleAccountsChanged);
        window.ethereum.removeListener('chainChanged',handleChainChanged);
      };
    }
  },[]);

  // --- USE EFFECT PARA LA BÓVEDA ---
  useEffect(() => {
    if (showVaultModal && account && provider) {
      fetchVaultData(); // Carga inicial de datos de la bóveda
      checkAllowance(); // Carga inicial del allowance

      const intervalId = setInterval(fetchVaultData,2000); // Refrescar cada 2 segundos
      return () => clearInterval(intervalId);
    }
  },[showVaultModal,account,provider,fetchVaultData,checkAllowance]);

  // Comprobar el allowance cada vez que el monto a depositar cambia
  useEffect(() => {
    if (showVaultModal) {
      checkAllowance();
    }
  },[vaultAmount,showVaultModal,checkAllowance]);


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
        onHowItWorksClick={() => setShowHowItWorksModal(true)}
        tenantPassportData={tenantPassportData}
        isCreatingWallet={isCreatingWallet}
        setShowOnboarding={setShowOnboarding}
        showOnboarding={showOnboarding}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={
          <>
            <Container maxWidth="xl" sx={{ mt: { xs: 2,sm: 4,md: 8 },px: { xs: 1,sm: 2,md: 3 } }}>
              <Grid container spacing={{ xs: 2,sm: 4 }} alignItems="center">
                <Grid item xs={12} md={5}>
                  <Typography
                    variant="h2"
                    component="h1"
                    gutterBottom
                    sx={{
                      fontWeight: 800,
                      color: 'primary.main',
                      fontSize: { xs: '1.3rem',sm: '1.7rem',md: '2.2rem' },
                      lineHeight: { xs: 1.1,sm: 1.2,md: 1.25 },
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
                      fontSize: { xs: '0.95rem',sm: '1rem',md: '1.1rem' },
                      lineHeight: { xs: 1.3,sm: 1.4,md: 1.5 },
                      mb: 1
                    }}
                  >
                    Somos RoomFi, una plataforma amigable, confiable y tecnológica para encontrar compañeros de cuarto y compartir hogar de forma segura gracias a Web3, ¡sin complicaciones!
                  </Typography>
                  <Box sx={{
                    mt: 2,
                    display: 'flex',
                    flexDirection: { xs: 'column',sm: 'row' },
                    gap: { xs: 1,sm: 1.5 }
                  }}>
                    <Button
                      variant="contained"
                      size="small"
                      color="primary"
                      sx={{
                        width: { xs: '100%',sm: 'auto' },
                        fontSize: { xs: '0.95rem',sm: '1rem' },
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
                        width: { xs: '100%',sm: 'auto' },
                        fontSize: { xs: '0.95rem',sm: '1rem' },
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
                    p: { xs: 1,sm: 2 },
                    bgcolor: '#f5f7fa',
                    textAlign: 'center',
                    borderRadius: 4,
                    minHeight: 0
                  }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex',flexDirection: 'column',gap: 1.5 }}>
                          <TextField
                            fullWidth
                            label="¿En dónde buscas departamento?"
                            variant="outlined"
                            size="small"
                            sx={{ bgcolor: 'white',borderRadius: 2,mb: 1 }}
                          />
                          <Box sx={{ mt: 0.5,px: 2.5 }}>
                            <Typography gutterBottom sx={{ fontWeight: 500,color: 'primary.main',mb: 0.5,fontSize: '0.95rem',textAlign: 'left' }}>
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
                                { value: 1000,label: <span style={{ fontWeight: 500,color: '#1976d2',fontSize: '0.85rem' }}>$1,000</span> },
                                { value: 80000,label: <span style={{ fontWeight: 500,color: '#1976d2',fontSize: '0.85rem' }}>$80,000</span> }
                              ]}
                              sx={{ color: 'primary.main',height: 4,mb: 2,width: '100%' }}
                            />
                          </Box>
                          <FormControl fullWidth sx={{ mt: 1.5,bgcolor: 'white',borderRadius: 2 }} size="small">
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
                                <Box sx={{ display: 'flex',flexWrap: 'wrap',gap: 0.5 }}>
                                  {(selected as string[]).map((value) => (
                                    <Chip key={value} label={value} size="small" />
                                  ))}
                                </Box>
                              )}
                            >
                              <MenuItem value="amueblado"><BedIcon sx={{ color: '#6d4c41',fontSize: 20,mr: 1 }} />Amueblado</MenuItem>
                              <MenuItem value="baño privado"><MeetingRoomIcon sx={{ color: '#43a047',fontSize: 20,mr: 1 }} />Baño privado</MenuItem>
                              <MenuItem value="pet friendly"><PetsIcon sx={{ color: '#ff9800',fontSize: 20,mr: 1 }} />Pet friendly</MenuItem>
                              <MenuItem value="estacionamiento"><LocalParkingIcon sx={{ color: '#1976d2',fontSize: 20,mr: 1 }} />Estacionamiento</MenuItem>
                              <MenuItem value="piscina"><PoolIcon sx={{ color: '#00bcd4',fontSize: 20,mr: 1 }} />Piscina</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex',flexDirection: 'column',gap: 1.5 }}>
                          <FormControl fullWidth sx={{ bgcolor: 'white',borderRadius: 2 }} size="small">
                            <InputLabel id="tipo-propiedad-label" sx={{ fontSize: '0.95rem' }}>Tipo de propiedad</InputLabel>
                            <Select
                              labelId="tipo-propiedad-label"
                              id="tipo-propiedad-select"
                              label="Tipo de propiedad"
                              defaultValue=""
                            >
                              <MenuItem value="departamento"><ApartmentIcon sx={{ color: '#1976d2',fontSize: 20,mr: 1 }} />Departamento completo</MenuItem>
                              <MenuItem value="privada"><MeetingRoomIcon sx={{ color: '#43a047',fontSize: 20,mr: 1 }} />Habitación privada</MenuItem>
                              <MenuItem value="compartida"><GroupIcon sx={{ color: '#fbc02d',fontSize: 20,mr: 1 }} />Habitación compartida</MenuItem>
                            </Select>
                          </FormControl>
                          <FormControl fullWidth sx={{ bgcolor: 'white',borderRadius: 2,mt: { xs: 2,md: 4 } }} size="small">
                            <InputLabel id="genero-label" sx={{ fontSize: '0.95rem' }}>Preferencia de roomie</InputLabel>
                            <Select
                              labelId="genero-label"
                              id="genero-select"
                              label="Preferencia de roomie"
                              defaultValue=""
                            >
                              <MenuItem value="mujeres"><FemaleIcon sx={{ color: '#e91e63',fontSize: 20,mr: 1 }} />Solo mujeres</MenuItem>
                              <MenuItem value="hombres"><MaleIcon sx={{ color: '#1976d2',fontSize: 20,mr: 1 }} />Solo hombres</MenuItem>
                              <MenuItem value="igual"><span style={{ fontSize: 20,marginRight: 8 }}>⚧️</span>Me da igual</MenuItem>
                              <MenuItem value="lgbtq"><span style={{ fontSize: 20,marginRight: 8 }}>🏳️‍🌈</span>LGBTQ+</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ position: 'relative',width: '100%',minHeight: '100vh',mt: { xs: 4,sm: 6,md: 8 } }}>
                <Box sx={{ position: 'absolute',inset: 0,width: '100%',height: '100%',zIndex: 0 }}>
                  {isLoaded && (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%',height: '100%' }}
                      center={mapCenter}
                      zoom={13}
                      options={{ disableDefaultUI: true,gestureHandling: 'greedy',styles: [{ featureType: 'poi',stylers: [{ visibility: 'off' }] },{ featureType: 'transit',stylers: [{ visibility: 'off' }] }] }}
                      onClick={() => setSelectedListing(null)}
                    >
                      {(matches ?? []).map((listing: any) => (
                        listing.lat && listing.lng ? (
                          <Marker
                            key={listing.id}
                            position={{ lat: listing.lat,lng: listing.lng }}
                            onClick={() => setSelectedListing(listing)}
                            icon={{
                              url: "/roomcasa.png",
                              scaledSize: new window.google.maps.Size(40,40)
                            }}
                          />
                        ) : null
                      ))}
                      {selectedListing && (selectedListing as any).lat && (selectedListing as any).lng && (
                        <InfoWindow
                          position={{ lat: (selectedListing as any).lat,lng: (selectedListing as any).lng }}
                          onCloseClick={() => setSelectedListing(null)}
                        >
                          <Box sx={{ minWidth: 220,maxWidth: 260 }}>
                            <Box sx={{ display: 'flex',alignItems: 'center',mb: 1 }}>
                              <Avatar src={(selectedListing as any).user?.avatar} alt={(selectedListing as any).user?.name} sx={{ mr: 1 }} />
                              <Typography fontWeight={700}>John</Typography>
                              <Chip label={getDaysAgo(selectedListing.created_at)} color="success" size="small" sx={{ mx: 1,fontWeight: 700 }} />
                              <Chip label={`1 ROOMIE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                            </Box>
                            <Box sx={{ display: 'flex',justifyContent: 'center',mb: 1 }}>
                              <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d" alt={(selectedListing as any).location} style={{ width: '100%',borderRadius: 8,maxHeight: 100,objectFit: 'cover' }} />
                            </Box>
                            <Typography variant="h6" fontWeight={800} gutterBottom>
                              ${(selectedListing as any).price?.toLocaleString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{selectedListing.address}</Typography>
                            <Box sx={{ display: 'flex',gap: 1,mt: 1,flexWrap: 'wrap' }}>
                              {selectedListing.amenities.slice(0,4).map((amenity: any,idx: any) => (
                                <Box key={idx} sx={{ display: 'flex',alignItems: 'center',gap: 0.5 }}>
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
                    <Fab color="primary" aria-label="Ver lista" onClick={() => setDrawerCardsOpen(true)} sx={{ position: 'absolute',bottom: 24,right: 24,zIndex: 2 }}>
                      <ListIcon />
                    </Fab>
                    <Drawer
                      anchor="bottom"
                      open={drawerCardsOpen}
                      onClose={() => setDrawerCardsOpen(false)}
                      PaperProps={{ sx: { borderTopLeftRadius: 16,borderTopRightRadius: 16,bgcolor: 'white',border: '1px solid #e0e0e0',maxHeight: '70vh',p: 2 } }}
                    >
                      <Box sx={{ overflowY: 'auto',maxHeight: '100vh' }}>
                        {(matches ?? []).map((listing: any,index: number) => (
                          <Card key={`${listing.id}-${index}`} sx={{ borderRadius: 4,boxShadow: 'none',border: '1px solid #e0e0e0',mb: 2,cursor: 'pointer','&:hover': { boxShadow: 4,borderColor: 'primary.main' } }}>
                            <Box sx={{ display: 'flex',alignItems: 'center',p: 2,pb: 0 }}>
                              <Avatar src={listing.user?.avatar} alt={listing.user?.name} sx={{ mr: 1 }} />
                              <Typography fontWeight={700}>Sara</Typography>
                              <Chip label={getDaysAgo(listing.created_at)} color="success" size="small" sx={{ mx: 1,fontWeight: 700 }} />
                              <Chip label={`1 ROOMIE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                            </Box>
                            <CardMedia component="img" height="120" image="https://images.unsplash.com/photo-1571896349842-33c89424de2d" alt={listing.location} sx={{ objectFit: 'cover',borderRadius: 2,m: 2,mb: 0 }} />
                            <CardContent sx={{ p: 2 }}>
                              <Typography variant="h6" fontWeight={800} gutterBottom>${listing.price.toLocaleString()} <Typography component="span" variant="body2" color="text.secondary">/ mo</Typography></Typography>
                              <Typography variant="body2" color="text.secondary">{listing.available}</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{listing.address}</Typography>
                              {listing.amenities && listing.amenities.length > 0 && (
                                <Box sx={{ display: 'flex',gap: 1,mt: 1,flexWrap: 'wrap' }}>
                                  {listing.amenities.slice(0,4).map((amenity: any,idx: any) => (
                                    <Box key={idx} sx={{ display: 'flex',alignItems: 'center',gap: 0.5 }}>
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
                  <Box sx={{ position: 'relative',zIndex: 1,width: { xs: '100%',sm: 400 },maxWidth: 480,height: { xs: 340,sm: 500,md: '100vh' },overflowY: 'auto',bgcolor: 'white',border: '1px solid #e0e0e0',borderRadius: 3,p: 2,ml: { sm: 4 },mt: { xs: 0,sm: 0 } }}>
                    {(matches ?? []).map((listing: any,index: number) => (
                      <Card key={`${listing.id}-${index}`} sx={{ borderRadius: 4,boxShadow: 'none',border: '1px solid #e0e0e0',mb: 2,cursor: 'pointer','&:hover': { boxShadow: 4,borderColor: 'primary.main' } }}>
                        <Box sx={{ display: 'flex',alignItems: 'center',p: 2,pb: 0 }}>
                          <Avatar src={listing.user?.avatar || ''} alt={listing.user?.name || ''} sx={{ mr: 1 }} />
                          <Typography fontWeight={700}>John</Typography>
                          <Box sx={{ flexGrow: 1 }} />
                          <Box sx={{ display: 'flex',alignItems: 'center' }}>
                            <Chip label={getDaysAgo(listing.created_at)} color="success" size="small" sx={{ mx: 1,fontWeight: 700 }} />
                            <Chip label={`1 ROOMIE`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                          </Box>
                        </Box>
                        <CardMedia component="img" height="120" image="https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80" alt={listing.address} sx={{ objectFit: 'cover',borderRadius: 2,m: 2,mb: 0 }} />
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="h6" fontWeight={800} gutterBottom>${listing.price.toLocaleString()}</Typography>
                          <Typography variant="body2" color="text.secondary">{listing.available}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{listing.address}</Typography>
                          {listing.amenities && listing.amenities.length > 0 && (
                            <Box sx={{ display: 'flex',gap: 1,mt: 1,flexWrap: 'wrap',alignItems: 'center',justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex',gap: 1,flexWrap: 'wrap' }}>
                                {listing.amenities.slice(0,4).map((amenity: any,idx: any) => (
                                  <Box key={idx} sx={{ display: 'flex',alignItems: 'center',gap: 0.5 }}>
                                    {renderAmenityIcon(amenity)}
                                  </Box>
                                ))}
                              </Box>
                              <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                sx={{ width: { xs: '100%',sm: 'auto' },fontSize: { xs: '0.75rem',sm: '1rem' },py: 1.1,px: 2.5 }}
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

            <Box sx={{ bgcolor: 'primary.main',color: 'white',py: { xs: 4,sm: 6 },mt: { xs: 4,sm: 6,md: 8 } }}>
              {/* ... Footer ... */}
            </Box>

            <Box sx={{ bgcolor: '#222',color: 'white',py: 3,textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem',sm: '0.875rem' } }}>
                &copy; {new Date().getFullYear()} RoomFi. Todos los derechos reservados.
              </Typography>
            </Box>

            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleNotificationClose} anchorOrigin={{ vertical: 'bottom',horizontal: 'center' }}>
              <Alert onClose={handleNotificationClose} severity={notification.severity} sx={{ width: '100%' }}>
                {notification.message}
              </Alert>
            </Snackbar>

            <Modal open={showMyPropertiesModal} onClose={() => setShowMyPropertiesModal(false)} sx={{ display: 'flex',alignItems: 'center',justifyContent: 'center' }}>
              <Paper sx={{ p: 4,borderRadius: 4,maxWidth: 700,width: '100%',maxHeight: '90vh',overflowY: 'auto' }}>
                <Typography variant="h5" component="h2" sx={{ mb: 3,fontWeight: 700 }}>
                  Panel de Mis Propiedades
                </Typography>
                {myProperties.length > 0 ? (
                  <Stack spacing={3}>
                    {myProperties.map(prop => {
                      const amountInVault = parseFloat(ethers.formatUnits(prop.amountInVault,tokenDecimals));
                      const amountInPool = parseFloat(ethers.formatUnits(prop.amountPooledForRent,tokenDecimals));
                      const isInVault = amountInVault > 0;

                      const statusMap: { [key: number]: { text: string; color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' } } = {
                        0: { text: 'Activo (Abierto)',color: 'primary' },
                        1: { text: 'Activo (Fondeando)',color: 'secondary' },
                        2: { text: 'Rentado',color: 'success' },
                        3: { text: 'Cancelado',color: 'error' }
                      };
                      const currentStatus = statusMap[prop.state] || { text: 'Desconocido',color: 'info' };

                      return (
                        <Paper key={prop.id} variant="outlined" sx={{ p: 3,borderRadius: 3 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight="600">
                              {prop.name || `Propiedad ID: ${prop.id.toString()}`}
                            </Typography>
                            <Chip
                              label={isInVault ? "En Bóveda" : currentStatus.text}
                              color={isInVault ? "success" : currentStatus.color}
                              variant="filled"
                            />
                          </Stack>

                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12}>
                              <Typography variant="body1">
                                <Typography component="span" fontWeight="bold">Interesados:</Typography> {prop.interestedTenants.length} de {prop.requiredTenantCount.toString()}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body1">
                                <Typography component="span" fontWeight="bold">Renta Mensual:</Typography> {ethers.formatUnits(prop.totalRentAmount,tokenDecimals)} MXNBT
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body1">
                                <Typography component="span" fontWeight="bold">Depósito de Seriedad:</Typography> {ethers.formatUnits(prop.seriousnessDeposit,tokenDecimals)} MXNBT
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body1">
                                <Typography component="span" fontWeight="bold">Fondos en Pool:</Typography> {amountInPool.toFixed(4)} MXNBT
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body1">
                                <Typography component="span" fontWeight="bold">Fondos en Bóveda:</Typography> {amountInVault.toFixed(4)} MXNBT
                              </Typography>
                            </Grid>
                          </Grid>

                          <Stack spacing={2}>
                            {/* Botones de acciones principales */}
                            <Button
                              variant="contained"
                              onClick={() => handleDepositPoolToVault(prop.id)}
                              disabled={amountInPool <= 0 || prop.state > 1}
                            >
                              Mover Fondos a Bóveda
                            </Button>

                            {isInVault && (
                              <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => handleWithdrawPoolFromVault(prop.id,prop.amountInVault.toString())}
                              >
                                Retirar de Bóveda
                              </Button>
                            )}

                            {/* Botón para cancelar */}
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => handleCancelPool(prop.id)}
                              disabled={prop.state !== 0 && prop.state !== 1}
                            >
                              Cancelar Pool
                            </Button>

                            {/* Sección para añadir fondos del landlord */}
                            <Box sx={{ pt: 2,borderTop: '1px solid #e0e0e0' }}>
                              <Typography variant="body2" sx={{ mb: 1 }}>¿Deseas añadir tus propios fondos a este pool?</Typography>
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

            <Modal open={showInterestModal} onClose={() => setShowInterestModal(false)} sx={{ display: 'flex',alignItems: 'center',justifyContent: 'center' }}>
              <Paper sx={{ p: 4,borderRadius: 2,maxWidth: 400,width: '100%' }}>
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

            <Modal open={showSpeiModal} onClose={() => setShowSpeiModal(false)} sx={{ display: 'flex',alignItems: 'center',justifyContent: 'center' }}>
              <Paper sx={{ p: 4,borderRadius: 2,maxWidth: 400,width: '100%' }}>
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
        <Route path="/agreements" element={<RentalAgreementsPage account={account} provider={provider} />} />
        <Route path="/my-properties" element={<MyPropertiesPage account={account} provider={provider} />} />
        <Route path="/create-property" element={<CreatePropertyPage account={account} />} />
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
              ${vaultBalance.toFixed(2)} USDT
            </Typography>
            <Typography variant="body1" color="success.main" sx={{ fontWeight: 600 }}>
              + ${interestEarned.toFixed(4)} Yield Generado
            </Typography>
          </Paper>

          {/* Vault Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">TVL Total</Typography>
                <Typography variant="h6" fontWeight={600}>${vaultTotalDeposits.toFixed(0)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Tu Balance USDT</Typography>
                <Typography variant="h6" fontWeight={600}>${tokenBalance.toFixed(2)}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <TextField
            fullWidth
            type="number"
            label="Monto (USDT)"
            variant="outlined"
            value={vaultAmount}
            onChange={(e) => setVaultAmount(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: <Typography variant="body2" color="text.secondary">USDT</Typography>
            }}
          />

          <Stack direction="row" spacing={2} justifyContent="center">
            {allowance < parseFloat(vaultAmount || '0') ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleApprove}
                disabled={!vaultAmount || parseFloat(vaultAmount) <= 0}
              >
                Aprobar USDT
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
              disabled={!vaultAmount || parseFloat(vaultAmount) <= 0 || vaultBalance <= 0}
            >
              Retirar
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Los depósitos generan yield a través de USDY (Ondo Finance)
          </Typography>
        </Paper>
      </Modal>
      {/* --- FIN DE MODAL --- */}

      <Modal open={showHowItWorksModal} onClose={() => setShowHowItWorksModal(false)} sx={{ display: 'flex',alignItems: 'center',justifyContent: 'center' }}>
        <Paper sx={{ p: 4,borderRadius: 4,maxWidth: 800,width: '100%',maxHeight: '90vh',overflowY: 'auto' }}>
          <Typography variant="h4" component="h2" sx={{ mb: 2,fontWeight: 700,textAlign: 'center' }}>
            Cómo Funciona RoomFi: La Revolución DeFi en Bienes Raíces
          </Typography>
          <Typography variant="body1" sx={{ mb: 3,textAlign: 'center',color: 'text.secondary' }}>
            RoomFi es más que una plataforma para encontrar roomies; es un ecosistema financiero descentralizado (DeFi) construido sobre la red Arbitrum, diseñado para resolver los problemas de confianza, liquidez y acceso que sufren tanto arrendadores como inquilinos en el mercado tradicional. Nuestro motor es el <strong>token MXNB</strong>, que impulsa cada transacción y oportunidad de rendimiento dentro de <strong>México</strong>.
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 3,height: '100%' }}>
                <Typography variant="h6" component="h3" sx={{ mb: 2,fontWeight: 600 }}>
                  Para Arrendadores: Liquidez y Rendimiento
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>1. Crea un "Pool de Interés":</strong> En lugar de un simple anuncio, creas un pool de liquidez para tu propiedad con la renta y depósito en tokens MXNB.
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>2. Genera Ingresos Pasivos (DeFi):</strong> ¡Aquí está la magia! Mientras tu pool se llena, puedes depositar los fondos en nuestra <strong>Bóveda de Ahorros</strong>. Esta bóveda es un protocolo de rendimiento (yield protocol) que genera intereses sobre tus MXNB. Tu dinero trabaja para ti desde el día uno.
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>3. Gestión Automatizada:</strong> El contrato inteligente gestiona depósitos, pagos y liberaciones de fondos de forma transparente y segura.
                </Typography>
                <Alert severity="success" sx={{ mt: 2 }}>
                  <strong>Beneficio Clave:</strong> Obtienes liquidez inmediata y acceso a rendimiento DeFi sobre tu propiedad.
                </Alert>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 3,height: '100%' }}>
                <Typography variant="h6" component="h3" sx={{ mb: 2,fontWeight: 600 }}>
                  Para Inquilinos: Tu Reputación es tu Mejor Activo
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>1. Tu Pasaporte de Inquilino (NFT):</strong> Al unirte, recibes un "Tenant Passport", un NFT único que registra tu historial de pagos en la blockchain. Cada pago a tiempo mejora tu reputación on-chain.
                </Typography>
                <Typography variant="body1" paragraph>
                  <strong>2. Pagos Seguros y Transparentes:</strong> Todos los pagos se realizan en MXNB a través del contrato inteligente, eliminando intermediarios y asegurando tu dinero.
                </Typography>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>Beneficio Clave:</strong> Construyes una reputación verificable y portable que te dará acceso a mejores oportunidades de vivienda.
                </Alert>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" component="h3" sx={{ mb: 2,fontWeight: 600,textAlign: 'center' }}>
              Nuestro Ecosistema DeFi con MXNB
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>El Token MXNB:</strong> Es el corazón de RoomFi. Se utiliza para pagar la renta, los depósitos, y es el activo que se deposita en la bóveda para generar rendimiento. Su integración total crea un ciclo económico virtuoso.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>La Bóveda de Ahorros:</strong> Es nuestro principal producto DeFi. Permite a los arrendadores convertirse en proveedores de liquidez, obteniendo un "yield" sobre su capital de renta, un concepto revolucionario en el sector inmobiliario.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Contratos Inteligentes:</strong> Son las reglas incorruptibles del juego. Automatizan los acuerdos, garantizan la custodia de los fondos y ejecutan los pagos sin necesidad de confianza ciega, solo confianza en el código.
            </Typography>
          </Box>

          <Typography variant="h6" component="p" sx={{ mt: 4,fontWeight: 700,textAlign: 'center',color: 'primary.main' }}>
            RoomFi es la simbiosis perfecta entre Real Estate y DeFi, creando un mercado más justo, eficiente y rentable para todos.
          </Typography>
        </Paper>
      </Modal>
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