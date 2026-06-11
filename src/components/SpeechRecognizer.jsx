import React from 'react';
import { Box, Button, Stack } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import ListeningIndicator from './ListeningIndicator';

/**
 * SpeechRecognizer Component
 * Provides buttons to start and stop speech recognition.
 * 
 * @param {boolean} isListening - Speech recognition listening state.
 * @param {Function} startListening - Callback to start speech.
 * @param {Function} stopListening - Callback to stop speech.
 * @param {string} error - Speech recognition error.
 * @param {boolean} isSupported - Whether speech recognition is supported.
 */
const SpeechRecognizer = ({
  isListening,
  startListening,
  stopListening,
  error,
  isSupported,
}) => {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      sx={{
        padding: 2,
        borderRadius: 3,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <Box sx={{ alignSelf: { xs: 'center', sm: 'auto' } }}>
        <ListeningIndicator
          isListening={isListening}
          error={error}
          isSupported={isSupported}
        />
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<MicIcon />}
          onClick={startListening}
          disabled={isListening || !isSupported}
          fullWidth={{ xs: true, sm: false }}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            padding: '10px 22px',
            backgroundColor: '#3b82f6',
            boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: '#2563eb',
              boxShadow: '0 6px 20px 0 rgba(59, 130, 246, 0.4)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(1px)',
            },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              color: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          Start Coaching
        </Button>

        <Button
          variant="outlined"
          color="error"
          startIcon={<StopIcon />}
          onClick={stopListening}
          disabled={!isListening}
          fullWidth={{ xs: true, sm: false }}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            padding: '10px 22px',
            borderWidth: '1.5px',
            borderColor: '#ef4444',
            color: '#ef4444',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: '#dc2626',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderWidth: '1.5px',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(1px)',
            },
            '&.Mui-disabled': {
              borderColor: 'rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          Stop
        </Button>
      </Stack>
    </Stack>
  );
};

export default SpeechRecognizer;
