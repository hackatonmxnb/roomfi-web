import React from 'react';
import { Box, Chip, Typography, Tooltip, Grid } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WorkIcon from '@mui/icons-material/Work';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SchoolIcon from '@mui/icons-material/School';
import BusinessIcon from '@mui/icons-material/Business';
import CreditScoreIcon from '@mui/icons-material/CreditScore';
import StarIcon from '@mui/icons-material/Star';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import SpeedIcon from '@mui/icons-material/Speed';
import BalanceIcon from '@mui/icons-material/Balance';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

// Badge types matching the contract enum
export const BADGE_INFO = [
  // KYC Badges (0-5) - Require manual verification
  { id: 0, name: 'ID Verificado', description: 'INE/Pasaporte verificado manualmente', icon: VerifiedUserIcon, color: '#4CAF50', isKYC: true },
  { id: 1, name: 'Ingresos Verificados', description: 'Comprobantes de ingreso revisados', icon: AccountBalanceIcon, color: '#2196F3', isKYC: true },
  { id: 2, name: 'Empleo Verificado', description: 'Carta laboral verificada', icon: WorkIcon, color: '#9C27B0', isKYC: true },
  { id: 3, name: 'Educación Verificada', description: 'Título universitario verificado', icon: SchoolIcon, color: '#FF9800', isKYC: true },
  { id: 4, name: 'Profesional Verificado', description: 'LinkedIn/empresa verificados', icon: BusinessIcon, color: '#00BCD4', isKYC: true },
  { id: 5, name: 'Crédito Limpio', description: 'Buró de crédito verificado', icon: CreditScoreIcon, color: '#8BC34A', isKYC: true },
  
  // Automatic Badges (6-13) - Earned by on-chain metrics
  { id: 6, name: 'Early Adopter', description: 'Primeros 1000 usuarios', icon: StarIcon, color: '#FFD700', isKYC: false },
  { id: 7, name: 'Inquilino Confiable', description: '12 pagos consecutivos a tiempo', icon: ThumbUpIcon, color: '#4CAF50', isKYC: false },
  { id: 8, name: 'Inquilino a Largo Plazo', description: '12+ meses en una propiedad', icon: AccessTimeIcon, color: '#3F51B5', isKYC: false },
  { id: 9, name: 'Referidor Activo', description: '5+ referidos exitosos', icon: PeopleIcon, color: '#E91E63', isKYC: false },
  { id: 10, name: 'Respuesta Rápida', description: 'Responde en <24h consistentemente', icon: SpeedIcon, color: '#FF5722', isKYC: false },
  { id: 11, name: 'Cero Disputas', description: 'Sin disputas en 12+ meses', icon: BalanceIcon, color: '#009688', isKYC: false },
  { id: 12, name: 'Sin Daños', description: '3+ propiedades sin daños', icon: HomeWorkIcon, color: '#795548', isKYC: false },
  { id: 13, name: 'Super Inquilino', description: 'Reputación 90+ por 6 meses', icon: EmojiEventsIcon, color: '#FFC107', isKYC: false },
];

interface BadgesDisplayProps {
  badges: boolean[];
  compact?: boolean;
  onRequestVerification?: (badgeId: number) => void;
}

export default function BadgesDisplay({ badges, compact = false, onRequestVerification }: BadgesDisplayProps) {
  const earnedBadges = BADGE_INFO.filter((_, index) => badges[index]);
  const availableBadges = BADGE_INFO.filter((_, index) => !badges[index]);
  
  const kycBadges = BADGE_INFO.filter(b => b.isKYC);
  const autoBadges = BADGE_INFO.filter(b => !b.isKYC);

  if (compact) {
    return (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {earnedBadges.map((badge) => {
          const IconComponent = badge.icon;
          return (
            <Tooltip key={badge.id} title={badge.name}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: badge.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconComponent sx={{ fontSize: 16, color: 'white' }} />
              </Box>
            </Tooltip>
          );
        })}
        {earnedBadges.length === 0 && (
          <Typography variant="caption" color="text.secondary">Sin badges</Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={2}>
        Badges ({earnedBadges.length}/14)
      </Typography>

      {/* KYC Badges Section */}
      <Typography variant="subtitle2" color="text.secondary" mb={1}>
        Verificación KYC
      </Typography>
      <Grid container spacing={1} mb={2}>
        {kycBadges.map((badge) => {
          const IconComponent = badge.icon;
          const isEarned = badges[badge.id];
          return (
            <Grid item xs={6} sm={4} key={badge.id}>
              <Tooltip title={badge.description}>
                <Chip
                  icon={<IconComponent sx={{ color: isEarned ? 'white' : 'inherit' }} />}
                  label={badge.name}
                  onClick={!isEarned && onRequestVerification ? () => onRequestVerification(badge.id) : undefined}
                  sx={{
                    width: '100%',
                    bgcolor: isEarned ? badge.color : 'grey.200',
                    color: isEarned ? 'white' : 'text.secondary',
                    opacity: isEarned ? 1 : 0.6,
                    cursor: !isEarned && onRequestVerification ? 'pointer' : 'default',
                    '&:hover': {
                      bgcolor: isEarned ? badge.color : 'grey.300',
                    },
                  }}
                />
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>

      {/* Automatic Badges Section */}
      <Typography variant="subtitle2" color="text.secondary" mb={1}>
        Badges Automáticos
      </Typography>
      <Grid container spacing={1}>
        {autoBadges.map((badge) => {
          const IconComponent = badge.icon;
          const isEarned = badges[badge.id];
          return (
            <Grid item xs={6} sm={4} key={badge.id}>
              <Tooltip title={badge.description}>
                <Chip
                  icon={<IconComponent sx={{ color: isEarned ? 'white' : 'inherit' }} />}
                  label={badge.name}
                  sx={{
                    width: '100%',
                    bgcolor: isEarned ? badge.color : 'grey.200',
                    color: isEarned ? 'white' : 'text.secondary',
                    opacity: isEarned ? 1 : 0.6,
                  }}
                />
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
