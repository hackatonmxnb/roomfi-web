import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Box, Typography, Paper, TextField, Button, Alert, Stack, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    PROPERTY_REGISTRY_ADDRESS,
    PROPERTY_REGISTRY_ABI,
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

            const registryContract = new ethers.Contract(
                PROPERTY_REGISTRY_ADDRESS,
                PROPERTY_REGISTRY_ABI,
                signer
            );

            const { propertyName, description, totalRent, seriousnessDeposit, tenantCount, paymentDayStart, paymentDayEnd } = form;
            
            if (Number(tenantCount) <= 0) {
                throw new Error("El número de inquilinos debe ser mayor que 0.");
            }

            setStatusMessage('Registrando propiedad en la blockchain...');
            
            // V2: Usar PropertyRegistry.registerProperty
            // Parámetros: name, propertyType (0=APARTMENT), location, bedroomCount, bathroomCount, squareMeters, amenities[], terms
            const tx = await registryContract.registerProperty(
                propertyName,
                0, // propertyType: APARTMENT
                description || "Sin ubicación especificada", // location
                Number(tenantCount), // bedroomCount (usando tenantCount como proxy)
                1, // bathroomCount
                50, // squareMeters (valor por defecto)
                [], // amenities
                `Renta: ${totalRent}, Depósito: ${seriousnessDeposit}, Días de pago: ${paymentDayStart}-${paymentDayEnd}` // terms
            );

            await tx.wait();
            
            setStatusMessage('¡Propiedad registrada exitosamente! Serás redirigido en 3 segundos.');

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
                        Registrar Nueva Propiedad
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
                            label="Renta Total Mensual (USDT)"
                            name="totalRent"
                            value={form.totalRent}
                            onChange={handleChange}
                            type="number"
                            fullWidth
                            required
                        />
                        <TextField
                            label="Depósito de Seguridad (USDT)"
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
                            {loading ? 'Procesando...' : 'Registrar Propiedad'}
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </>
    );
}
