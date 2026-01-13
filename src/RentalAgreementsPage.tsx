import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Box, Typography, Paper, Button, Grid, Card, CardContent,
  Chip, Modal, TextField, Stack, Alert, CircularProgress, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  FACTORY_ADDRESS,
  RENTAL_AGREEMENT_FACTORY_ABI,
  RENTAL_AGREEMENT_NFT_ADDRESS,
  RENTAL_AGREEMENT_NFT_ABI,
  USDT_ADDRESS,
  USDT_ABI,
  PROPERTY_REGISTRY_ADDRESS,
  PROPERTY_REGISTRY_ABI,
} from './web3/config';

interface RentalAgreementsPageProps {
  account: string | null;
  provider: ethers.BrowserProvider | null;
}

interface Agreement {
  id: number;
  propertyId: number;
  landlord: string;
  tenant: string;
  monthlyRent: number;
  securityDeposit: number;
  startDate: number;
  endDate: number;
  duration: number;
  status: number;
  depositAmount: number;
  totalPaid: number;
  paymentsMade: number;
  paymentsMissed: number;
  landlordSigned: boolean;
  tenantSigned: boolean;
}

const STATUS_LABELS: { [key: number]: { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' } } = {
  0: { label: 'Pending', color: 'warning' },
  1: { label: 'Active', color: 'success' },
  2: { label: 'Completed', color: 'info' },
  3: { label: 'Terminated', color: 'error' },
  4: { label: 'In Dispute', color: 'error' },
};

export default function RentalAgreementsPage({ account, provider }: RentalAgreementsPageProps) {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' as 'info' | 'success' | 'error' });
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayRentModal, setShowPayRentModal] = useState(false);
  const [showPayDepositModal, setShowPayDepositModal] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  
  // Form states
  const [createForm, setCreateForm] = useState({
    propertyId: '',
    tenantAddress: '',
    monthlyRent: '',
    securityDeposit: '',
    duration: '12',
  });

  const [userRole, setUserRole] = useState<'landlord' | 'tenant' | 'none'>('none');
  const [factoryStats, setFactoryStats] = useState({ total: 0, active: 0, completed: 0 });

  const fetchAgreements = useCallback(async () => {
    if (!account || !provider) return;
    setLoading(true);
    setError('');

    try {
      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, RENTAL_AGREEMENT_FACTORY_ABI, provider);
      const nftContract = new ethers.Contract(RENTAL_AGREEMENT_NFT_ADDRESS, RENTAL_AGREEMENT_NFT_ABI, provider);

      // Get stats
      const [total, active, completed] = await factoryContract.getFactoryStats();
      setFactoryStats({
        total: Number(total),
        active: Number(active),
        completed: Number(completed)
      });

      // Get agreements for user (as landlord and tenant)
      const [landlordAgreementIds, tenantAgreementIds] = await Promise.all([
        factoryContract.getLandlordAgreements(account),
        factoryContract.getTenantAgreements(account)
      ]);

      // Combine and deduplicate
      const combinedIds = [...landlordAgreementIds.map(Number), ...tenantAgreementIds.map(Number)];
      const allIds = combinedIds.filter((id, index) => combinedIds.indexOf(id) === index);

      const agreementPromises = allIds.map(async (id) => {
        const data = await nftContract.getAgreement(id);
        return {
          id,
          propertyId: Number(data.propertyId),
          landlord: data.landlord,
          tenant: data.tenant,
          monthlyRent: Number(ethers.formatUnits(data.monthlyRent, 6)),
          securityDeposit: Number(ethers.formatUnits(data.securityDeposit, 6)),
          startDate: Number(data.startDate),
          endDate: Number(data.endDate),
          duration: Number(data.duration),
          status: Number(data.status),
          depositAmount: Number(ethers.formatUnits(data.depositAmount, 6)),
          totalPaid: Number(ethers.formatUnits(data.totalPaid, 6)),
          paymentsMade: Number(data.paymentsMade),
          paymentsMissed: Number(data.paymentsMissed),
          landlordSigned: data.landlordSigned,
          tenantSigned: data.tenantSigned,
        };
      });

      const fetchedAgreements = await Promise.all(agreementPromises);
      setAgreements(fetchedAgreements);

      // Determine user role
      if (landlordAgreementIds.length > 0) {
        setUserRole('landlord');
      } else if (tenantAgreementIds.length > 0) {
        setUserRole('tenant');
      }

    } catch (err: any) {
      console.error('Error fetching agreements:', err);
      setError(err.message || 'Error loading agreements');
    } finally {
      setLoading(false);
    }
  }, [account, provider]);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  const handleCreateAgreement = async () => {
    if (!account || !provider) return;
    setLoading(true);

    try {
      const signer = await provider.getSigner();
      const factoryContract = new ethers.Contract(FACTORY_ADDRESS, RENTAL_AGREEMENT_FACTORY_ABI, signer);

      const monthlyRentWei = ethers.parseUnits(createForm.monthlyRent, 6);
      const securityDepositWei = ethers.parseUnits(createForm.securityDeposit, 6);

      setNotification({ open: true, message: 'Creating rental agreement...', severity: 'info' });

      const tx = await factoryContract.createAgreement(
        createForm.propertyId,
        createForm.tenantAddress,
        monthlyRentWei,
        securityDepositWei,
        createForm.duration
      );

      await tx.wait();

      setNotification({ open: true, message: 'Agreement created successfully!', severity: 'success' });
      setShowCreateModal(false);
      setCreateForm({ propertyId: '', tenantAddress: '', monthlyRent: '', securityDeposit: '', duration: '12' });
      await fetchAgreements();

    } catch (err: any) {
      console.error('Error creating agreement:', err);
      setNotification({ open: true, message: err.reason || 'Error creating agreement', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignAgreement = async (agreementId: number, asLandlord: boolean) => {
    if (!account || !provider) return;
    setLoading(true);

    try {
      const signer = await provider.getSigner();
      const nftContract = new ethers.Contract(RENTAL_AGREEMENT_NFT_ADDRESS, RENTAL_AGREEMENT_NFT_ABI, signer);

      setNotification({ open: true, message: 'Signing agreement...', severity: 'info' });

      const tx = asLandlord
        ? await nftContract.signAsLandlord(agreementId)
        : await nftContract.signAsTenant(agreementId);

      await tx.wait();

      setNotification({ open: true, message: 'Agreement signed!', severity: 'success' });
      await fetchAgreements();

    } catch (err: any) {
      console.error('Error signing agreement:', err);
      setNotification({ open: true, message: err.reason || 'Error signing', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePayDeposit = async (agreementId: number, amount: number) => {
    if (!account || !provider) return;
    setLoading(true);

    try {
      const signer = await provider.getSigner();
      const nftContract = new ethers.Contract(RENTAL_AGREEMENT_NFT_ADDRESS, RENTAL_AGREEMENT_NFT_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

      const amountWei = ethers.parseUnits(amount.toString(), 6);

      // Approve USDT
      setNotification({ open: true, message: 'Approving USDT...', severity: 'info' });
      const approveTx = await usdtContract.approve(RENTAL_AGREEMENT_NFT_ADDRESS, amountWei);
      await approveTx.wait();

      // Pay deposit
      setNotification({ open: true, message: 'Paying security deposit...', severity: 'info' });
      const tx = await nftContract.paySecurityDeposit(agreementId);
      await tx.wait();

      setNotification({ open: true, message: 'Deposit paid! Your deposit is now generating yield in the vault.', severity: 'success' });
      setShowPayDepositModal(false);
      await fetchAgreements();

    } catch (err: any) {
      console.error('Error paying deposit:', err);
      setNotification({ open: true, message: err.reason || 'Error paying deposit', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePayRent = async (agreementId: number, amount: number) => {
    if (!account || !provider) return;
    setLoading(true);

    try {
      const signer = await provider.getSigner();
      const nftContract = new ethers.Contract(RENTAL_AGREEMENT_NFT_ADDRESS, RENTAL_AGREEMENT_NFT_ABI, signer);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

      const amountWei = ethers.parseUnits(amount.toString(), 6);

      // Approve USDT
      setNotification({ open: true, message: 'Approving USDT...', severity: 'info' });
      const approveTx = await usdtContract.approve(RENTAL_AGREEMENT_NFT_ADDRESS, amountWei);
      await approveTx.wait();

      // Pay rent
      setNotification({ open: true, message: 'Paying monthly rent...', severity: 'info' });
      const tx = await nftContract.payRent(agreementId);
      await tx.wait();

      setNotification({ open: true, message: 'Rent paid successfully!', severity: 'success' });
      setShowPayRentModal(false);
      await fetchAgreements();

    } catch (err: any) {
      console.error('Error paying rent:', err);
      setNotification({ open: true, message: err.reason || 'Error paying rent', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US');
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!account) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Connect your wallet to view your rental agreements</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Rental Agreements (NFT)
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Total Agreements</Typography>
            <Typography variant="h4" color="primary">{factoryStats.total}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Active</Typography>
            <Typography variant="h4" color="success.main">{factoryStats.active}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">Completed</Typography>
            <Typography variant="h4" color="info.main">{factoryStats.completed}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={() => setShowCreateModal(true)}>
          Create New Agreement
        </Button>
        <Button variant="outlined" onClick={fetchAgreements} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Refresh'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Agreements Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Property</TableCell>
              <TableCell>Landlord</TableCell>
              <TableCell>Tenant</TableCell>
              <TableCell>Rent/mo</TableCell>
              <TableCell>Deposit</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payments</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agreements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  {loading ? <CircularProgress /> : "You don't have any rental agreements"}
                </TableCell>
              </TableRow>
            ) : (
              agreements.map((agreement) => (
                <TableRow key={agreement.id}>
                  <TableCell>#{agreement.id}</TableCell>
                  <TableCell>#{agreement.propertyId}</TableCell>
                  <TableCell>{truncateAddress(agreement.landlord)}</TableCell>
                  <TableCell>{truncateAddress(agreement.tenant)}</TableCell>
                  <TableCell>${agreement.monthlyRent.toFixed(2)}</TableCell>
                  <TableCell>${agreement.securityDeposit.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[agreement.status]?.label || 'Unknown'}
                      color={STATUS_LABELS[agreement.status]?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{agreement.paymentsMade}/{agreement.duration}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {/* Sign buttons */}
                      {agreement.status === 0 && (
                        <>
                          {agreement.landlord.toLowerCase() === account.toLowerCase() && !agreement.landlordSigned && (
                            <Button size="small" variant="outlined" onClick={() => handleSignAgreement(agreement.id, true)}>
                              Sign (L)
                            </Button>
                          )}
                          {agreement.tenant.toLowerCase() === account.toLowerCase() && !agreement.tenantSigned && (
                            <Button size="small" variant="outlined" onClick={() => handleSignAgreement(agreement.id, false)}>
                              Sign (T)
                            </Button>
                          )}
                          {agreement.tenant.toLowerCase() === account.toLowerCase() && agreement.depositAmount === 0 && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => {
                                setSelectedAgreement(agreement);
                                setShowPayDepositModal(true);
                              }}
                            >
                              Pagar Depósito
                            </Button>
                          )}
                        </>
                      )}
                      {/* Pay rent button */}
                      {agreement.status === 1 && agreement.tenant.toLowerCase() === account.toLowerCase() && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => {
                            setSelectedAgreement(agreement);
                            setShowPayRentModal(true);
                          }}
                        >
                          Pagar Renta
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Agreement Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', p: 4, maxWidth: 500, width: '90%' }}>
          <Typography variant="h6" mb={2}>Create New Rental Agreement</Typography>
          <Stack spacing={2}>
            <TextField
              label="Property ID"
              value={createForm.propertyId}
              onChange={(e) => setCreateForm({ ...createForm, propertyId: e.target.value })}
              type="number"
              fullWidth
            />
            <TextField
              label="Tenant Address"
              value={createForm.tenantAddress}
              onChange={(e) => setCreateForm({ ...createForm, tenantAddress: e.target.value })}
              fullWidth
              placeholder="0x..."
            />
            <TextField
              label="Monthly Rent (USDT)"
              value={createForm.monthlyRent}
              onChange={(e) => setCreateForm({ ...createForm, monthlyRent: e.target.value })}
              type="number"
              fullWidth
            />
            <TextField
              label="Security Deposit (USDT)"
              value={createForm.securityDeposit}
              onChange={(e) => setCreateForm({ ...createForm, securityDeposit: e.target.value })}
              type="number"
              fullWidth
            />
            <TextField
              label="Duration (months)"
              value={createForm.duration}
              onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })}
              type="number"
              fullWidth
              inputProps={{ min: 1, max: 24 }}
            />
            <Button variant="contained" onClick={handleCreateAgreement} disabled={loading} fullWidth>
              {loading ? <CircularProgress size={20} /> : 'Create Agreement'}
            </Button>
          </Stack>
        </Paper>
      </Modal>

      {/* Pay Deposit Modal */}
      <Modal open={showPayDepositModal} onClose={() => setShowPayDepositModal(false)}>
        <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', p: 4, maxWidth: 400 }}>
          <Typography variant="h6" mb={2}>Pay Security Deposit</Typography>
          {selectedAgreement && (
            <>
              <Typography variant="body1" mb={2}>
                Amount: <strong>${selectedAgreement.securityDeposit.toFixed(2)} USDT</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Your deposit will be placed in the vault and generate yield (~4% APY).
                At the end of the contract, you will receive your deposit + 70% of the yield generated.
              </Typography>
              <Button
                variant="contained"
                onClick={() => handlePayDeposit(selectedAgreement.id, selectedAgreement.securityDeposit)}
                disabled={loading}
                fullWidth
              >
                {loading ? <CircularProgress size={20} /> : 'Confirm Payment'}
              </Button>
            </>
          )}
        </Paper>
      </Modal>

      {/* Pay Rent Modal */}
      <Modal open={showPayRentModal} onClose={() => setShowPayRentModal(false)}>
        <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', p: 4, maxWidth: 400 }}>
          <Typography variant="h6" mb={2}>Pay Monthly Rent</Typography>
          {selectedAgreement && (
            <>
              <Typography variant="body1" mb={2}>
                Amount: <strong>${selectedAgreement.monthlyRent.toFixed(2)} USDT</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Payment #{selectedAgreement.paymentsMade + 1} of {selectedAgreement.duration}
              </Typography>
              <Button
                variant="contained"
                color="success"
                onClick={() => handlePayRent(selectedAgreement.id, selectedAgreement.monthlyRent)}
                disabled={loading}
                fullWidth
              >
                {loading ? <CircularProgress size={20} /> : 'Confirm Payment'}
              </Button>
            </>
          )}
        </Paper>
      </Modal>

      {/* Notification Snackbar */}
      {notification.open && (
        <Alert
          severity={notification.severity}
          onClose={() => setNotification({ ...notification, open: false })}
          sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
        >
          {notification.message}
        </Alert>
      )}
    </Box>
  );
}
