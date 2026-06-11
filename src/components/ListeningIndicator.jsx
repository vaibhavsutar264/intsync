import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { keyframes } from '@mui/system';

// Pulsing animation for the listening indicator
const pulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6);
  }
  70% {
    transform: scale(1.15);
    box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
`;

/**
 * ListeningIndicator Component
 * @param {boolean} isListening - Whether the speech recognition is active.
 * @param {string} [error] - Error message if speech recognition failed.
 * @param {boolean} [isSupported] - Whether speech recognition is supported.
 */
const ListeningIndicator = ({ isListening, error, isSupported = true, compact = false }) => {
  let statusText = 'Mic Idle';
  let badgeColor = 'rgba(148, 163, 184, 0.2)'; // Slate
  let icon = <MicOffIcon sx={{ color: '#94a3b8', fontSize: compact ? 16 : 20 }} />;
  let animation = 'none';

  if (!isSupported) {
    statusText = 'Speech API Not Supported';
    badgeColor = 'rgba(239, 68, 68, 0.1)';
    icon = <ErrorOutlineIcon sx={{ color: '#ef4444', fontSize: compact ? 16 : 20 }} />;
  } else if (error) {
    statusText = 'Mic Error';
    badgeColor = 'rgba(245, 158, 11, 0.15)'; // Amber
    icon = <ErrorOutlineIcon sx={{ color: '#f59e0b', fontSize: compact ? 16 : 20 }} />;
  } else if (isListening) {
    statusText = 'Listening...';
    badgeColor = 'rgba(239, 68, 68, 0.2)'; // Crimson
    icon = <MicIcon sx={{ color: '#ef4444', fontSize: compact ? 16 : 20 }} />;
    animation = `${pulse} 1.8s infinite ease-in-out`;
  }

  return (
    <Tooltip title={error ? error : statusText} arrow>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 1 : 1.5,
          padding: compact ? '2px 8px' : '6px 14px',
          borderRadius: '24px',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          width: 'fit-content',
          transition: 'all 0.3s ease',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: compact ? 22 : 32,
            height: compact ? 22 : 32,
            borderRadius: '50%',
            backgroundColor: badgeColor,
            animation: animation,
            transition: 'all 0.3s ease',
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: compact ? '0.75rem' : '0.85rem',
            letterSpacing: '0.5px',
            color: isListening ? '#ef4444' : error ? '#f59e0b' : '#94a3b8',
            transition: 'all 0.3s ease',
          }}
        >
          {statusText}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default ListeningIndicator;
