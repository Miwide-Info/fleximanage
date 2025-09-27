import React, { useState } from 'react';
import { Menu, Home, User, Shield, Network, MapPin, BarChart, Settings, HelpCircle, ArrowRight, Globe, LogOut, ChevronDown, Plus, Minus, Info, Mail, ExternalLink } from 'lucide-react';

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('About');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Mock data for about page
  const aboutData = {
    version: "6.4.31",
    deviceVersion: "6.4.32",
    upgradeDeadline: "Dec 02, 2024, 08:00 AM",
    description: "flexiWAN changes the closeness and vendor lock paradigm of SD-WAN by offering an open source SD-WAN infrastructure that includes the vRouter, management, orchestration and automation as well as core SD-WAN baseline functionality.",
    documentationUrl: "https://docs.flexiwan.com/",
    contactEmail: "yourfriends@flexiwan.com",
    websiteUrl: "https://flexiwan.com/",
    adminLinks: [
      { name: "Admin Page", description: "System Management" },
      { name: "Tickets", description: "System tickets" }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col">
      {/* Full-width Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 w-full">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-500 rounded-full"></div>
              <span className="text-xl font-bold text-gray-800">flexiWAN</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-md">
              <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
              <span className="text-xs text-blue-800">AI Agent</span>
            </div>
            
            <select 
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EN">EN</option>
              <option value="ES">ES</option>
              <option value="FR">FR</option>
            </select>
            
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <User size={18} />
                <span>Aikang</span>
                <span className="font-medium">Miwide</span>
                <ChevronDown size={16} />
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="py-2">
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Profile
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Settings
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button className="p-2 rounded-md hover:bg-gray-100">
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`bg-gray-800 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Organization: <span className="text-orange-400">Miwide-Info</span></h2>
          </div>
          
          <nav className="mt-6 flex-1">
            <ul className="space-y-2">
              {[
                { name: 'Home', icon: Home },
                { name: 'Account', icon: User, dropdown: true },
                { name: 'Users', icon: User },
                { name: 'Inventory', icon: Network, dropdown: true },
                { name: 'Traffic Optimization', icon: ArrowRight, dropdown: true },
                { name: 'Security', icon: Shield, dropdown: true },
                { name: 'High-Availability', icon: Settings, dropdown: true },
                { name: 'App Store', icon: Settings, dropdown: true },
                { name: 'Dashboards', icon: BarChart, dropdown: true },
                { name: 'Troubleshoot', icon: HelpCircle, dropdown: true },
                { name: 'About', icon: Info, active: true }
              ].map((item, index) => (
                <li key={index}>
                  <button 
                    onClick={() => setActiveMenu(item.name)}
                    className={`flex items-center w-full px-4 py-3 text-sm transition-colors ${
                      item.active ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
                    }`}
                  >
                    <item.icon size={20} className="mr-3" />
                    {sidebarOpen && item.name}
                    {item.dropdown && sidebarOpen && <ChevronDown size={16} className="ml-auto" />}
                  </button>
                  
                  {item.dropdown && sidebarOpen && (
                    <ul className="pl-8 mt-1 space-y-1">
                      <li><button className="text-xs text-gray-300 hover:text-white">Sub Item 1</button></li>
                      <li><button className="text-xs text-gray-300 hover:text-white">Sub Item 2</button></li>
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <nav className="text-sm text-gray-600">
              <span>Home</span>
              <span className="mx-2">»</span>
              <span className="text-blue-600">About</span>
            </nav>
          </div>

          {/* Page Title */}
          <h1 className="text-2xl font-bold text-gray-800 mb-6">About flexiWAN</h1>

          {/* Version Information Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-500 rounded-full flex items-center justify-center mr-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">flexiWAN</h2>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-700">Management version: <span className="font-medium">{aboutData.version}</span></p>
              <p className="text-sm text-gray-700">Latest device version: <span className="font-medium">{aboutData.deviceVersion}</span></p>
              <p className="text-sm text-gray-700">Automatic upgrade deadline: <span className="font-medium">{aboutData.upgradeDeadline}</span></p>
            </div>
          </div>

          {/* Description Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="prose max-w-none">
              <p className="text-sm text-gray-700 mb-4 italic">
                {aboutData.description}
              </p>
              
              <p className="text-sm text-gray-700 mb-4">
                Product documentation <a href={aboutData.documentationUrl} className="text-green-600 hover:text-green-700 inline-flex items-center">
                  {aboutData.documentationUrl} <ExternalLink size={14} className="ml-1" />
                </a>
              </p>
              
              <p className="text-sm text-gray-700 mb-4">
                To contact us please drop us an email at <a href={`mailto:${aboutData.contactEmail}`} className="text-green-600 hover:text-green-700 inline-flex items-center">
                  {aboutData.contactEmail} <Mail size={14} className="ml-1" />
                </a>
              </p>
              
              <p className="text-sm text-gray-700">
                Learn more at <a href={aboutData.websiteUrl} className="text-green-600 hover:text-green-700 inline-flex items-center">
                  {aboutData.websiteUrl} <ExternalLink size={14} className="ml-1" />
                </a>
              </p>
            </div>
          </div>

          {/* Administrators Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Administrators (Requires Permission):</h3>
            <ul className="list-disc list-inside space-y-2">
              {aboutData.adminLinks.map((link, index) => (
                <li key={index} className="text-sm text-gray-700">
                  <a href="#" className="text-green-600 hover:text-green-700 font-medium">
                    {link.name}
                  </a> - {link.description}
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>

      {/* Footer - positioned to align with sidebar and at the bottom of the page */}
      <footer className={`bg-white border-t border-gray-200 absolute bottom-0 left-0 right-0 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600">
              © flexiWAN Ltd. 2025, All Rights Reserved
            </div>
            <div className="mt-2 md:mt-0">
              <a href="#" className="text-sm text-green-600 hover:text-green-700">
                Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;