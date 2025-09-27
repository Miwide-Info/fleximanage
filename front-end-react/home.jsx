import React, { useState } from 'react';
import { Menu, Home, User, Shield, Network, MapPin, BarChart, Settings, HelpCircle, ArrowRight, Globe, LogOut, ChevronDown, Plus, Minus, Info } from 'lucide-react';

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('Home');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Mock data for network status
  const networkStatus = {
    devices: {
      running: 0,
      notRunning: 1,
      connected: 0,
      notConnected: 1,
      notApproved: 0,
      warning: 0
    },
    tunnels: {
      connected: 0,
      notConnected: 0,
      pending: 0,
      unknown: 0
    }
  };

  const trafficData = {
    total: "58.05 MBytes",
    link: "Check traffic dashboard for more"
  };

  const worldMapData = [
    { id: 1, name: "WiMaster-X", lat: 40.7128, lng: -74.0060, status: "active" }
  ];

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
                { name: 'Home', icon: Home, active: true },
                { name: 'Account', icon: User, dropdown: true },
                { name: 'Users', icon: User },
                { name: 'Inventory', icon: Network, dropdown: true },
                { name: 'Traffic Optimization', icon: ArrowRight, dropdown: true },
                { name: 'Security', icon: Shield, dropdown: true },
                { name: 'High-Availability', icon: Settings, dropdown: true },
                { name: 'App Store', icon: Settings, dropdown: true },
                { name: 'Dashboards', icon: BarChart, dropdown: true },
                { name: 'Troubleshoot', icon: HelpCircle, dropdown: true },
                { name: 'About', icon: Info }
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
            </nav>
          </div>

          {/* Page Title */}
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Home</h1>

          {/* Network Status Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Network Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Devices Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Devices</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-green-700">{networkStatus.devices.running}</span>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Running</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-red-700">{networkStatus.devices.notRunning}</span>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Not Running/NA</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-green-700">{networkStatus.devices.connected}</span>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Connected</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-red-700">{networkStatus.devices.notConnected}</span>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Not Connected</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-400 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-700">{networkStatus.devices.notApproved}</span>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Not Approved</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-orange-100 border-2 border-orange-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-700">{networkStatus.devices.warning}</span>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Warning</span>
                  </div>
                </div>
              </div>
              
              {/* Tunnels Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Tunnels</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-green-700">{networkStatus.tunnels.connected}</span>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Connected</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-red-700">{networkStatus.tunnels.notConnected}</span>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Not Connected</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-orange-100 border-2 border-orange-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-orange-700">{networkStatus.tunnels.pending}</span>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Pending</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-400 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-700">{networkStatus.tunnels.unknown}</span>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">Unknown</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Traffic This Month Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Traffic this month</h2>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Total</div>
              <div className="text-lg font-bold text-gray-800">{trafficData.total}</div>
              <div className="text-sm text-green-600 hover:text-green-700 cursor-pointer">
                {trafficData.link}
              </div>
            </div>
          </div>

          {/* World Map Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">World Map</h2>
              <div className="text-sm text-green-600 hover:text-green-700 cursor-pointer">
                Larger map in World Map dashboard
              </div>
            </div>
            
            <div className="relative h-96 bg-gray-200 rounded-md overflow-hidden">
              {/* Map Placeholder */}
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-md flex items-center justify-center">
                      <MapPin size={24} className="text-gray-600" />
                    </div>
                  </div>
                  <div className="text-gray-500 mb-2">Map data not yet available</div>
                  {worldMapData.map(device => (
                    <div key={device.id} className="mt-4">
                      <div className="inline-block bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                        {device.name}
                      </div>
                      <div className="mt-2 inline-flex items-center justify-center w-12 h-12 bg-green-100 border-2 border-green-500 rounded-full">
                        <ArrowRight size={16} className="rotate-90 text-green-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Zoom Controls */}
              <div className="absolute top-4 left-4 bg-white rounded-md shadow-md">
                <button className="block w-full px-3 py-2 text-gray-700 hover:bg-gray-100">
                  <Plus size={16} />
                </button>
                <button className="block w-full px-3 py-2 text-gray-700 hover:bg-gray-100 border-t border-gray-200">
                  <Minus size={16} />
                </button>
              </div>
              
              {/* Map Attribution */}
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                Leaflet | © OpenStreetMap contributors
              </div>
            </div>
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