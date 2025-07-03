import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import App from './App';
import { MemoryRouter } from 'react-router-dom';

// Mockear ethers para evitar llamadas reales a la blockchain
const mockBalanceOf = jest.fn();
const mockMintForSelf = jest.fn();
  const mockGetTenantInfo = jest.fn();

  // Mockear fetchTokenBalance para evitar el error de ENS en las pruebas
  const mockFetchTokenBalance = jest.fn().mockResolvedValue(undefined);

jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  JsonRpcProvider: jest.fn(() => ({
    getSigner: jest.fn(() => ({
      getAddress: jest.fn(() => '0xMockAccountAddress'),
    })),
  })),
  BrowserProvider: jest.fn(() => ({
    getSigner: jest.fn(() => ({
      getAddress: jest.fn(() => '0xMockAccountAddress'),
    })),
  })),
  Contract: jest.fn(() => ({
    balanceOf: mockBalanceOf,
    mintForSelf: mockMintForSelf,
    getTenantInfo: mockGetTenantInfo,
  })),
  Wallet: {
    createRandom: jest.fn(() => ({
      address: '0xMockVirtualWalletAddress',
      privateKey: '0xmockprivatekey',
      connect: jest.fn(() => ({})),
    })),
    id: jest.fn(() => '0xmockprivatekeyfromemail'),
  },
}));

// Mockear NETWORK_CONFIG para asegurar que siempre apunte a una red de prueba
jest.mock('./web3/config', () => ({
  TENANT_PASSPORT_ABI: [],
  TENANT_PASSPORT_ADDRESS: '0xMockTenantPassportAddress',
  NETWORK_CONFIG: {
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
  },
}));

// Mockear useGoogleLogin para controlar el flujo de inicio de sesión de Google
jest.mock('@react-oauth/google', () => ({
  useGoogleLogin: jest.fn(() => jest.fn()),
}));

// Mockear useNavigate para evitar errores de enrutamiento en las pruebas
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(() => jest.fn()),
}));

describe('Web3 Interactions in App Component', () => {
  beforeEach(() => {
    // Limpiar mocks antes de cada prueba
    jest.clearAllMocks();
    // Simular que window.ethereum existe para las pruebas de MetaMask
    Object.defineProperty(window, 'ethereum', {
      writable: true,
      value: {
        request: jest.fn(() => Promise.resolve(['0xMockMetaMaskAddress'])),
      },
    });
  });

  const renderApp = () => render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  test('should connect with MetaMask and show account', async () => {
    renderApp();

    // Simular clic en el botón Conectar
    fireEvent.click(screen.getByRole('button', { name: /Conectar/i }));

    // Simular clic en Conectar con MetaMask
    fireEvent.click(screen.getByRole('button', { name: /Conectar con MetaMask/i }));

    // Esperar a que la cuenta se muestre
    await waitFor(() => {
      expect(screen.getByText(/0xMock.*Address/i)).toBeInTheDocument();
    });
  });

  test('should attempt to mint Tenant Passport if not found when clicking "Ver mi NFT"', async () => {
    // Simular que el usuario no tiene un Tenant Passport
    mockBalanceOf.mockResolvedValueOnce(BigInt(0));
    mockMintForSelf.mockResolvedValueOnce({ wait: jest.fn().mockResolvedValueOnce({}) });
    mockGetTenantInfo.mockResolvedValueOnce({
      reputation: 100,
      paymentsMade: 0,
      paymentsMissed: 0,
      outstandingBalance: 0,
    });

    renderApp();

    // Simular conexión de cuenta (necesario para que el botón "Ver mi NFT" aparezca)
    fireEvent.click(screen.getByRole('button', { name: /Conectar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Conectar con MetaMask/i }));
    await waitFor(() => {
      expect(screen.getByText(/0xMock.*Address/i)).toBeInTheDocument();
    });

    // Simular clic en el botón "Ver mi NFT"
    fireEvent.click(screen.getByRole('button', { name: /Ver mi NFT/i }));

    // Esperar a que se llame a mintForSelf y se muestre el modal
    await waitFor(() => {
      expect(mockMintForSelf).toHaveBeenCalled();
      expect(screen.getByText(/Tu Tenant Passport/i)).toBeInTheDocument();
      expect(screen.getByText(/Reputación: 100%/i)).toBeInTheDocument();
    });
  });

  test('should fetch Tenant Passport if already exists when clicking "Ver mi NFT"', async () => {
    // Simular que el usuario ya tiene un Tenant Passport
    mockBalanceOf.mockResolvedValueOnce(BigInt(1)); // Balance > 0
    mockGetTenantInfo.mockResolvedValueOnce({
      reputation: 90,
      paymentsMade: 5,
      paymentsMissed: 1,
      outstandingBalance: 50,
    });

    renderApp();

    // Simular conexión de cuenta
    fireEvent.click(screen.getByRole('button', { name: /Conectar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Conectar con MetaMask/i }));
    await waitFor(() => {
      expect(screen.getByText(/0xMock.*Address/i)).toBeInTheDocument();
    });

    // Simular clic en el botón "Ver mi NFT"
    fireEvent.click(screen.getByRole('button', { name: /Ver mi NFT/i }));

    // Esperar a que no se llame a mintForSelf y se muestre el modal con los datos existentes
    await waitFor(() => {
      expect(mockMintForSelf).not.toHaveBeenCalled();
      expect(screen.getByText(/Tu Tenant Passport/i)).toBeInTheDocument();
      expect(screen.getByText(/Reputación: 90%/i)).toBeInTheDocument();
      expect(screen.getByText(/Pagos realizados: 5/i)).toBeInTheDocument();
    });
  });
});
