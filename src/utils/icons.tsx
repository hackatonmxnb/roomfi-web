import React from 'react';
import FemaleIcon from '@mui/icons-material/Female';
import MaleIcon from '@mui/icons-material/Male';
import TransgenderIcon from '@mui/icons-material/Transgender';
import Diversity3Icon from '@mui/icons-material/Diversity3';

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