import React, { useState } from 'react';
import { Menu, User, Lock, ArrowRight, Globe } from 'lucide-react';

const App = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRobot, setIsRobot] = useState(false);
  const [language, setLanguage] = useState('EN');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempt with:', { email, password, isRobot });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-md hover:bg-gray-100">
              <Menu size={24} />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-500 rounded-full"></div>
              <span className="text-xl font-bold text-gray-800">flexiWAN</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EN">EN</option>
              <option value="ES">ES</option>
              <option value="FR">FR</option>
            </select>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-3">
        <nav className="text-sm text-gray-600">
          <span>Home</span>
          <span className="mx-2">»</span>
          <span className="text-blue-600">Login</span>
        </nav>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Login Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-800">
                Login to <span className="text-green-600">flexiManage</span>
              </h1>
              <div className="w-20 h-0.5 bg-gray-300 mx-auto mt-3"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
                <div className="text-right">
                  <button type="button" className="text-xs text-green-600 hover:text-green-700">
                    Resend verification email
                  </button>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
                <div className="text-right">
                  <button type="button" className="text-xs text-green-600 hover:text-green-700">
                    Reset Password
                  </button>
                </div>
              </div>

              {/* CAPTCHA */}
              <div className="border border-gray-200 rounded-md p-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="captcha"
                    checked={isRobot}
                    onChange={() => setIsRobot(!isRobot)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="captcha" className="text-sm text-gray-700">
                    I'm not a robot
                  </label>
                  <div className="ml-auto">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <div className="w-8 h-8 bg-blue-50 rounded flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">reCAPTCHA</div>
                        <div>Privacy - Terms</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isRobot}
                className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors duration-200 ${
                  isRobot 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-orange-300 cursor-not-allowed'
                }`}
              >
                Login
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <button className="text-sm text-green-600 hover:text-green-700">
                Contact us
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600">
              © flexiWAN Ltd. 2025, All Rights Reserved
            </div>
            <div className="mt-4 md:mt-0">
              <a href="#" className="text-sm text-green-600 hover:text-green-700">
                Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -70px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default App;