describe('Onboarding Flow', () => {
  it('should display Google SSO login option', () => {
    // Visit the homepage of the application
    cy.visit('https://roomfi.netlify.app');

    // Click on the "Conectar" button to open the onboarding modal
    cy.contains('button', 'Conectar').click();

    // Verify that the Google SSO login button is visible
    cy.contains('link', 'Iniciar sesión con Google').should('exist');
  });

  it('should display all amenity options with icons', () => {
    cy.visit('https://roomfi.netlify.app');

    // Abrir el dropdown de amenidades
    cy.get('#amenidad-select').click();

    const opciones = [
      'Amueblado',
      'Baño privado',
      'Pet friendly',
      'Estacionamiento',
      'Alberca'
    ];

    opciones.forEach((texto) => {
      cy.contains('li', texto)
        .should('exist')
        .find('svg')
        .should('exist');
    });

    // Cerrar el dropdown haciendo click fuera
    cy.get('body').click(0, 0);
  });

});

