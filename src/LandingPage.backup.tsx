import React from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Grid,
    Card,
    Stack,
    alpha,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GroupsIcon from '@mui/icons-material/Groups';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TokenIcon from '@mui/icons-material/Token';
import DescriptionIcon from '@mui/icons-material/Description';

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: <GavelIcon sx={{ fontSize: 48,color: '#1976d2' }} />,
            title: 'Ricardian Contracts',
            description: 'Legal agreements stored on-chain with cryptographic signatures. Real legal binding with blockchain transparency.',
        },
        {
            icon: <VerifiedUserIcon sx={{ fontSize: 48,color: '#66bb6a' }} />,
            title: 'Tenant Passport NFT',
            description: 'Your on-chain reputation as a tenant. Payment history and verifiable identity that stays with you forever.',
        },
        {
            icon: <SecurityIcon sx={{ fontSize: 48,color: '#ff9800' }} />,
            title: 'Smart Contract Security',
            description: 'All transactions secured by auditable smart contracts on Mantle Network.',
        },
        {
            icon: <TokenIcon sx={{ fontSize: 48,color: '#9c27b0' }} />,
            title: 'Mantle Network',
            description: 'Built on Mantle for fast, low-cost transactions. Enterprise-grade L2 security.',
        },
        {
            icon: <TrendingUpIcon sx={{ fontSize: 48,color: '#f44336' }} />,
            title: 'Yield Generation',
            description: 'Deposit funds in the RoomFi Vault and earn yield while your money is secure.',
        },
        {
            icon: <DescriptionIcon sx={{ fontSize: 48,color: '#00bcd4' }} />,
            title: 'Property Registry',
            description: 'Register properties with full details, GPS coordinates, and legal compliance.',
        },
    ];

    const steps = [
        {
            number: '01',
            title: 'Connect Wallet',
            description: 'Sign up with Google or connect MetaMask in seconds.',
        },
        {
            number: '02',
            title: 'Get Tenant Passport',
            description: 'Mint your identity NFT with your rental history on-chain.',
        },
        {
            number: '03',
            title: 'Register Property',
            description: 'Landlords register properties with Ricardian legal contracts.',
        },
        {
            number: '04',
            title: 'Sign & Rent',
            description: 'Cryptographically sign rental agreements and pay with USDT.',
        },
    ];

    return (
        <Box sx={{
            bgcolor: '#ffffff',
            minHeight: '100vh',
        }}>
            {/* Navbar */}
            <Box
                component="nav"
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 2px 20px rgba(0, 0, 0, 0.08)',
                    zIndex: 1000,
                    py: 2,
                }}
            >
                <Container maxWidth="lg">
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box
                            component="img"
                            src="/roomcasa.png"
                            alt="RoomFi Logo"
                            sx={{
                                height: { xs: '40px',sm: '50px' },
                                width: 'auto',
                                cursor: 'pointer',
                            }}
                            onClick={() => window.scrollTo({ top: 0,behavior: 'smooth' })}
                        />
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box
                                component="img"
                                src="/mantle_logo.png"
                                alt="Built on Mantle"
                                sx={{
                                    height: '28px',
                                    width: 'auto',
                                    display: { xs: 'none',sm: 'block' },
                                }}
                            />
                            <Button
                                variant="contained"
                                onClick={() => navigate('/app')}
                                sx={{
                                    bgcolor: '#1976d2',
                                    color: 'white',
                                    px: 3,
                                    py: 1,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    '&:hover': {
                                        bgcolor: '#1565c0',
                                    },
                                }}
                            >
                                Launch App
                            </Button>
                        </Stack>
                    </Stack>
                </Container>
            </Box>

            {/* Hero Section */}
            <Box
                sx={{
                    position: 'relative',
                    minHeight: { xs: '70vh',md: '80vh' },
                    display: 'flex',
                    alignItems: 'center',
                    pt: { xs: 14,md: 16 },
                    pb: { xs: 8,md: 12 },
                    overflow: 'hidden',
                    backgroundImage: 'url(/nychero.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.80) 100%)',
                        zIndex: 1,
                    }
                }}
            >
                {/* Decorative elements */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: '20%',
                        right: '10%',
                        width: 300,
                        height: 300,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
                        filter: 'blur(40px)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: '10%',
                        left: '5%',
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(102, 187, 106, 0.2) 0%, transparent 70%)',
                        filter: 'blur(30px)',
                    }}
                />

                <Container maxWidth="lg" sx={{ position: 'relative',zIndex: 2 }}>
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={7}>
                            <Stack spacing={3}>
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        bgcolor: alpha('#3B82F6',0.2),
                                        color: '#93C5FD',
                                        px: 2,
                                        py: 0.75,
                                        borderRadius: 2,
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        width: 'fit-content',
                                    }}
                                >
                                    <TokenIcon sx={{ fontSize: 18 }} />
                                    Built on Mantle Network
                                </Box>

                                <Typography
                                    variant="h1"
                                    sx={{
                                        fontSize: { xs: '2.5rem',sm: '3.5rem',md: '4rem' },
                                        fontWeight: 800,
                                        color: 'white',
                                        lineHeight: 1.1,
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    Real Estate Rentals{' '}
                                    <Box
                                        component="span"
                                        sx={{
                                            background: 'linear-gradient(90deg, #3B82F6, #66bb6a)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                        }}
                                    >
                                        On-Chain
                                    </Box>
                                </Typography>

                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontSize: { xs: '1.1rem',sm: '1.3rem',md: '1.4rem' },
                                        color: '#94A3B8',
                                        lineHeight: 1.6,
                                        fontWeight: 400,
                                        maxWidth: 600,
                                    }}
                                >
                                    The first RWA protocol for rental housing with <strong style={{ color: '#93C5FD' }}>Ricardian smart contracts</strong>,
                                    on-chain tenant reputation, and institutional-grade DeFi yields.
                                </Typography>

                                <Stack direction={{ xs: 'column',sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={() => navigate('/app')}
                                        sx={{
                                            bgcolor: '#3B82F6',
                                            color: 'white',
                                            px: 4,
                                            py: 1.5,
                                            fontSize: '1.1rem',
                                            fontWeight: 600,
                                            borderRadius: 3,
                                            textTransform: 'none',
                                            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
                                            '&:hover': {
                                                bgcolor: '#2563EB',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 12px 32px rgba(59, 130, 246, 0.45)',
                                            },
                                            transition: 'all 0.3s ease',
                                        }}
                                    >
                                        Launch App
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        onClick={() => {
                                            document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        sx={{
                                            borderColor: '#475569',
                                            color: '#94A3B8',
                                            px: 4,
                                            py: 1.5,
                                            fontSize: '1.1rem',
                                            fontWeight: 600,
                                            borderRadius: 3,
                                            textTransform: 'none',
                                            '&:hover': {
                                                borderColor: '#3B82F6',
                                                color: '#3B82F6',
                                                bgcolor: 'transparent',
                                            },
                                            transition: 'all 0.3s ease',
                                        }}
                                    >
                                        How It Works
                                    </Button>
                                </Stack>

                                {/* Stats */}
                                <Stack direction="row" spacing={4} sx={{ mt: 4 }}>
                                    <Box>
                                        <Typography variant="h4" sx={{ color: 'white',fontWeight: 700 }}>V2</Typography>
                                        <Typography variant="body2" sx={{ color: '#64748B' }}>Smart Contracts</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="h4" sx={{ color: 'white',fontWeight: 700 }}>L2</Typography>
                                        <Typography variant="body2" sx={{ color: '#64748B' }}>Mantle Network</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="h4" sx={{ color: 'white',fontWeight: 700 }}>RWA</Typography>
                                        <Typography variant="body2" sx={{ color: '#64748B' }}>Real World Assets</Typography>
                                    </Box>
                                </Stack>
                            </Stack>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Features Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 8,md: 12 } }}>
                <Stack spacing={2} alignItems="center" sx={{ mb: 8 }}>
                    <Typography
                        variant="h2"
                        sx={{
                            fontSize: { xs: '2rem',md: '3rem' },
                            fontWeight: 700,
                            color: '#2c3e50',
                            textAlign: 'center',
                        }}
                    >
                        Why RoomFi?
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            fontSize: { xs: '1rem',md: '1.2rem' },
                            color: '#7f8c8d',
                            textAlign: 'center',
                            maxWidth: 700,
                        }}
                    >
                        Institutional-grade RWA protocol bringing legal compliance and DeFi yields to rental housing.
                    </Typography>
                </Stack>

                <Grid container spacing={4}>
                    {features.map((feature,index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card
                                elevation={0}
                                sx={{
                                    height: '100%',
                                    p: 3,
                                    borderRadius: 4,
                                    border: '1px solid',
                                    borderColor: alpha('#2c3e50',0.08),
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        boxShadow: `0 16px 48px ${alpha('#2c3e50',0.12)}`,
                                        borderColor: alpha('#1976d2',0.3),
                                    },
                                }}
                            >
                                <Stack spacing={2}>
                                    <Box
                                        sx={{
                                            width: 72,
                                            height: 72,
                                            borderRadius: 3,
                                            bgcolor: alpha((feature.icon.props.sx as any).color,0.1),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {feature.icon}
                                    </Box>
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontSize: '1.4rem',
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                        }}
                                    >
                                        {feature.title}
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: '#7f8c8d',
                                            lineHeight: 1.7,
                                        }}
                                    >
                                        {feature.description}
                                    </Typography>
                                </Stack>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* How It Works Section */}
            <Box
                id="how-it-works"
                sx={{
                    bgcolor: '#0F172A',
                    py: { xs: 8,md: 12 },
                }}
            >
                <Container maxWidth="lg">
                    <Stack spacing={2} alignItems="center" sx={{ mb: 8 }}>
                        <Typography
                            variant="h2"
                            sx={{
                                fontSize: { xs: '2rem',md: '3rem' },
                                fontWeight: 700,
                                color: 'white',
                                textAlign: 'center',
                            }}
                        >
                            How It Works
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                fontSize: { xs: '1rem',md: '1.2rem' },
                                color: '#94A3B8',
                                textAlign: 'center',
                                maxWidth: 600,
                            }}
                        >
                            Four steps to transparent, legally-binding rental agreements
                        </Typography>
                    </Stack>

                    <Grid container spacing={4}>
                        {steps.map((step,index) => (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                                <Stack spacing={2} alignItems="center" textAlign="center">
                                    <Box
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '50%',
                                            bgcolor: alpha('#3B82F6',0.2),
                                            border: '3px solid',
                                            borderColor: '#3B82F6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '2rem',
                                            fontWeight: 700,
                                            color: '#3B82F6',
                                        }}
                                    >
                                        {step.number}
                                    </Box>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontSize: '1.3rem',
                                            fontWeight: 600,
                                            color: 'white',
                                        }}
                                    >
                                        {step.title}
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: '#94A3B8',
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {step.description}
                                    </Typography>
                                </Stack>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* Ricardian Contracts Section */}
            <Container maxWidth="lg" sx={{ py: { xs: 8,md: 12 } }}>
                <Grid container spacing={6} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <Stack spacing={3}>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontSize: { xs: '2rem',md: '3rem' },
                                    fontWeight: 700,
                                    color: '#2c3e50',
                                }}
                            >
                                Ricardian Smart Contracts
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    fontSize: '1.1rem',
                                    color: '#7f8c8d',
                                    lineHeight: 1.8,
                                }}
                            >
                                Every rental agreement on RoomFi is backed by a Ricardian contract - combining the legal enforceability of traditional contracts with the transparency and automation of blockchain. Your signature is cryptographically verified and stored on-chain forever.
                            </Typography>
                            <Stack spacing={2} sx={{ mt: 2 }}>
                                {[
                                    'Legal document hash stored on-chain (keccak256)',
                                    'EIP-712 compliant cryptographic signatures',
                                    'Immutable and auditable contract history',
                                    'Dispute resolution via on-chain evidence',
                                ].map((benefit,index) => (
                                    <Stack direction="row" spacing={2} alignItems="center" key={index}>
                                        <CheckCircleIcon sx={{ color: '#66bb6a',fontSize: 28 }} />
                                        <Typography variant="body1" sx={{ color: '#2c3e50',fontSize: '1rem' }}>
                                            {benefit}
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Box
                            sx={{
                                p: 4,
                                borderRadius: 4,
                                bgcolor: '#0F172A',
                                border: '1px solid',
                                borderColor: '#334155',
                            }}
                        >
                            <Stack spacing={3}>
                                <GavelIcon sx={{ fontSize: 80,color: '#3B82F6' }} />
                                <Typography variant="h5" sx={{ fontWeight: 600,color: 'white' }}>
                                    Your digital legal agreement
                                </Typography>
                                <Typography variant="body1" sx={{ color: '#94A3B8',lineHeight: 1.7 }}>
                                    Every property registration includes a legal document hash and your cryptographic signature. This creates a binding agreement that is verifiable by anyone on the Mantle blockchain.
                                </Typography>
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: alpha('#3B82F6',0.1),
                                        borderRadius: 2,
                                        fontFamily: 'monospace',
                                        color: '#93C5FD',
                                        fontSize: '0.875rem',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    legalDocumentHash: 0x7c74d216...
                                    <br />
                                    signature: 0x3951664335...
                                </Box>
                            </Stack>
                        </Box>
                    </Grid>
                </Grid>
            </Container>

            {/* CTA Section */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #0F172A 100%)',
                    py: { xs: 8,md: 10 },
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Container maxWidth="md">
                    <Stack spacing={4} alignItems="center" textAlign="center" sx={{ position: 'relative',zIndex: 1 }}>
                        <Typography
                            variant="h2"
                            sx={{
                                fontSize: { xs: '2rem',md: '3rem' },
                                fontWeight: 700,
                                color: 'white',
                            }}
                        >
                            Ready to modernize rentals?
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                fontSize: { xs: '1.1rem',md: '1.3rem' },
                                color: 'rgba(255, 255, 255, 0.8)',
                                maxWidth: 600,
                            }}
                        >
                            Join RoomFi on Mantle Network and experience the future of real estate with blockchain transparency.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => navigate('/app')}
                            sx={{
                                bgcolor: 'white',
                                color: '#1976d2',
                                px: 6,
                                py: 2,
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                borderRadius: 3,
                                textTransform: 'none',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                                '&:hover': {
                                    bgcolor: '#f5f5f5',
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
                                },
                                transition: 'all 0.3s ease',
                            }}
                        >
                            Launch App
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* Footer */}
            <Box
                sx={{
                    bgcolor: '#0F172A',
                    color: 'white',
                    py: 6,
                    textAlign: 'center',
                }}
            >
                <Container maxWidth="lg">
                    <Stack spacing={3} alignItems="center">
                        <Box
                            component="img"
                            src="/roomfilogo.png"
                            alt="RoomFi Logo"
                            sx={{
                                height: { xs: '60px',sm: '70px' },
                                width: 'auto',
                                mb: 2,
                            }}
                        />
                        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                            Institutional-grade RWA protocol for rental housing on Mantle Network
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748B',fontSize: '0.875rem' }}>
                            © 2025 RoomFi Protocol. Built for Mantle Global Hackathon
                        </Typography>
                    </Stack>
                </Container>
            </Box>
        </Box >
    );
};

export default LandingPage;
