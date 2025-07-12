import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, Divider, Link, Button, Modal } from '@mui/material';
import { Card, CardContent, CardMedia, Avatar, Chip } from '@mui/material';
import { renderAmenityIcon, getDaysAgo } from './utils/icons';

const DashboardPage = () => {
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedInterestListing, setSelectedInterestListing] = useState<any>(null);
  const [showInterestModal, setShowInterestModal] = useState(false);

  const handleOpenWithdrawalModal = () => setShowWithdrawalModal(true);
  const handleCloseWithdrawalModal = () => setShowWithdrawalModal(false);

  // Mock data
  const activityData = { checkIns: 0, checkOuts: 0, tripsInProgress: 4, pendingReviews: 4 };
  const performanceData = { occupancyRate: 64, fiveStarRatings: 100, conversionRate: 80 };
  const bookingRequests = [
    { id: 1, nombre: 'Julieta', inquiry: 'aceptas un gato pequeño?', location: '1 cuarto cerca Del Valle' },
    { id: 2, nombre: 'Ana y Carla', inquiry: 'Me interesa pero somos 2 chavas, puedes aceptarnos a las 2?', location: '1 cuarto cerca Del Valle' },
    { id: 3, nombre: 'Luis', inquiry: 'Esta disponible para agosto?', location: 'Depa completo metro Chapultpec' },
  ];

  const propertyData = [
    {
      id: 1,
      user: { avatar: 'https://example.com/avatar1.png', name: '1 cuarto cerca Del Valle' },
      price: 1200,
      address: '123 Main St, City',
      amenities: ['amueblado', 'baño privado'],
      created_at: new Date().toISOString(),
      description: 'Este encantador departamento ofrece un ambiente acogedor con una cocina moderna y un amplio salón. Ideal para quienes buscan comodidad y estilo en una ubicación privilegiada.'
    },
    {
      id: 2,
      user: { avatar: 'https://example.com/avatar2.png', name: 'Depa completo metro Chapultpec' },
      price: 1500,
      address: '456 Elm St, City',
      amenities: ['pet friendly', 'estacionamiento'],
      created_at: new Date().toISOString(),
      description: 'Disfruta de vistas impresionantes desde este espacioso departamento, que cuenta con acabados de lujo y una excelente distribución. Perfecto para familias o profesionales.'
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: '100vh' }}>
      <Box sx={{ width: { xs: '100%', md: '40vw' }, bgcolor: 'primary.main', color: 'white', p: 2 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>RoomFi</Typography>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Preguntas de roomies</Typography>
          <Divider sx={{ my: 1 }} />
          {bookingRequests.map((request) => (
            <Box key={request.id} sx={{ mb: 2 }}>
              <Typography variant="body2"><b>{request.nombre}:</b> {request.inquiry}</Typography>
              <Typography variant="body2" color="text.secondary">{request.location}</Typography>
              <Link href="#" variant="body2">Responder</Link>
            </Box>
          ))}
        </Paper>
      </Box>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Buenas tardes 0x648A0...2dD6F</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">Rendimiento</Typography>
              <Typography variant="h4" color="primary">19%</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">Intereses generados</Typography>
              <Typography variant="h4" color="primary">$17,119.02 MXNB</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">Efectivo disponible</Typography>
              <Typography variant="h4" color="primary">$465.69 MXNB</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">Valor de tu cuenta</Typography>
              <Typography variant="h4" color="primary">$14,847.29 MXNB</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Performance</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body1"><b>Intereses generados</b> es la cantidad que has ganado por mantener tu dinero en la plataforma</Typography>
              <Typography variant="body1"><b>Efectivo disponible</b> es el dinero disponible para retiro inmediato a tu cuenta de banco</Typography>
              <Typography variant="body1"><b>Valor de tu cuenta</b> es el total de dinero que tienes en tu cuenta, incluyendo tus intereses generados y tu efectivo disponible</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">To-dos</Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button variant="contained" color="primary">Publicar nueva propiedad</Button>
                <Button variant="contained" color="primary" onClick={handleOpenWithdrawalModal}>
                  Retirar dinero via SPEI
                </Button>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={12}>
            <Paper sx={{ p: 2 }}> 
              <Typography variant="h6">Tus Propiedades</Typography>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={3}>
                {propertyData.map((property) => (
                  <Grid item xs={12} md={6} key={property.id} sx={{ width: { xs: '100%', md: '35vw' } }}>
                    <Card sx={{ borderRadius: 4, boxShadow: 'none', border: '1px solid #e0e0e0', mb: 2, cursor: 'pointer', '&:hover': { boxShadow: 4, borderColor: 'primary.main' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 0 }}>
                        <Typography fontWeight={700}>{property.user.name}</Typography>
                      </Box>
                      <CardMedia component="img" height="120" image="https://images.unsplash.com/photo-1571896349842-33c89424de2d" alt={property.address} sx={{ objectFit: 'cover', borderRadius: 2, m: 2, mb: 0 }} />
                      <CardContent sx={{ p: 2 }}>
                      <Chip label={`3 ROOMIES`} color="primary" size="small" sx={{ fontWeight: 700 }} />
                        <Typography variant="h6" fontWeight={800} gutterBottom>${property.price.toLocaleString()}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{property.address}</Typography>
                        {property.amenities && property.amenities.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {property.amenities.slice(0, 4).map((amenity: any, idx: any) => (
                                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {renderAmenityIcon(amenity)}
                                </Box>
                              ))}
                            </Box>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              sx={{ width: { xs: '100%', sm: 'auto' }, fontSize: { xs: '0.75rem', sm: '1rem' }, py: 1.1, px: 2.5 }}
                            >
                              Editar Propiedad
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      <Modal open={showWithdrawalModal} onClose={handleCloseWithdrawalModal} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper sx={{ p: 4, borderRadius: 2, maxWidth: 400, width: '100%' }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Retiro de Dinero</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Para retirar dinero, por favor sigue las instrucciones para realizar una transferencia SPEI.
          </Typography>
          <Button variant="contained" fullWidth onClick={handleCloseWithdrawalModal} sx={{ mt: 2 }}>Cerrar</Button>
        </Paper>
      </Modal>
    </Box>
  );
};

export default DashboardPage;