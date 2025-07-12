import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Box, Typography, Paper, TextField, Button, Alert, Stack, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    PROPERTY_INTEREST_POOL_ADDRESS,
    PROPERTY_INTEREST_POOL_ABI,
    MXNBT_ADDRESS,
    MXNB_ABI
} from './web3/config';

interface CreatePoolPageProps {
  account: string | null;
  tokenDecimals: number;
}

export default function CreatePoolPage({ account, tokenDecimals }: CreatePoolPageProps) {
    const [form, setForm] = useState({
        propertyName: '',
        description: '', // Añadido para futura referencia
        totalRent: '',
        seriousnessDeposit: '',
        tenantCount: '',
        paymentDayStart: '',
        paymentDayEnd: '',
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleCreatePool = async () => {
        setLoading(true);
        setError('');
        setStatusMessage('');

        try {
            if (!window.ethereum) {
                throw new Error("MetaMask no está instalado.");
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const poolContract = new ethers.Contract(
                PROPERTY_INTEREST_POOL_ADDRESS,
                PROPERTY_INTEREST_POOL_ABI,
                signer
            );

            const { propertyName, description, totalRent, seriousnessDeposit, tenantCount, paymentDayStart, paymentDayEnd } = form;
            
            if (Number(tenantCount) <= 0) {
                throw new Error("El número de inquilinos debe ser mayor que 0.");
            }
            if (Number(totalRent) % Number(tenantCount) !== 0) {
                throw new Error("La renta total debe ser divisible por el número de inquilinos.");
            }

            const totalRentWei = ethers.parseUnits(totalRent, tokenDecimals);
            const seriousnessDepositWei = ethers.parseUnits(seriousnessDeposit, tokenDecimals);

            setStatusMessage('Creando el pool de interés en la blockchain...');
            const tx = await poolContract.createPropertyPool(
                propertyName,
                description || " ", // Enviar descripción o un espacio si está vacía
                totalRentWei,
                seriousnessDepositWei,
                tenantCount,
                paymentDayStart,
                paymentDayEnd
            );

            await tx.wait();
            
            setStatusMessage('¡Pool de interés creado exitosamente! Serás redirigido en 3 segundos.');

            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (err: any) {
            const reason = err.reason || 'Ocurrió un error desconocido.';
            setError(reason);
            setStatusMessage('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Box maxWidth={600} mx="auto" mt={6}>
                <Paper sx={{ p: 4, borderRadius: 3 }}>
                    <Typography variant="h4" fontWeight={700} mb={3}>
                        Crear un Nuevo Pool de Interés
                    </Typography>
                    <Stack spacing={2}>
                        <TextField
                            label="Nombre de la Propiedad"
                            name="propertyName"
                            value={form.propertyName}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Renta Total Mensual (MXNB)"
                            name="totalRent"
                            value={form.totalRent}
                            onChange={handleChange}
                            type="number"
                            fullWidth
                            required
                        />
                        <TextField
                            label="Depósito de Seriedad (MXNB)"
                            name="seriousnessDeposit"
                            value={form.seriousnessDeposit}
                            onChange={handleChange}
                            type="number"
                            fullWidth
                            required
                        />
                        <TextField
                            label="Número de Inquilinos Requeridos"
                            name="tenantCount"
                            value={form.tenantCount}
                            onChange={handleChange}
                            type="number"
                            fullWidth
                            required
                        />
                        <TextField
                            label="Día de Inicio de Pago (1-31)"
                            name="paymentDayStart"
                            value={form.paymentDayStart}
                            onChange={handleChange}
                            type="number"
                            fullWidth
                            required
                        />
                        <TextField
                            label="Día Límite de Pago (1-31)"
                            name="paymentDayEnd"
                            value={form.paymentDayEnd}
                            onChange={handleChange}
                            type="number"
                            fullWidth
                            required
                        />
                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                        {statusMessage && <Alert severity={error ? 'error' : 'info'} sx={{ mt: 2 }}>{statusMessage}</Alert>}
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            sx={{ mt: 2 }}
                            disabled={loading}
                            onClick={handleCreatePool}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {loading ? 'Procesando...' : 'Crear Pool'}
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </>
    );
}
