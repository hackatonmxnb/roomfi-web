import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert, Avatar, Tabs, Tab, Stack, Chip, MenuItem, FormControl, InputLabel, Select, OutlinedInput } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import { renderGenderIcon } from './utils/icons';
import type { SelectChangeEvent } from '@mui/material/Select';

export default function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Recibe datos de Google: email, name, picture, given_name, family_name
  const { email = '', name = '', picture = '', given_name = '', family_name = '' } = location.state || {};
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({
    first_name: given_name || '',
    last_name: family_name || '',
    gender: '',
    age: '',
    bio: '',
    budget_min: '',
    budget_max: '',
    location_preference: '',
    lifestyle_tags: [],
    roomie_preferences: {
      gender: '',
      smoking: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('roomfi_user_id');
      if (stored) return stored;
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        const uuid = crypto.randomUUID();
        localStorage.setItem('roomfi_user_id', uuid);
        return uuid;
      } else {
        const uuid = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('roomfi_user_id', uuid);
        return uuid;
      }
    }
    return '';
  });
  const [lastMatches, setLastMatches] = useState<any>(null);

  // Dummy handlers for Header (replace with real logic if needed)
  const handleFundingModalOpen = () => {};
  const handleConnectGoogle = () => {};
  const handleConnectMetaMask = () => {};

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => setTab(newValue);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleContinue = () => setTab(1);

  useEffect(() => {
    if (success && lastMatches) {
      navigate('/', { state: { matches: lastMatches } });
    }
  }, [success, lastMatches, navigate]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(process.env.REACT_APP_API + "/db/new/user" || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, "profile_image_url": picture, ...form }),
      });
      if (!res.ok) throw new Error('Error al registrar usuario');
      setSuccess(true);
      localStorage.removeItem('roomfi_user_id');
      // Llamar al endpoint de matchmaking
      const user_id = userId;
      const matchRes = await fetch(process.env.REACT_APP_API + `/matchmaking/match/top?user_id=${user_id}`);
      const matchData = await matchRes.json();
      setLastMatches(matchData);
      return;
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const lifestyleOptions = [
    { value: 'early_bird', label: 'Madrugador/a' },
    { value: 'night_owl', label: 'Nocturno/a' },
    { value: 'no_pets', label: 'Sin mascotas' },
    { value: 'pets_ok', label: 'Acepta mascotas' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'vegan', label: 'Vegano/a' },
    { value: 'student', label: 'Estudiante' },
    { value: 'remote_worker', label: 'Home office' },
  ];

  const handleLifestyleChange = (event: any) => {
    const { value } = event.target;
    setForm({ ...form, lifestyle_tags: typeof value === 'string' ? value.split(',') : value });
  };

  const handleRoomiePrefChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    setForm({
      ...form,
      roomie_preferences: {
        ...form.roomie_preferences,
        [e.target.name]: e.target.value,
      },
    });
  };

  return (
    <>
      <Box maxWidth={600} mx="auto" mt={6}>
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Stack direction="row" spacing={3} alignItems="center" mb={2}>
            <Avatar src={picture} alt={name} sx={{ width: 72, height: 72 }} />
            <Box>
              <Typography variant="h4" fontWeight={700}>{name}</Typography>
              <Typography color="primary" fontWeight={500} sx={{ fontSize: 16 }}>{email}</Typography>
            </Box>
          </Stack>
          <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab label="Informacion basica" sx={{ fontWeight: 700 }} />
            <Tab label="Preferencias de roomie" sx={{ fontWeight: 700 }} />
          </Tabs>
          {tab === 0 && (
            <Box>
              <Stack direction="row" spacing={2} mb={2}>
                <Chip label="FYI" color="primary" size="small" />
                <Typography variant="body2" color="text.secondary">
                  los perfiles completos tienen 5X mas exito en RoomFi. Completa esta sección para poder abrir conversaciones con otros usuarios.
                </Typography>
              </Stack>
              <form onSubmit={e => { e.preventDefault(); handleContinue(); }}>
                <Stack spacing={2}>
                  <TextField label="Nombre" name="first_name" value={form.first_name} onChange={handleChange} fullWidth required />
                  <TextField label="Apellidos" name="last_name" value={form.last_name} onChange={handleChange} fullWidth required />
                  <TextField label="Genero" name="gender" value={form.gender} onChange={handleChange} select fullWidth required>
                    <MenuItem value=""><span style={{ marginLeft: 28 }}>Selecciona</span></MenuItem>
                    <MenuItem value="female">{renderGenderIcon('female')}Femenino</MenuItem>
                    <MenuItem value="male">{renderGenderIcon('male')}Masculino</MenuItem>
                    <MenuItem value="other">{renderGenderIcon('other')}Otro</MenuItem>
                    <MenuItem value="prefer_not_say">{renderGenderIcon('prefer_not_say')}Prefiero no decir</MenuItem>
                  </TextField>
                  <TextField label="Edad" name="age" value={form.age} onChange={handleChange} type="number" fullWidth required inputProps={{ min: 18, max: 99 }} />
                  <TextField label="Bio" name="bio" value={form.bio} onChange={handleChange} fullWidth multiline minRows={2} maxRows={4} />
                  {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                  <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }} disabled={loading}>Continuar</Button>
                </Stack>
              </form>
            </Box>
          )}
          {tab === 1 && (
            <form onSubmit={handleSubmit}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={2}>PREFERENCIAS DE ROOMIE</Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Presupuesto mínimo (MXN)"
                    name="budget_min"
                    type="number"
                    value={form.budget_min}
                    onChange={handleChange}
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    label="Presupuesto máximo (MXN)"
                    name="budget_max"
                    type="number"
                    value={form.budget_max}
                    onChange={handleChange}
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    label="Ubicación preferida"
                    name="location_preference"
                    value={form.location_preference}
                    onChange={handleChange}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel id="lifestyle-tags-label">Estilo de vida</InputLabel>
                    <Select
                      labelId="lifestyle-tags-label"
                      id="lifestyle-tags"
                      multiple
                      value={form.lifestyle_tags}
                      onChange={handleLifestyleChange}
                      input={<OutlinedInput label="Estilo de vida" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => {
                            const opt = lifestyleOptions.find(o => o.value === value);
                            return <Chip key={value} label={opt ? opt.label : value} size="small" />;
                          })}
                        </Box>
                      )}
                    >
                      {lifestyleOptions.map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel id="roomie-gender-label">Género preferido de roomie</InputLabel>
                    <Select
                      labelId="roomie-gender-label"
                      name="gender"
                      value={form.roomie_preferences.gender}
                      onChange={handleRoomiePrefChange}
                      label="Género preferido de roomie"
                    >
                      <MenuItem value="">Cualquiera</MenuItem>
                      <MenuItem value="female">{renderGenderIcon('female')}Femenino</MenuItem>
                      <MenuItem value="male">{renderGenderIcon('male')}Masculino</MenuItem>
                      <MenuItem value="other">{renderGenderIcon('other')}Otro</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel id="roomie-smoking-label">¿Acepta fumar?</InputLabel>
                    <Select
                      labelId="roomie-smoking-label"
                      name="smoking"
                      value={form.roomie_preferences.smoking}
                      onChange={handleRoomiePrefChange}
                      label="¿Acepta fumar?"
                    >
                      <MenuItem value="">Cualquiera</MenuItem>
                      <MenuItem value="no">No</MenuItem>
                      <MenuItem value="yes">Sí</MenuItem>
                    </Select>
                  </FormControl>
                  {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                  <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }} disabled={loading}>{loading ? 'Registrando...' : 'Registrar'}</Button>
                </Stack>
              </Box>
            </form>
          )}
        </Paper>
      </Box>
    </>
  );
} 