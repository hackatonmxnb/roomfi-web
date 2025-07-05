import React from 'react';
import FemaleIcon from '@mui/icons-material/Female';
import MaleIcon from '@mui/icons-material/Male';
import TransgenderIcon from '@mui/icons-material/Transgender';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import PoolIcon from '@mui/icons-material/Pool';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import PetsIcon from '@mui/icons-material/Pets';
import BedIcon from '@mui/icons-material/Bed';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import LaundryIcon from '@mui/icons-material/LocalLaundryService';
import ACIcon from '@mui/icons-material/AcUnit';
import WifiIcon from '@mui/icons-material/Wifi';

export function renderGenderIcon(gender: string) {
  switch (gender) {
    case 'female':
      return <FemaleIcon sx={{ color: '#e91e63', fontSize: 20, mr: 1 }} />;
    case 'male':
      return <MaleIcon sx={{ color: '#1976d2', fontSize: 20, mr: 1 }} />;
    case 'other':
      return <TransgenderIcon sx={{ color: '#7c4dff', fontSize: 20, mr: 1 }} />;
    case 'prefer_not_say':
      return <Diversity3Icon sx={{ color: '#757575', fontSize: 20, mr: 1 }} />;
    default:
      return null;
  }
}

export function renderAmenityIcon(amenity: string) {
  switch (amenity) {
    case 'pool':
      return <PoolIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    case 'fitness_center':
      return <FitnessCenterIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    case 'parking':
      return <LocalParkingIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    case 'pet_friendly':
      return <PetsIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    case 'furnished':
      return <BedIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    case 'private_bathroom':
      return <MeetingRoomIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    case 'laundry':
      return <LaundryIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    case 'air_conditioning':
      return <ACIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    case 'wifi':
      return <WifiIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    default:
      return null;
  }
}

export function getDaysAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  // Ignorar la hora, solo comparar fechas
  const utc1 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utc2 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
  if (isNaN(diffDays)) return '';
  return diffDays === 0 ? 'Hoy' : `${diffDays} días atrás`;
} 