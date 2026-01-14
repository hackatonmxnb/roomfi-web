import React,{ useState,useEffect,useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Box,Typography,Paper,Button,Grid,Chip,Stack,CircularProgress,
  Card,CardContent,CardActions,Alert,Snackbar,Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import ApartmentIcon from '@mui/icons-material/Apartment';
import HouseIcon from '@mui/icons-material/House';
import BedIcon from '@mui/icons-material/Bed';
import BathtubIcon from '@mui/icons-material/Bathtub';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import AddIcon from '@mui/icons-material/Add';
import VerifiedIcon from '@mui/icons-material/Verified';
import {
  PROPERTY_REGISTRY_ADDRESS,
  PROPERTY_REGISTRY_ABI,
  NETWORK_CONFIG,
} from './web3/config';

interface Property {
  id: string;
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

const PROPERTY_TYPES = ['Apartment','House','Studio','Room','Loft','Penthouse'];

export default function MyPropertiesPage({ account,provider }: MyPropertiesPageProps) {
  const [properties,setProperties] = useState<Property[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [notification,setNotification] = useState({ open: false,message: '',severity: 'info' as 'info' | 'success' | 'error' | 'warning' });
  const [verifyingId,setVerifyingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Demo mode: auto-verify property (in production, this would be done by authorized notaries)
  const handleVerifyProperty = async (propertyId: string) => {
    if (!account || !provider) return;
    setVerifyingId(propertyId);

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(PROPERTY_REGISTRY_ADDRESS,PROPERTY_REGISTRY_ABI,signer);

      // Step 1: Request verification
      setNotification({ open: true,message: 'Step 1/2: Requesting verification...',severity: 'info' });
      const tx1 = await contract.requestPropertyVerification(propertyId,'ipfs://demo-verification-docs');
      await tx1.wait();

      // Step 2: Approve verification (normally done by authorized verifier)
      setNotification({ open: true,message: 'Step 2/2: Approving verification...',severity: 'info' });
      const tx2 = await contract.approvePropertyVerification(propertyId);
      await tx2.wait();

      setNotification({ open: true,message: '✅ Property verified successfully!',severity: 'success' });

      // Refresh properties
      await fetchProperties();

    } catch (err: any) {
      console.error('Error verifying property:',err);
      const errorMsg = err.reason || err.message || 'Verification failed';

      // Check if user is not an authorized verifier
      if (errorMsg.includes('Not authorized') || errorMsg.includes('onlyAuthorizedVerifier')) {
        setNotification({
          open: true,
          message: 'You need to be an authorized verifier. Contact the contract owner to get verified.',
          severity: 'error'
        });
      } else {
        setNotification({ open: true,message: errorMsg,severity: 'error' });
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const fetchProperties = useCallback(async () => {
    console.log('[MyProperties] fetchProperties called, account:',account,'provider:',!!provider);
    if (!account || !provider) {
      console.log('[MyProperties] No account or provider, exiting');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const contract = new ethers.Contract(PROPERTY_REGISTRY_ADDRESS,PROPERTY_REGISTRY_ABI,provider);
      console.log('[MyProperties] Contract created, calling getPropertiesByLandlord for:',account);

      // Use the optimized function that returns only landlord's property IDs
      const propertyIds: bigint[] = await contract.getPropertiesByLandlord(account);
      console.log('[MyProperties] Got property IDs:',propertyIds.map(id => id.toString()));

      const props: Property[] = [];
      for (const propertyId of propertyIds) {
        try {
          console.log('[MyProperties] Fetching property:',propertyId.toString());
          const p = await contract.getProperty(propertyId);
          console.log('[MyProperties] Property data:',p);

          // Access nested structs correctly (V2 contract structure)
          const basicInfo = p.basicInfo || p[2];
          const features = p.features || p[3];
          const financialInfo = p.financialInfo || p[4];

          props.push({
            id: propertyId.toString(),
            name: basicInfo?.name || `Property ${propertyId}`,
            propertyType: Number(basicInfo?.propertyType || 0),
            fullAddress: basicInfo?.fullAddress || '',
            city: basicInfo?.city || '',
            bedrooms: Number(features?.bedrooms || 0),
            bathrooms: Number(features?.bathrooms || 0),
            squareMeters: Number(features?.squareMeters || 0),
            monthlyRent: financialInfo?.monthlyRent ? Number(ethers.formatUnits(financialInfo.monthlyRent,6)) : 0,
            securityDeposit: financialInfo?.securityDeposit ? Number(ethers.formatUnits(financialInfo.securityDeposit,6)) : 0,
            isVerified: p.verificationStatus === 2 || p[6] === 2, // VERIFIED = 2
            isActive: p.isActive ?? p[8] ?? false,
            landlord: p.landlord || p[1],
          });
        } catch (e) {
          console.log(`Property ${propertyId} error:`,e);
        }
      }

      console.log('[MyProperties] Final props array:',props);
      setProperties(props);
    } catch (err: any) {
      console.error('Error fetching properties:',err);
      setError('Error loading properties. Check your connection.');
    } finally {
      setLoading(false);
    }
  },[account,provider]);

  useEffect(() => {
    fetchProperties();
  },[fetchProperties]);

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
          Please connect your wallet to view your properties.
        </Alert>
      </Box>
    );
  }

  return (
    <Box maxWidth={1200} mx="auto" mt={4} p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700}>
          My Properties
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/create-property')}
        >
          Register New Property
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : properties.length === 0 ? (
        <Paper sx={{ p: 6,textAlign: 'center',borderRadius: 3 }}>
          <HomeIcon sx={{ fontSize: 64,color: 'text.secondary',mb: 2 }} />
          <Typography variant="h6" color="text.secondary" mb={2}>
            You don't have any registered properties
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Register your first property to start receiving tenants.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/create-property')}
          >
            Register Property
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {properties.map((prop) => (
            <Grid item xs={12} md={6} lg={4} key={prop.id}>
              <Card sx={{ height: '100%',display: 'flex',flexDirection: 'column',borderRadius: 3 }}>
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
                        <Chip label="Verified" color="success" size="small" />
                      )}
                      <Chip
                        label={prop.isActive ? "Active" : "Inactive"}
                        color={prop.isActive ? "primary" : "default"}
                        size="small"
                      />
                    </Stack>
                  </Stack>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {prop.fullAddress || prop.city || 'No address'}
                  </Typography>

                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    {PROPERTY_TYPES[prop.propertyType] || 'Property'}
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

                  <Paper variant="outlined" sx={{ p: 1.5,borderRadius: 2 }}>
                    <Grid container>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Monthly Rent</Typography>
                        <Typography variant="h6" fontWeight={600} color="primary">
                          ${prop.monthlyRent.toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Deposit</Typography>
                        <Typography variant="body1" fontWeight={500}>
                          ${prop.securityDeposit.toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </CardContent>

                <CardActions sx={{ p: 2,pt: 0 }}>
                  <Stack direction="row" spacing={1} width="100%">
                    {!prop.isVerified && (
                      <Tooltip
                        title={
                          <Box sx={{ p: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700}>🧪 Demo Mode Only</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              In production, verification is done by authorized notaries/inspectors who review:
                            </Typography>
                            <ul style={{ margin: '4px 0',paddingLeft: 16 }}>
                              <li>Property deeds (escrituras)</li>
                              <li>Owner ID verification</li>
                              <li>Property inspection</li>
                              <li>NOM-247 compliance (Mexico)</li>
                            </ul>
                            <Typography variant="body2" sx={{ mt: 0.5,fontStyle: 'italic' }}>
                              For this demo, you can self-verify to test the flow.
                            </Typography>
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={() => handleVerifyProperty(prop.id)}
                          disabled={verifyingId === prop.id}
                          startIcon={verifyingId === prop.id ? <CircularProgress size={16} /> : <VerifiedIcon />}
                        >
                          {verifyingId === prop.id ? 'Verifying...' : 'Verify (Demo)'}
                        </Button>
                      </Tooltip>
                    )}
                    <Button
                      size="small"
                      variant={prop.isVerified ? "contained" : "outlined"}
                      onClick={() => navigate(`/agreements?propertyId=${prop.id}`)}
                      disabled={!prop.isVerified}
                      sx={{ flexGrow: 1 }}
                    >
                      {prop.isVerified ? 'Create Contract' : 'Verify First'}
                    </Button>
                  </Stack>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Demo Mode Banner */}
      <Paper sx={{ mt: 3,p: 2,bgcolor: 'warning.light',borderRadius: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" fontWeight={600}>🧪 Demo Mode:</Typography>
          <Typography variant="body2">
            Property verification is simplified for testing. In mainnet, authorized notaries verify properties with legal documents.
          </Typography>
        </Stack>
      </Paper>

      <Box mt={4} p={3} bgcolor="grey.100" borderRadius={3}>
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Network Info
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Network: {NETWORK_CONFIG.chainName} | Contract: {PROPERTY_REGISTRY_ADDRESS.slice(0,10)}...
        </Typography>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification,open: false })}
        anchorOrigin={{ vertical: 'bottom',horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification,open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
