// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

afterEach(function () {
    if (this.currentTest?.state !== 'failed') return;
  
    const testTitle = this.currentTest?.titlePath?.().join(' > ') || this.currentTest?.title;
    const specPath = Cypress.spec?.relative;
  
    cy.url().then((url) => {
      cy.document().then((doc) => {
        const dom = doc.documentElement.outerHTML.slice(0, 120000); // truncar
        // Escribe una línea JSON con todo el contexto
        return cy.task('saveContext', { specPath, testTitle, url, dom });
      });
    });
  });