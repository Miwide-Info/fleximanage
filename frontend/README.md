# FlexiManage Frontend

A modern React-based frontend for the FlexiManage SD-WAN management platform.

## Features

- **Dashboard**: System overview and key metrics
- **Device Management**: Monitor and manage network devices
- **Network Management**: Network topology and configuration
- **Tunnel Management**: VPN tunnel monitoring and control
- **Security**: Firewall and security policy management
- **Monitoring**: Real-time analytics and alerting
- **Settings**: System configuration and user management

## Technology Stack

- **React 18**: Modern React with hooks and functional components
- **React Router**: Client-side routing
- **Bootstrap 5**: Responsive UI components
- **Axios**: HTTP client for API calls
- **React Icons**: Icon library
- **Recharts**: Data visualization (planned)

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend server running on port 3000

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   └── ...
│   ├── pages/
│   │   ├── Home.js
│   │   ├── Devices.js
│   │   ├── Network.js
│   │   ├── Tunnels.js
│   │   ├── Login.js
│   │   └── ...
│   ├── services/
│   │   └── api.js
│   ├── styles/
│   │   ├── index.css
│   │   └── App.css
│   ├── App.js
│   └── index.js
├── package.json
└── README.md
```

## Authentication

The application uses JWT-based authentication. Default login credentials:
- Username: `admin`
- Password: `admin`

## API Integration

The frontend communicates with the backend API at `http://localhost:3000/api`. Configure the API URL by setting the `REACT_APP_API_URL` environment variable.

## Development Notes

This frontend was created by analyzing the existing static build files and reconstructing a modern React application structure. The original source code was not available, so this represents a clean rebuild with similar functionality.

## Contributing

1. Follow the existing code style and structure
2. Use functional components with hooks
3. Implement proper error handling
4. Add appropriate TypeScript types (planned)
5. Write tests for new components (planned)