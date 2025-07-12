import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const SessionSetup: React.FC = () => {
  const navigate = useNavigate();
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isTestingMicrophone, setIsTestingMicrophone] = useState(false);
  const [microphoneWorking, setMicrophoneWorking] = useState(false);
  const [scenario, setScenario] = useState('');

  // Check if user is registered
  useEffect(() => {
    const workerId = localStorage.getItem('workerId');
    if (!workerId) {
      navigate('/register');
    }
  }, [navigate]);

  const scenarios = [
    {
      id: 'electronics',
      title: 'Electronics Shopping',
      description: 'Shop for a laptop or smartphone under $1000, comparing features and prices across different websites.',
      duration: '20-30 minutes'
    },
    {
      id: 'clothing',
      title: 'Fashion Shopping',
      description: 'Browse and select clothing items for a specific occasion, considering style, size, and price.',
      duration: '15-25 minutes'
    },
    {
      id: 'home',
      title: 'Home & Garden',
      description: 'Look for home improvement or furniture items, reading reviews and comparing options.',
      duration: '20-30 minutes'
    }
  ];

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      setPermissionsGranted(true);
      
      // Stop the stream - we just needed permission
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Failed to get permissions:', error);
      alert('Microphone access is required for this study. Please allow access and try again.');
    }
  };

  const testMicrophone = async () => {
    if (!permissionsGranted) {
      await requestPermissions();
      return;
    }

    setIsTestingMicrophone(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio context for volume detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let volumeDetected = false;
      let checkCount = 0;
      const maxChecks = 100; // Check for 5 seconds (50ms * 100)
      
      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        
        if (average > 10) { // Threshold for detecting sound
          volumeDetected = true;
        }
        
        checkCount++;
        
        if (checkCount >= maxChecks) {
          // Stop checking
          setMicrophoneWorking(volumeDetected);
          setIsTestingMicrophone(false);
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          
          if (volumeDetected) {
            alert('Great! Your microphone is working properly.');
          } else {
            alert('No audio detected. Please check your microphone settings and try again.');
          }
        } else {
          setTimeout(checkVolume, 50);
        }
      };
      
      // Start checking volume
      setTimeout(checkVolume, 100);
      
    } catch (error) {
      console.error('Microphone test failed:', error);
      setIsTestingMicrophone(false);
      alert('Failed to test microphone. Please check your settings.');
    }
  };

  const handleStartSession = () => {
    if (!permissionsGranted) {
      alert('Please grant microphone permissions first.');
      return;
    }
    
    if (!scenario) {
      alert('Please select a shopping scenario.');
      return;
    }
    
    // Generate session ID that matches extension format
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const sessionId = `cs_${timestamp}_${random}`;
    
    // Store session ID for later use
    localStorage.setItem('sessionId', sessionId);
    console.log('Generated session ID:', sessionId);
    
    // Pass scenario to recording page
    navigate(`/recording?scenario=${scenario}`);
  };

  return (
    <Layout title="Session Setup - CodeSight Research">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Session Setup
          </h2>

          {/* Step 1: Permissions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Step 1: Grant Microphone Permissions
            </h3>
            <p className="text-gray-600 mb-4">
              We need access to your microphone to record your thoughts during the shopping session.
            </p>
            
            <div className="flex items-center gap-4">
              <button
                onClick={requestPermissions}
                disabled={permissionsGranted}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  permissionsGranted 
                    ? 'bg-green-100 text-green-800 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {permissionsGranted ? '✓ Permissions Granted' : 'Grant Permissions'}
              </button>
            </div>
          </div>

          {/* Step 2: Test Microphone */}
          {permissionsGranted && (
            <div className="mb-8 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Step 2: Test Your Microphone
              </h3>
              <p className="text-gray-600 mb-4">
                Click the button below and speak into your microphone to test the audio recording.
              </p>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={testMicrophone}
                  disabled={isTestingMicrophone}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    isTestingMicrophone
                      ? 'bg-yellow-100 text-yellow-800 cursor-wait'
                      : microphoneWorking
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isTestingMicrophone 
                    ? '🎤 Listening... Speak now!' 
                    : microphoneWorking 
                    ? '✓ Microphone Working' 
                    : 'Test Microphone'
                  }
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Choose Scenario */}
          {permissionsGranted && (
            <div className="mb-8 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Step 3: Choose Your Shopping Scenario
              </h3>
              <p className="text-gray-600 mb-4">
                Select one of the following shopping scenarios to complete during your session:
              </p>
              
              <div className="space-y-3">
                {scenarios.map((s) => (
                  <div key={s.id} className="border rounded-lg p-4">
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="radio"
                        name="scenario"
                        value={s.id}
                        checked={scenario === s.id}
                        onChange={(e) => setScenario(e.target.value)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300"
                      />
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">{s.title}</div>
                        <div className="text-gray-600 text-sm mt-1">{s.description}</div>
                        <div className="text-blue-600 text-sm mt-1">
                          Estimated time: {s.duration}
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {permissionsGranted && scenario && (
            <div className="mb-8 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Recording Instructions
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ul className="text-blue-800 text-sm space-y-2">
                  <li>• <strong>Think aloud:</strong> Narrate your thoughts as you browse and make decisions</li>
                  <li>• <strong>Be natural:</strong> Shop as you normally would, don't rush</li>
                  <li>• <strong>Explain your choices:</strong> Tell us why you like or dislike certain options</li>
                  <li>• <strong>Voice any concerns:</strong> Mention price, quality, shipping, etc.</li>
                  <li>• <strong>Complete the task:</strong> Try to find and select items you would actually buy</li>
                </ul>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            
            <button
              onClick={handleStartSession}
              disabled={!permissionsGranted || !scenario}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Start Recording Session
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SessionSetup;