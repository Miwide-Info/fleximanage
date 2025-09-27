import React, { useState } from 'react';
import { Home, User, Settings, Bell, CreditCard, Key, Users, Box, GitBranch, Shield, Lock, Database, Store, LayoutDashboard, Map, Wrench, Info, ChevronDown, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const [page, setPage] = useState('home');
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (title) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const countries = [/* full list unchanged */
    "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
    "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
    "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada",
    "Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Costa Rica","Croatia","Cuba",
    "Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia",
    "Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana",
    "Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland",
    "India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan",
    "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia",
    "Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta",
    "Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco",
    "Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria",
    "North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay",
    "Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia",
    "Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore",
    "Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan",
    "Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Togo","Tonga",
    "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
    "Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">fw</div>
          <h1 className="text-lg font-semibold">flexiWAN</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <button className="px-2 py-1 border rounded text-xs">AI Agent</button>
          <div className="hidden md:block">EN ▾</div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">👤</div>
            <div className="text-sm font-medium">Aikang</div>
            <div className="text-xs text-slate-400">Miwide ▾</div>
          </div>
          <button className="px-2 py-1 border rounded text-xs hover:bg-slate-100">⏻ Logout</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-100 min-h-full p-4 overflow-y-auto text-sm">
          <div className="mb-6">
            <div className="text-sm text-slate-400">Organization: <span className="text-orange-400 font-medium">Miwide-Info</span></div>
          </div>

          <nav className="space-y-2">
            <NavItem active={page==='home'} icon={<Home size={16}/>} onClick={() => setPage('home')}>Home</NavItem>

            <SectionTitle>Account</SectionTitle>
            <NavSubItem active={page==='profile'} icon={<User size={14}/>} onClick={() => setPage('profile')}>Profile</NavSubItem>
            <NavGroup title="More" icon={<Settings size={14}/>} items={["Organizations","Notifications Settings","Billing","Access Keys"]} open={openGroups["More"]} toggle={() => toggleGroup("More")} />

            <SectionTitle>Users</SectionTitle>
            <NavGroup title="Users" icon={<Users size={14}/>} items={["User Management"]} open={openGroups["Users"]} toggle={() => toggleGroup("Users")} />

            <SectionTitle>Inventory</SectionTitle>
            <NavGroup title="Inventory" icon={<Box size={14}/>} items={["Devices","Tunnels"]} open={openGroups["Inventory"]} toggle={() => toggleGroup("Inventory")} />

            <SectionTitle>Traffic Optimization</SectionTitle>
            <NavGroup title="Traffic" icon={<GitBranch size={14}/>} items={["Policies"]} open={openGroups["Traffic"]} toggle={() => toggleGroup("Traffic")} />

            <SectionTitle>Security</SectionTitle>
            <NavGroup title="Security" icon={<Shield size={14}/>} items={["Firewall","Certificates"]} open={openGroups["Security"]} toggle={() => toggleGroup("Security")} />

            <SectionTitle>High-Availability</SectionTitle>
            <NavGroup title="HA" icon={<Database size={14}/>} items={["Settings"]} open={openGroups["HA"]} toggle={() => toggleGroup("HA")} />

            <SectionTitle>App Store</SectionTitle>
            <NavGroup title="Store" icon={<Store size={14}/>} items={["Available Apps"]} open={openGroups["Store"]} toggle={() => toggleGroup("Store")} />

            <SectionTitle>Dashboards</SectionTitle>
            <NavGroup title="Dashboards" icon={<LayoutDashboard size={14}/>} items={["Overview","World Map"]} open={openGroups["Dashboards"]} toggle={() => toggleGroup("Dashboards")} />

            <SectionTitle>Troubleshoot</SectionTitle>
            <NavGroup title="Troubleshoot" icon={<Wrench size={14}/>} items={["Logs","Diagnostics"]} open={openGroups["Troubleshoot"]} toggle={() => toggleGroup("Troubleshoot")} />

            <SectionTitle>About</SectionTitle>
            <NavItem active={page==='about'} icon={<Info size={14}/>} onClick={() => setPage('about')}>About</NavItem>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto h-[calc(100vh-56px)]">
          <div className="max-w-[1100px] mx-auto space-y-6">
            {/* Home, Profile, About remain unchanged */}

            {page === 'home' && (
              <>
                <h2 className="text-2xl font-semibold mb-4">Home</h2>
                <section className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded shadow-sm p-4 text-center">
                    <p className="text-sm text-slate-500">Running Devices</p>
                    <p className="text-2xl font-bold text-emerald-600">0</p>
                  </div>
                  <div className="bg-white rounded shadow-sm p-4 text-center">
                    <p className="text-sm text-slate-500">Not Running Devices</p>
                    <p className="text-2xl font-bold text-rose-600">1</p>
                  </div>
                  <div className="bg-white rounded shadow-sm p-4 text-center">
                    <p className="text-sm text-slate-500">Connected Tunnels</p>
                    <p className="text-2xl font-bold text-emerald-600">0</p>
                  </div>
                  <div className="bg-white rounded shadow-sm p-4 text-center">
                    <p className="text-sm text-slate-500">Disconnected Tunnels</p>
                    <p className="text-2xl font-bold text-rose-600">0</p>
                  </div>
                </section>
              </>
            )}

            {page === 'profile' && (
              <>
                <div className="text-sm text-slate-500 mb-2">Home ▸ Account ▸ Account Profile</div>
                <h2 className="text-2xl font-semibold mb-4">Account Profile</h2>
                <section className="bg-white rounded shadow-sm p-6 max-w-lg">
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Company Name</label>
                      <input type="text" defaultValue="Forteon" className="mt-1 block w-full border rounded px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Country</label>
                      <select defaultValue="China" className="mt-1 block w-full border rounded px-3 py-2 text-sm">
                        {countries.map((country, idx) => (
                          <option key={idx}>{country}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Force Two-Factor-authenticator</label>
                      <input type="checkbox" className="h-5 w-5" />
                    </div>
                    <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">Update</button>
                  </form>
                </section>
              </>
            )}

            {page === 'about' && (
              <>
                <div className="text-sm text-slate-500 mb-2">Home ▸ About</div>
                <h2 className="text-2xl font-semibold mb-4">About flexiWAN</h2>

                <section className="bg-white rounded shadow-sm p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">fw</div>
                    <div>
                      <p className="font-medium">Management version: 6.4.31</p>
                      <p className="text-sm text-slate-600">Latest device version: 6.4.32</p>
                      <p className="text-sm text-slate-600">Automatic upgrade deadline: Dec 02, 2024, 08:00 AM</p>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded shadow-sm p-6 space-y-3 text-sm leading-relaxed">
                  <p><span className="italic">flexiWAN changes the closeness and vendor lock paradigm of SD-WAN</span> by offering an open source SD-WAN infrastructure that includes the vRouter, management, orchestration and automation as well as core SD-WAN baseline functionality.</p>
                  <p>Product documentation <a href="https://docs.flexiwan.com/" className="text-teal-600 underline">https://docs.flexiwan.com/</a></p>
                  <p>To contact us please drop us an email at <a href="mailto:yourfriends@flexiwan.com" className="text-teal-600 underline">yourfriends@flexiwan.com</a></p>
                  <p>Learn more at <a href="https://flexiwan.com/" className="text-teal-600 underline">https://flexiwan.com/</a></p>
                </section>

                <section className="bg-white rounded shadow-sm p-6 text-sm">
                  <p className="font-medium">Administrators (Requires Permission):</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><a href="#" className="text-teal-600 underline">Admin Page</a> - System Management</li>
                    <li><a href="#" className="text-teal-600 underline">Tickets</a> - System tickets</li>
                  </ul>
                </section>
              </>
            )}

            <footer className="text-center text-sm text-slate-400 py-6">© flexiWAN Ltd. 2025, All Rights Reserved — <a className="underline">Documentation</a></footer>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ children, active, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${active ? 'bg-orange-600/10 text-orange-300 font-medium' : 'hover:bg-slate-800/60'}`}
    >
      {icon && <span>{icon}</span>}
      <span className="text-sm">{children}</span>
    </div>
  );
}

function NavSubItem({ children, active, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`ml-6 flex items-center gap-2 p-2 rounded cursor-pointer ${active ? 'bg-orange-600/10 text-orange-300 font-medium' : 'hover:bg-slate-800/60'}`}
    >
      {icon && <span>{icon}</span>}
      <span className="text-sm">{children}</span>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div className="pt-3 pb-2 text-xs text-slate-400 uppercase">{children}</div>;
}

function NavGroup({ title, icon, items, open, toggle }) {
  return (
    <div>
      <div className="flex items-center justify-between p-2 rounded hover:bg-slate-800/60 cursor-pointer" onClick={toggle}>
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span className="text-sm">{title}</span>
        </div>
        {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </div>
      {open && (
        <ul className="space-y-1 ml-6">
          {items.map((item, idx) => (
            <li key={idx} className="p-2 rounded hover:bg-slate-800/60 cursor-pointer text-sm">{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
