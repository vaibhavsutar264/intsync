import { useState, useEffect, useRef, useCallback } from 'react';

// Detect Electron environment
const isElectron =
  typeof window !== 'undefined' &&
  navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 1. Initialize Web Speech API if in Browser (not Electron)
  useEffect(() => {
    if (isElectron) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(
        'Web Speech API is not supported in this browser. Please use Google Chrome or Microsoft Edge.'
      );
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
      setAudioBlob(null);
    };

    rec.onresult = (event) => {
      let finalSpeech = '';
      let interimSpeech = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalSpeech += event.results[i][0].transcript + ' ';
        } else {
          interimSpeech += event.results[i][0].transcript;
        }
      }

      if (finalSpeech) {
        setTranscript((prev) => prev + finalSpeech);
      }
      setInterimTranscript(interimSpeech);
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'no-speech') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // 2. Start Listening (supports both webkitSpeechRecognition and MediaRecorder)
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setAudioBlob(null);
    audioChunksRef.current = [];

    if (isElectron) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Find a supported mime type
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          setAudioBlob(blob);
          setTranscript('[Voice Recording Captured]');
          setIsListening(false);

          // Stop all audio tracks to release microphone hardware
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(200); // chunk every 200ms
        setIsListening(true);
      } catch (err) {
        console.error('Failed to get media recorder stream:', err);
        setError(`Microphone access error: ${err.message}`);
      }
    } else {
      if (!recognitionRef.current) return;
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
        setError(`Failed to start speech recognition: ${err.message}`);
      }
    }
  }, []);

  // 3. Stop Listening
  const stopListening = useCallback(() => {
    if (isElectron) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setAudioBlob(null);
    audioChunksRef.current = [];
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    audioBlob,
    startListening,
    stopListening,
    clearTranscript,
    isSupported: isElectron ? true : !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    isElectron,
  };
};
