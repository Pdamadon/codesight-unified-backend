import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout title="Welcome to CodeSight">
      <div className="max-w-2xl mx-auto">
        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Help Us Understand Online Shopping Behavior
          </h2>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-gray-700 mb-4">
              You're invited to participate in a study about how people make 
              purchasing decisions online. Your participation will help us understand 
              consumer behavior and improve online shopping experiences.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">What You'll Do:</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Complete a brief registration and demographic survey</li>
              <li>Perform realistic online shopping tasks while narrating your thoughts</li>
              <li>Record your screen and audio during the shopping session</li>
              <li>Review and submit your recorded session</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">Requirements:</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Computer with Chrome/Firefox browser</li>
              <li>Working microphone for audio narration</li>
              <li>Stable internet connection</li>
              <li>30-45 minutes of uninterrupted time</li>
            </ul>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-blue-900 mb-2">💰 Compensation</h4>
              <p className="text-blue-800">
                You will receive $15-25 compensation upon successful completion,
                paid via PayPal within 48 hours.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-green-900 mb-2">🔒 Privacy & Ethics</h4>
              <p className="text-green-800">
                All data is anonymized, securely stored, and used solely for understanding shopping behaviors. 
                You can withdraw at any time.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/register')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
          
          <button
            onClick={() => window.open('mailto:research@codesight.com?subject=Research Study Questions', '_blank')}
            className="bg-gray-200 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Have Questions?
          </button>
        </div>

        {/* Disclaimer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            By proceeding, you acknowledge that you are 18+ years old and agree to participate
            in this academic research study.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Welcome;