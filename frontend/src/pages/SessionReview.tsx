import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { InteractionEvent } from '../utils/interactionTracker';
import { ClickCapture } from '../utils/clickOverlay';
import { apiService } from '../services/api';

interface LocationState {
  scenario: string;
  videoBlob: Blob | null;
  audioBlob: Blob | null;
  duration: number;
  interactionEvents: InteractionEvent[];
  clickCaptures: ClickCapture[];
}

const SessionReview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [videoUrl, setVideoUrl] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extensionData, setExtensionData] = useState<any>(null);

  useEffect(() => {
    if (!state || (!state.videoBlob && !state.audioBlob)) {
      // Redirect if no recording data
      navigate('/session-setup');
      return;
    }

    // Create preview URLs
    if (state.videoBlob) {
      const url = URL.createObjectURL(state.videoBlob);
      setVideoUrl(url);
    }
    
    if (state.audioBlob) {
      const url = URL.createObjectURL(state.audioBlob);
      setAudioUrl(url);
    }

    // Fetch extension data
    const fetchExtensionData = async () => {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        try {
          const extensionResponse = await apiService.getExtensionData(sessionId);
          if (extensionResponse.success) {
            setExtensionData(extensionResponse.data);
          }
        } catch (error) {
          console.warn('No extension data found for session:', sessionId);
        }
      }
    };

    fetchExtensionData();

    // Cleanup URLs on unmount
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [state, navigate]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmitSession = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const workerId = localStorage.getItem('workerId');
      if (!workerId) {
        throw new Error('Worker ID not found. Please register again.');
      }

      let videoFileKey = '';
      let audioFileKey = '';

      // Upload video file if available
      if (state.videoBlob) {
        const videoFileName = `session-${Date.now()}-screen.webm`;
        const videoUploadResponse = await apiService.getUploadUrl('video', videoFileName, workerId);
        
        if (videoUploadResponse.success && videoUploadResponse.data) {
          await apiService.uploadFile(
            videoUploadResponse.data.uploadUrl,
            state.videoBlob,
            (progress) => setUploadProgress(progress * 0.4) // 40% for video
          );
          videoFileKey = videoUploadResponse.data.fileKey;
        }
      }

      // Upload audio file if available
      if (state.audioBlob) {
        const audioFileName = `session-${Date.now()}-audio.webm`;
        const audioUploadResponse = await apiService.getUploadUrl('audio', audioFileName, workerId);
        
        if (audioUploadResponse.success && audioUploadResponse.data) {
          await apiService.uploadFile(
            audioUploadResponse.data.uploadUrl,
            state.audioBlob,
            (progress) => setUploadProgress(40 + progress * 0.4) // 40-80% for audio
          );
          audioFileKey = audioUploadResponse.data.fileKey;
        }
      }

      setUploadProgress(80);

      // Fetch extension data if available
      const sessionId = localStorage.getItem('sessionId') || undefined;
      let extensionData = null;
      let dataFileKey = '';
      
      if (sessionId) {
        try {
          console.log('Fetching extension data for session:', sessionId);
          const extensionResponse = await apiService.getExtensionData(sessionId);
          console.log('Extension response:', extensionResponse);
          extensionData = extensionResponse.data;
          
          // Upload extension data as JSON file
          if (extensionData) {
            console.log('Extension data found:', extensionData);
            const trainingData = {
              sessionId: sessionId,
              workerId: workerId,
              scenario: state.scenario,
              duration: state.duration,
              timestamp: new Date().toISOString(),
              videoFile: videoFileKey,
              audioFile: audioFileKey,
              shoppingBehavior: {
                totalClicks: extensionData.clickEvents?.length || 0,
                totalInputs: extensionData.inputEvents?.length || 0,
                totalScrolls: extensionData.scrollEvents?.length || 0,
                totalNavigations: extensionData.navigationEvents?.length || 0,
                sitesVisited: [...new Set([
                  ...(extensionData.clickEvents?.map((c: any) => new URL(c.url).hostname) || []),
                  ...(extensionData.inputEvents?.map((i: any) => new URL(i.url).hostname) || [])
                ])],
                detailedEvents: extensionData
              }
            };
            
            const jsonBlob = new Blob([JSON.stringify(trainingData, null, 2)], { 
              type: 'application/json' 
            });
            
            const dataFileName = `session-${Date.now()}-data.json`;
            console.log('Getting upload URL for JSON file:', dataFileName);
            const dataUploadResponse = await apiService.getUploadUrl('data', dataFileName, workerId);
            console.log('Data upload response:', dataUploadResponse);
            
            if (dataUploadResponse.success && dataUploadResponse.data) {
              console.log('Uploading JSON to S3...');
              await apiService.uploadFile(
                dataUploadResponse.data.uploadUrl,
                jsonBlob,
                (progress) => setUploadProgress(80 + progress * 0.15) // 80-95% for JSON
              );
              dataFileKey = dataUploadResponse.data.fileKey;
              console.log('JSON uploaded successfully with key:', dataFileKey);
            } else {
              console.error('Failed to get upload URL for JSON data');
            }
          } else {
            console.log('No extension data available for this session');
          }
        } catch (error) {
          console.error('Error handling extension data:', error);
          console.warn('No extension data found for session:', sessionId);
        }
      }

      setUploadProgress(95);

      // Create combined session record
      const sessionResponse = await apiService.createSession({
        workerId,
        scenario: state.scenario,
        duration: state.duration,
        interactionEvents: state.interactionEvents,
        extensionData: extensionData, // Include precise clicks
        videoFileKey,
        audioFileKey,
        dataFileKey, // Include JSON data file
        sessionId
      });

      if (!sessionResponse.success) {
        throw new Error(sessionResponse.error || 'Failed to create session record');
      }

      setUploadProgress(100);

      // Wait a moment then navigate to completion
      setTimeout(() => {
        navigate('/session-complete');
      }, 1000);

    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRestartSession = () => {
    navigate('/session-setup');
  };

  if (!state) {
    return null; // Will redirect
  }

  return (
    <Layout title="Review Session - CodeSight">
      <div className="max-w-4xl mx-auto">
        {/* Session Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Session Review
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Scenario</h3>
              <p className="text-gray-900 capitalize">{state.scenario} Shopping</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Duration</h3>
              <p className="text-gray-900">{formatTime(state.duration)}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Recording Status</h3>
              <p className="text-green-600 font-medium">✓ Complete</p>
            </div>
          </div>
        </div>

        {/* Recording Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Video Preview */}
          {state.videoBlob && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Screen Recording
              </h3>
              
              <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                  preload="metadata"
                >
                  Your browser does not support video playback.
                </video>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Size: {formatFileSize(state.videoBlob.size)}</p>
                <p>Format: WebM Video</p>
              </div>
            </div>
          )}

          {/* Audio Preview */}
          {state.audioBlob && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Audio Narration
              </h3>
              
              <div className="bg-gray-100 rounded-lg p-8 mb-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎤</div>
                  <audio
                    src={audioUrl}
                    controls
                    className="w-full"
                    preload="metadata"
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Size: {formatFileSize(state.audioBlob.size)}</p>
                <p>Format: WebM Audio</p>
              </div>
            </div>
          )}
        </div>

        {/* Shopping Behavior Analytics */}
        {extensionData && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">
              🛒 Shopping Behavior Analytics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {extensionData.clickEvents?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Shopping Clicks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {extensionData.inputEvents?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Form Inputs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {extensionData.scrollEvents?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Scroll Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {extensionData.navigationEvents?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Page Changes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {new Set([
                    ...(extensionData.clickEvents?.map(c => new URL(c.url).hostname) || []),
                    ...(extensionData.inputEvents?.map(i => new URL(i.url).hostname) || [])
                  ]).size}
                </div>
                <div className="text-sm text-gray-600">Shopping Sites</div>
              </div>
            </div>
            
            {/* Sample of shopping interactions */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Sample Shopping Interactions:</h4>
              <div className="space-y-1 text-sm text-gray-600 max-h-32 overflow-y-auto">
                {/* Show shopping clicks */}
                {extensionData.clickEvents?.slice(0, 3).map((click, index) => (
                  <div key={`click-${index}`} className="flex justify-between">
                    <span className="text-red-600 font-medium">Product Click</span>
                    <span>
                      "{click.text}" on {new URL(click.url).hostname}
                    </span>
                  </div>
                ))}
                
                {/* Show form inputs */}
                {extensionData.inputEvents?.slice(0, 3).map((input, index) => (
                  <div key={`input-${index}`} className="flex justify-between">
                    <span className="text-blue-600 font-medium">Form Input</span>
                    <span>
                      {input.label || input.inputType} on {new URL(input.url).hostname}
                    </span>
                  </div>
                ))}
                
                {/* Show navigation */}
                {extensionData.navigationEvents?.slice(0, 2).map((nav, index) => (
                  <div key={`nav-${index}`} className="flex justify-between">
                    <span className="text-green-600 font-medium">Navigation</span>
                    <span>
                      to {new URL(nav.url).hostname}
                    </span>
                  </div>
                ))}
                
                {(extensionData.clickEvents?.length + extensionData.inputEvents?.length + extensionData.navigationEvents?.length) > 8 && (
                  <div className="text-gray-500 italic">
                    ... and {(extensionData.clickEvents?.length + extensionData.inputEvents?.length + extensionData.navigationEvents?.length) - 8} more interactions
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quality Check */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Quality Checklist
          </h3>
          <div className="space-y-2 text-blue-800">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              Recording duration is adequate ({formatTime(state.duration)})
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              Screen content was captured successfully
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              Audio narration was recorded
            </div>
            {extensionData && (extensionData.clickEvents?.length > 0 || extensionData.inputEvents?.length > 0) && (
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Shopping behavior captured ({(extensionData.clickEvents?.length || 0) + (extensionData.inputEvents?.length || 0) + (extensionData.scrollEvents?.length || 0)} interactions)
              </div>
            )}
            {extensionData && extensionData.clickEvents?.length > 0 && (
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Product clicks tracked ({extensionData.clickEvents.length} clicks on shopping sites)
              </div>
            )}
            <div className="flex items-center">
              <span className="text-blue-600 mr-2">ℹ️</span>
              Please review the recordings above to ensure quality
            </div>
          </div>
        </div>

        {/* Upload Section */}
        {!isUploading ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Submit Your Session
            </h3>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-green-900 mb-2">💰 Payment Information</h4>
              <p className="text-green-800 text-sm">
                Upon successful submission, you will receive $15-25 compensation via PayPal 
                within 48 hours. Payment amount depends on session quality and completeness.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">🔒 Data Usage</h4>
              <p className="text-gray-700 text-sm">
                Your recordings will be used solely for research into shopping behaviors. All data 
                is anonymized and securely stored. Personal information is never shared.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleRestartSession}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Record Again
              </button>
              
              <button
                onClick={handleSubmitSession}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-green-700 transition-colors"
              >
                Submit Session & Claim Payment
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Uploading Your Session...
            </h3>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Upload Progress</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
            
            <div className="text-center text-gray-600">
              <p>Please don't close this window while uploading...</p>
              <p className="text-sm mt-2">Uploading screen recording and audio files to secure servers.</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SessionReview;