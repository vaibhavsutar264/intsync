import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Collapse,
  IconButton,
  Tooltip,
  Divider,
  Skeleton,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import SendIcon from '@mui/icons-material/Send';
import MinimizeIcon from '@mui/icons-material/Minimize';

import ListeningIndicator from '../components/ListeningIndicator';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import {
  generateInterviewResponse,
  generateInterviewResponseFromAudio,
} from '../services/geminiService';

const Dashboard = () => {
  const speech = useSpeechRecognition();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // App states
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [isEditing, setIsEditing] = useState(true);

  // Load custom API key fallback from localStorage (or VITE_GEMINI_API_KEY env)
  const customApiKey = localStorage.getItem('user_gemini_api_key') || '';
  const isEnvKeyConfigured = !!import.meta.env.VITE_GEMINI_API_KEY;
  const isApiReady = isEnvKeyConfigured || !!customApiKey;

  // Sync speech transcript into question textbox (Browser mode)
  useEffect(() => {
    if (speech.transcript && !speech.isElectron) {
      setQuestion(speech.transcript.trim());
    }
  }, [speech.transcript, speech.isElectron]);

  // Submit question to Gemini service (supports raw text or audio blobs)
  const handleSubmitQuestion = async (questionText, audioBlob = null) => {
    const activeAudioBlob =
      questionText === '[Voice Recording Captured]'
        ? audioBlob || speech.audioBlob
        : null;

    setLoading(true);
    setApiError(null);
    setAiResponse(null); // Erase previous answer ONLY upon submit!
    setIsEditing(false); // Hide the input
    try {
      let response;
      if (activeAudioBlob) {
        response = await generateInterviewResponseFromAudio(
          activeAudioBlob,
          customApiKey
        );
        if (response.detectedQuestion) {
          setQuestion(response.detectedQuestion);
        }
      } else {
        response = await generateInterviewResponse(questionText, customApiKey);
      }
      setAiResponse(response);
    } catch (err) {
      console.error(err);
      setApiError(err.message || 'An unexpected error occurred.');
      setIsEditing(true); // Re-show input on error so user can retry/edit
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    speech.clearTranscript();
    setQuestion('');
    setAiResponse(null);
    setApiError(null);
    setIsEditing(true); // Re-show input on clear
  };

  const handleManualSubmit = () => {
    if (question.trim()) {
      handleSubmitQuestion(question.trim());
    }
  };

  const handleKeyDownInput = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleManualSubmit();
    }
  };

  // 1. Global Spacebar keydown listener to toggle microphone
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ignore keydown if user is currently typing in an input, textarea, or contentEditable
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault(); // Prevent page scrolling
        if (speech.isListening) {
          speech.stopListening();
        } else if (speech.isSupported) {
          // Reset voice transcript and input but keep previous answer visible during record
          speech.clearTranscript();
          setQuestion('');
          setApiError(null);
          setIsEditing(true); // Show input to display transcription
          speech.startListening();
        }
      } else if (e.key === 'Escape') {
        handleClear(); // Reset previous QA completely
      } else if (!isEditing && e.key.length === 1 && /^[a-zA-Z0-9\s]$/.test(e.key)) {
        // Show input and start typing, keeping previous answer visible
        setIsEditing(true);
        setQuestion(e.key);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    speech.isListening,
    speech.startListening,
    speech.stopListening,
    speech.isSupported,
    isEditing,
  ]);

  // Focus text field automatically when it mounts/shows
  useEffect(() => {
    if (isEditing && question && inputRef.current) {
      const focusTimeout = setTimeout(() => {
        if (inputRef.current) {
          const inputEl = inputRef.current.querySelector('input');
          if (inputEl) {
            inputEl.focus();
            // Move cursor to the end of the input text
            inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
          }
        }
      }, 50);
      return () => clearTimeout(focusTimeout);
    }
  }, [isEditing, question]);

  // Dynamic window resizing for Electron to match content dimensions perfectly
  useEffect(() => {
    if (!window.electronAPI || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Container has px: 2 (16px left + 16px right = 32px padding)
        // Container has pt: 0, pb: 4 (32px bottom padding). Add 4px extra height as a safety margin
        const paddingWidth = 32;
        const paddingHeight = 36; 

        const finalWidth = Math.ceil(width + paddingWidth);
        const finalHeight = Math.ceil(height + paddingHeight);

        window.electronAPI.resizeWindow(finalWidth, finalHeight);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [aiResponse, loading, apiError]);

  // 2. Silence auto-submit timer (stops mic, which triggers submission below)
  useEffect(() => {
    if (!speech.isListening || !speech.transcript.trim()) return;

    const silenceTimer = setTimeout(() => {
      speech.stopListening();
    }, 1500);

    return () => clearTimeout(silenceTimer);
  }, [speech.transcript, speech.isListening, speech.stopListening]);

  // 3. Centralized auto-submit transition watcher (fires when mic turns off)
  const prevIsListening = useRef(false);
  useEffect(() => {
    // Transition from true (recording) to false (stopped)
    if (prevIsListening.current && !speech.isListening) {
      if (speech.audioBlob) {
        // Electron mode
        handleSubmitQuestion('[Voice Recording Captured]', speech.audioBlob);
      } else if (speech.transcript.trim()) {
        // Browser mode
        handleSubmitQuestion(speech.transcript.trim());
      }
    }
    prevIsListening.current = speech.isListening;
  }, [speech.isListening, speech.transcript, speech.audioBlob]);

  // Set live transcription display message
  let liveTranscript = speech.transcript.trim();
  if (speech.transcript === '[Voice Recording Captured]') {
    liveTranscript = 'Voice captured. Sending to Gemini...';
  } else if (speech.interimTranscript) {
    liveTranscript = (speech.transcript + speech.interimTranscript).trim();
  }

  return (
    <Container
      ref={containerRef}
      maxWidth="sm"
      sx={{
        pt: 0, // Push layout to the absolute top
        pb: 4,
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: 'auto', // Adjust height to wrap contents naturally
        maxWidth: '550px !important', // Constrain width for eye contact
      }}
    >
      {/* Unified Mic Control & Question Input Card */}
      <Card
        sx={{
          width: '100%',
          backgroundColor: 'rgba(30, 41, 59, 0.15)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          mb: 0, // Touch the answers card below
          p: 1.5,
          '&:last-child': { pb: 1.5 },
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          '-webkit-app-region': 'drag', // Allow dragging the frameless window
        }}
      >
        {/* Mic Control & Status Row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            width: '100%',
          }}
        >
          <ListeningIndicator
            isListening={speech.isListening}
            error={speech.error}
            isSupported={speech.isSupported}
            compact={true}
          />

          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, fontSize: '0.725rem' }}>
            {speech.isListening ? 'SPACE to stop' : 'SPACE to speak'}
          </Typography>

          <Stack direction="row" spacing={0.5} sx={{ '-webkit-app-region': 'no-drag' }}>
            <IconButton
              size="small"
              onClick={() => {
                speech.clearTranscript();
                setQuestion('');
                setApiError(null);
                setIsEditing(true);
                speech.startListening();
              }}
              disabled={speech.isListening || !isApiReady}
              sx={{
                p: 0.25, // Extra small padding
                color: '#fff',
                backgroundColor: '#3b82f6',
                '&:hover': { backgroundColor: '#2563eb' },
                '&:disabled': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              <MicIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={speech.stopListening}
              disabled={!speech.isListening}
              sx={{
                p: 0.25, // Extra small padding
                color: '#fff',
                backgroundColor: '#ef4444',
                '&:hover': { backgroundColor: '#dc2626' },
                '&:disabled': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              <StopIcon sx={{ fontSize: 16 }} />
            </IconButton>
            
            {/* Minimize Window Button (Electron Only) */}
            {window.electronAPI && (
              <IconButton
                size="small"
                onClick={() => window.electronAPI.minimizeWindow()}
                sx={{
                  p: 0.25, // Extra small padding
                  color: '#94a3b8',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#fff' },
                  ml: 0.5,
                }}
              >
                <MinimizeIcon sx={{ fontSize: 16, transform: 'translateY(-2px)' }} />
              </IconButton>
            )}
          </Stack>
        </Box>

        {/* Question Input Field (Hidden when not editing/typing) */}
        {isEditing && (
          <TextField
            ref={inputRef}
            fullWidth
            size="small"
            value={speech.isListening && liveTranscript ? liveTranscript : question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDownInput}
            placeholder={
              speech.isListening
                ? speech.isElectron
                  ? 'Recording audio... Speak your question now.'
                  : 'Speaking... live transcript generating.'
                : 'Type or speak a question here...'
            }
            disabled={speech.isListening}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {(question || liveTranscript) && (
                    <Tooltip title="Clear Input">
                      <IconButton onClick={handleClear} size="small" sx={{ color: '#64748b', '&:hover': { color: '#ef4444' } }}>
                        <ClearAllIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {question.trim() && !speech.isListening && (
                    <Tooltip title="Submit">
                      <IconButton
                        onClick={handleManualSubmit}
                        disabled={loading}
                        size="small"
                        sx={{
                          color: '#a855f7',
                          ml: 0.5,
                          backgroundColor: 'rgba(168, 85, 247, 0.12)',
                          '&:hover': { backgroundColor: 'rgba(168, 85, 247, 0.22)' },
                        }}
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </InputAdornment>
              ),
            }}
            sx={{
              '-webkit-app-region': 'no-drag', // Prevent dragging from within the text field
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '0.9rem',
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.08)' },
                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
            }}
          />
        )}
      </Card>

      {/* 2. Sample Answer Card (Centered Teleprompter display) */}
      <Card
        sx={{
          width: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.25)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderTop: 'none', // Seamless merge with top card
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
          position: 'relative',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {loading ? (
            <Box display="flex" flexDirection="column" gap={1.5} py={2}>
              <Skeleton variant="text" width="95%" height={26} sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
              <Skeleton variant="text" width="90%" height={26} sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
              <Skeleton variant="text" width="95%" height={26} sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
              <Skeleton variant="text" width="70%" height={26} sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
            </Box>
          ) : aiResponse ? (
            <Stack spacing={2} sx={{ py: 1, px: 0.5 }}>
              {aiResponse.isCodeOnly ? (
                /* Code Only Display */
                <Box
                  component="pre"
                  sx={{
                    margin: 0,
                    padding: 2,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    overflowX: 'auto',
                    fontFamily: '"Fira Code", "Courier New", Courier, monospace',
                    fontSize: '0.875rem',
                    color: '#f8fafc',
                    lineHeight: 1.5,
                    textAlign: 'left',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  <code>{aiResponse.codeBlock}</code>
                </Box>
              ) : (
                /* Regular Explanation & 5 Key Points Display */
                <>
                  {/* 1. Explanation (No Header) */}
                  {aiResponse.explanation && (
                    <Typography
                      variant="h6"
                      sx={{
                        color: '#f8fafc',
                        lineHeight: 1.7,
                        fontWeight: 500,
                        fontSize: { xs: '1.05rem', sm: '1.15rem' },
                        textAlign: 'justify',
                        textJustify: 'inter-word',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                      }}
                    >
                      {aiResponse.explanation}
                    </Typography>
                  )}

                  {/* Divider between Explanation and Key Points */}
                  {aiResponse.explanation && aiResponse.keyPoints && aiResponse.keyPoints.length > 0 && (
                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
                  )}

                  {/* 2. Key Talking Points (No Header, 5 points) */}
                  {aiResponse.keyPoints && aiResponse.keyPoints.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1' }}>
                      {aiResponse.keyPoints.map((point, index) => (
                        <li key={index} style={{ marginBottom: '8px' }}>
                          <Typography
                            variant="body1"
                            component="span"
                            sx={{
                              color: '#e2e8f0',
                              fontSize: { xs: '0.9rem', sm: '0.95rem' },
                              lineHeight: 1.6,
                            }}
                          >
                            {point}
                          </Typography>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Stack>
          ) : (
            <Box sx={{ py: 6, textAlign: 'center', color: '#64748b' }}>
              {speech.isListening ? (
                <Typography variant="body1" sx={{ fontStyle: 'italic', color: '#e2e8f0' }}>
                  Listening... Speak your question now.
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ fontStyle: 'italic', px: 2 }}>
                  Press the <strong>SPACEBAR</strong> to speak, and press it again when finished.
                  Your explanation and key talking points will generate directly here.
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Errors (from API calls) */}
      <Collapse in={!!apiError} sx={{ width: '100%', mt: 2 }}>
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setApiError(null)}
          sx={{ borderRadius: 3 }}
        >
          {apiError}
        </Alert>
      </Collapse>

      {/* Warning if no key configured */}
      {!isApiReady && (
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 3, width: '100%' }}>
          Gemini API Key is missing. Set VITE_GEMINI_API_KEY environment variable.
        </Alert>
      )}

    </Container>
  );
};

// Help helper to import InputAdornment locally inside file
import { InputAdornment } from '@mui/material';

export default Dashboard;
