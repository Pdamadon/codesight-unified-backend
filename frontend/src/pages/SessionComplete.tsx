import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const SessionComplete: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout title="Session Complete - CodeSight Research">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Message */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Session Complete!
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Thank you for participating in our online shopping behavior research study. 
            Your contribution will help improve e-commerce experiences for everyone.
          </p>
        </div>

        {/* Payment Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-green-900 mb-3">
            💰 Payment Processing
          </h3>
          <div className="text-green-800">
            <p className="mb-3">
              Your session has been successfully submitted and is now being processed by our research team.
            </p>
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Payment Amount:</strong><br />
                  $15-25 USD
                </div>
                <div>
                  <strong>Payment Method:</strong><br />
                  PayPal
                </div>
                <div>
                  <strong>Processing Time:</strong><br />
                  24-48 hours
                </div>
                <div>
                  <strong>Session ID:</strong><br />
                  CS-{Date.now().toString().slice(-8)}
                </div>
              </div>
            </div>
            <p className="text-sm">
              <strong>Next Steps:</strong> Our team will review your session for quality and completeness. 
              Once approved, payment will be sent to the email address you provided during registration.
            </p>
          </div>
        </div>

        {/* Session Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-blue-900 mb-3">
            📊 Your Contribution
          </h3>
          <div className="text-blue-800 space-y-2">
            <p>✓ Completed shopping behavior recording session</p>
            <p>✓ Provided valuable insights into consumer decision-making</p>
            <p>✓ Contributed to academic research in e-commerce psychology</p>
            <p>✓ Helped improve online shopping experiences</p>
          </div>
        </div>

        {/* Research Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            🔬 About This Research
          </h3>
          <div className="text-gray-700 text-sm text-left space-y-2">
            <p>
              <strong>Study Purpose:</strong> Understanding how consumers navigate online shopping 
              environments and make purchasing decisions.
            </p>
            <p>
              <strong>Research Team:</strong> CodeSight Research Lab, affiliated with academic 
              institutions studying consumer behavior and e-commerce psychology.
            </p>
            <p>
              <strong>Data Usage:</strong> Your recordings will be analyzed to identify common 
              patterns in shopping behavior, pain points in user experience, and factors 
              influencing purchase decisions.
            </p>
            <p>
              <strong>Privacy:</strong> All data is anonymized and stored securely. Personal 
              identifiers are removed before analysis.
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            📧 Questions or Concerns?
          </h3>
          <div className="text-gray-700 space-y-3">
            <p>
              If you have any questions about your payment, the research study, or data usage, 
              please don't hesitate to contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p><strong>Email:</strong> research@codesight.com</p>
              <p><strong>Response Time:</strong> Within 24 hours</p>
              <p><strong>Study ID:</strong> CS-SHOP-2025</p>
            </div>
            <p className="text-sm text-gray-600">
              Please include your session ID (shown above) in any correspondence.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
          
          <button
            onClick={() => window.open('mailto:research@codesight.com?subject=Research Study - Session CS-' + Date.now().toString().slice(-8), '_blank')}
            className="bg-gray-200 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Contact Research Team
          </button>
        </div>

        {/* Footer Message */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Thank you for contributing to scientific research! 
            Your participation helps advance our understanding of online consumer behavior.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default SessionComplete;