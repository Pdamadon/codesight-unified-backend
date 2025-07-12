import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { apiService, WorkerRegistrationData } from '../services/api';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  paypalEmail: string;
  age: number | '';
  country: string;
  experience: string;
  timezone: string;
  availability: string[];
  consentGiven: boolean;
}

const Registration: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    paypalEmail: '',
    age: '',
    country: '',
    experience: 'beginner',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    availability: [],
    consentGiven: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hasMicrophone, setHasMicrophone] = useState(false);

  // Auto-detect microphone
  React.useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const hasAudio = devices.some(device => device.kind === 'audioinput');
        setHasMicrophone(hasAudio);
      });
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.paypalEmail) {
      newErrors.paypalEmail = 'PayPal email is required for payment';
    } else if (!/\S+@\S+\.\S+/.test(formData.paypalEmail)) {
      newErrors.paypalEmail = 'Please enter a valid PayPal email address';
    }

    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (typeof formData.age === 'number' && formData.age < 18) {
      newErrors.age = 'You must be 18 or older to participate';
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    if (!formData.consentGiven) {
      newErrors.consent = 'You must provide consent to participate';
    }

    if (!hasMicrophone) {
      newErrors.microphone = 'A working microphone is required for this study';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const registrationData: WorkerRegistrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        age: formData.age as number,
        country: formData.country.trim(),
        experience: formData.experience,
        paypalEmail: formData.paypalEmail.trim(),
        timezone: formData.timezone,
        availability: formData.availability,
      };

      const response = await apiService.registerWorker(registrationData);
      
      if (response.success && response.data) {
        // Store worker ID in localStorage for session tracking
        localStorage.setItem('workerId', response.data.workerId);
        
        // Navigate to next step
        navigate('/session-setup');
      } else {
        setErrors({ submit: response.error || 'Registration failed. Please try again.' });
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setErrors({ submit: 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Registration - CodeSight Research">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Research Participant Registration
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John"
                />
                {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Doe"
                />
                {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="paypalEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  PayPal Email for Payment *
                </label>
                <input
                  type="email"
                  id="paypalEmail"
                  value={formData.paypalEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, paypalEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="paypal@email.com"
                />
                {errors.paypalEmail && <p className="text-red-600 text-sm mt-1">{errors.paypalEmail}</p>}
              </div>
            </div>

            {/* Demographics */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                    Age *
                  </label>
                  <input
                    type="number"
                    id="age"
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      age: e.target.value ? parseInt(e.target.value) : ''
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.age && <p className="text-red-600 text-sm mt-1">{errors.age}</p>}
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="United States"
                  />
                  {errors.country && <p className="text-red-600 text-sm mt-1">{errors.country}</p>}
                </div>

                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                    Online Shopping Experience
                  </label>
                  <select
                    id="experience"
                    value={formData.experience}
                    onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">Beginner (rarely shop online)</option>
                    <option value="intermediate">Intermediate (shop online monthly)</option>
                    <option value="expert">Expert (shop online weekly)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Technical Requirements */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Requirements</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="microphone"
                    checked={hasMicrophone}
                    readOnly
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="microphone" className="ml-2 text-sm text-gray-700">
                    Microphone Available {hasMicrophone ? '✓' : '✗'}
                  </label>
                </div>
                {errors.microphone && <p className="text-red-600 text-sm mt-2">{errors.microphone}</p>}
                
                {!hasMicrophone && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Microphone Required:</strong> Please ensure your microphone is connected and grant permission when prompted.
                      You'll need to narrate your thoughts during the shopping session.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Consent */}
            <div className="border-t pt-6">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="consent"
                  checked={formData.consentGiven}
                  onChange={(e) => setFormData(prev => ({ ...prev, consentGiven: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded mt-1"
                />
                <label htmlFor="consent" className="ml-3 text-sm text-gray-700">
                  I consent to participate in this research study. I understand that my session will be 
                  recorded (screen and audio) and that this data will be used for academic research purposes only. 
                  I can withdraw from the study at any time. *
                </label>
              </div>
              {errors.consent && <p className="text-red-600 text-sm mt-1">{errors.consent}</p>}
            </div>

            {/* Submit */}
            <div className="pt-6">
              {errors.submit && <p className="text-red-600 text-sm mb-4">{errors.submit}</p>}
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Registering...' : 'Continue to Session Setup'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Registration;