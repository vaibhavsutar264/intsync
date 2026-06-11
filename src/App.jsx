import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import Dashboard from './pages/Dashboard';

// Define the custom dark theme with a premium aesthetic
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6', // Premium Indigo/Blue
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#a855f7', // Vivid Purple/Violet
      light: '#c084fc',
      dark: '#7e22ce',
    },
    error: {
      main: '#ef4444', // Crimson/Red
    },
    success: {
      main: '#10b981', // Emerald/Green
    },
    background: {
      default: '#070a13', // Ultra-deep dark blue-black
      paper: '#0f172a', // Sleek slate-900
    },
    text: {
      primary: '#f8fafc', // Off-white
      secondary: '#94a3b8', // Cool grey
    },
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "system-ui", "sans-serif"',
    h3: {
      fontWeight: 900,
      letterSpacing: '-1px',
    },
    h6: {
      fontWeight: 700,
      letterSpacing: '-0.2px',
    },
    body1: {
      letterSpacing: '0.1px',
    },
    body2: {
      letterSpacing: '0.1px',
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.2px',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
          background-color: transparent !important;
        }
        /* Custom scrollbar styling for Chrome, Safari, and Opera */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 8px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.08) 0%, rgba(0, 0, 0, 0) 45%), radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.08) 0%, rgba(0, 0, 0, 0) 50%)',
          backgroundColor: 'transparent',
        }}
      >
        <Dashboard />
      </Box>
    </ThemeProvider>
  );
}

export default App;
