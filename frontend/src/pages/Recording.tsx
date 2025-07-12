import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { InteractionTracker, InteractionEvent } from '../utils/interactionTracker';
import { ClickOverlay, ClickCapture } from '../utils/clickOverlay';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  videoBlob: Blob | null;
  audioBlob: Blob | null;
  interactionEvents: InteractionEvent[];
  clickCaptures: ClickCapture[];
}

const Recording: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scenario = searchParams.get('scenario') || 'general';
  
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    videoBlob: null,
    audioBlob: null,
    interactionEvents: [],
    clickCaptures: [],
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const interactionTrackerRef = useRef<InteractionTracker | null>(null);
  const clickOverlayRef = useRef<ClickOverlay | null>(null);

  const scenarioDetails: Record<string, any> = {
    electronics: {
      title: 'Electronics Shopping',
      task: 'Shop for a laptop or smartphone under $1000',
      suggestions: [
        'Compare at least 3 different products',
        'Read customer reviews',
        'Check technical specifications',
        'Compare prices across different sites',
        'Consider warranty and return policies'
      ]
    },
    clothing: {
      title: 'Fashion Shopping',
      task: 'Browse and select clothing for a specific occasion',
      suggestions: [
        'Think about the occasion and style needed',
        'Check size charts and measurements',
        'Look at customer photos and reviews',
        'Consider material and care instructions',
        'Compare prices and shipping options'
      ]
    },
    home: {
      title: 'Home & Garden Shopping',
      task: 'Look for home improvement or furniture items',
      suggestions: [
        'Measure your space and check dimensions',
        'Read assembly and installation requirements',
        'Compare materials and quality',
        'Check delivery options and timeframes',
        'Look for customer setup photos'
      ]
    }
  };

  const currentScenario = scenarioDetails[scenario] || scenarioDetails.electronics;

  useEffect(() => {
    // Initialize interaction tracker
    interactionTrackerRef.current = new InteractionTracker();
    
    // Initialize click overlay with real-time update callback
    clickOverlayRef.current = new ClickOverlay((click) => {
      setRecordingState(prev => ({
        ...prev,
        clickCaptures: [...prev.clickCaptures, click]
      }));
    });
    
    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (clickOverlayRef.current) {
        clickOverlayRef.current.stop();
      }
      stopAllStreams();
    };
  }, []);

  const stopAllStreams = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      // Get screen recording permission
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true // Include system audio if available
      });

      // Get microphone audio
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      screenStreamRef.current = screenStream;
      audioStreamRef.current = audioStream;

      // Set up screen recording
      const mediaRecorder = new MediaRecorder(screenStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      // Set up audio recording  
      const audioRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordingState(prev => ({ ...prev, videoBlob }));
      };

      audioRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordingState(prev => ({ ...prev, audioBlob }));
      };

      // Handle screen share stopping
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopRecording();
      });

      mediaRecorderRef.current = mediaRecorder;
      audioRecorderRef.current = audioRecorder;

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      audioRecorder.start(1000);

      // Start interaction tracking
      if (interactionTrackerRef.current) {
        interactionTrackerRef.current.start();
      }

      // Start click overlay tracking
      if (clickOverlayRef.current) {
        clickOverlayRef.current.start();
      }

      setRecordingState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isPaused: false,
        recordingTime: 0,
        clickCaptures: [] // Reset click captures for new session
      }));

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingState(prev => ({ 
          ...prev, 
          recordingTime: prev.recordingTime + 1 
        }));
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please make sure you grant screen sharing permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && audioRecorderRef.current) {
      if (recordingState.isPaused) {
        mediaRecorderRef.current.resume();
        audioRecorderRef.current.resume();
        timerRef.current = window.setInterval(() => {
          setRecordingState(prev => ({ 
            ...prev, 
            recordingTime: prev.recordingTime + 1 
          }));
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        audioRecorderRef.current.pause();
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
        }
      }
      
      setRecordingState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
    }
    
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    // Stop interaction tracking and collect events
    let interactionEvents: InteractionEvent[] = [];
    if (interactionTrackerRef.current) {
      interactionEvents = interactionTrackerRef.current.stop();
    }

    // Stop click overlay and collect clicks
    let clickCaptures: ClickCapture[] = [];
    if (clickOverlayRef.current) {
      clickCaptures = clickOverlayRef.current.stop();
    }

    setRecordingState(prev => ({ 
      ...prev, 
      isRecording: false, 
      isPaused: false,
      interactionEvents,
      clickCaptures 
    }));

    stopAllStreams();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishSession = () => {
    if (recordingState.isRecording) {
      stopRecording();
    }
    
    // Navigate to review page with recorded data
    navigate('/session-review', { 
      state: { 
        scenario,
        videoBlob: recordingState.videoBlob,
        audioBlob: recordingState.audioBlob,
        duration: recordingState.recordingTime,
        interactionEvents: recordingState.interactionEvents,
        clickCaptures: recordingState.clickCaptures
      }
    });
  };

  return (
    <Layout title="Recording Session - CodeSight Research">
      <div className="max-w-4xl mx-auto">
        {/* Session Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {currentScenario.title}
              </h2>
              <p className="text-gray-600 mb-4">
                <strong>Your Task:</strong> {currentScenario.task}
              </p>
            </div>
            
            {/* Recording Status */}
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                recordingState.isRecording
                  ? recordingState.isPaused
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {recordingState.isRecording ? (
                  <>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      recordingState.isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                    }`} />
                    {recordingState.isPaused ? 'PAUSED' : 'RECORDING'}
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                    READY
                  </>
                )}
              </div>
              <div className="text-2xl font-mono font-bold text-gray-900 mt-2">
                {formatTime(recordingState.recordingTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                🎯 Shopping Guidelines
              </h3>
              <ul className="space-y-2 text-blue-800">
                {currentScenario.suggestions.map((suggestion: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">
                🎤 Recording Tips
              </h3>
              <ul className="space-y-2 text-green-800 text-sm">
                <li>• Speak your thoughts out loud</li>
                <li>• Explain what you're looking for</li>
                <li>• Share why you like/dislike options</li>
                <li>• Mention price concerns</li>
                <li>• Describe your decision process</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center gap-4">
            {!recordingState.isRecording ? (
              <button
                onClick={startRecording}
                className="bg-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <div className="w-4 h-4 bg-white rounded-full"></div>
                Start Recording
              </button>
            ) : (
              <>
                <button
                  onClick={pauseRecording}
                  className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
                >
                  {recordingState.isPaused ? '▶️ Resume' : '⏸️ Pause'}
                </button>
                
                <button
                  onClick={stopRecording}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  ⏹️ Stop
                </button>
              </>
            )}
            
            <button
              onClick={handleFinishSession}
              disabled={recordingState.isRecording && !recordingState.isPaused}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Finish Session
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center text-gray-600">
            {!recordingState.isRecording ? (
              <p>Click "Start Recording" to begin screen capture and audio recording. You'll need to grant screen sharing permissions.</p>
            ) : (
              <p>Your screen and microphone are being recorded. Navigate to shopping websites and narrate your thoughts as you browse.</p>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        {recordingState.recordingTime > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Session Progress</span>
              <span>{formatTime(recordingState.recordingTime)} / ~20-30 minutes</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((recordingState.recordingTime / 1800) * 100, 100)}%` }}
              />
            </div>
            
            {/* Interaction Tracking Status */}
            {recordingState.isRecording && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-red-600">
                    {recordingState.clickCaptures.length}
                  </div>
                  <div className="text-gray-600">Screen Clicks</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">
                    {interactionTrackerRef.current?.getEventsSummary().clicks || 0}
                  </div>
                  <div className="text-gray-600">App Clicks</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">
                    {interactionTrackerRef.current?.getEventsSummary().scrolls || 0}
                  </div>
                  <div className="text-gray-600">Scrolls</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-purple-600">
                    {interactionTrackerRef.current?.getEventsSummary().inputs || 0}
                  </div>
                  <div className="text-gray-600">Inputs</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">
                    {recordingState.clickCaptures.length + (interactionTrackerRef.current?.getEventsSummary().totalEvents || 0)}
                  </div>
                  <div className="text-gray-600">Total Events</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Recording;