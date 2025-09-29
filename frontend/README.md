# OpenSource-OpenNetworking

React Web UI for the flexiWAN (flexiManage) backend – an open source SD‑WAN management platform.  
This project (code name: OpenSource-OpenNetworking) provides a modular, extensible administration console targeting the APIs exposed by the flexiManage backend.

> NOTE: The NPM package name inside `package.json` is normalized to `opensource-opennetworking` (lowercase / hyphen form) following common conventions, while the project brand is written as **OpenSource-OpenNetworking** here.

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

## Backend / API Integration

The UI is designed to talk to a running flexiManage backend instance. By default the development proxy (see `package.json` `proxy` field) points to `http://localhost:3000` and requests are sent to `/api/*` routes.

Override the base API URL at build/runtime with an environment variable:

```
REACT_APP_API_URL=https://local.flexiwan.com:3443/api npm start
```

If `REACT_APP_API_URL` is not defined, the app falls back to the relative `/api` path (relying on the dev proxy during `npm start`).

The frontend communicates with the backend API at `http://localhost:3000/api`. Configure the API URL by setting the `REACT_APP_API_URL` environment variable.

## reCAPTCHA (Login & Registration)

If the backend is configured with Google reCAPTCHA keys it will expect a captcha token on registration (already implemented server side) and now also on login. To enable the widget on this frontend login page:

1. Obtain keys (v2 Checkbox) from https://www.google.com/recaptcha/admin/create
2. Export the site key at dev/build time:
   ```bash
   REACT_APP_RECAPTCHA_SITE_KEY=<YOUR_SITE_KEY> npm start
   # or for a production build
   REACT_APP_RECAPTCHA_SITE_KEY=<YOUR_SITE_KEY> npm run build
   ```
3. Backend env variables (example):
   ```bash
   export CAPTCHA_SITE_KEY=<YOUR_SITE_KEY>
   export CAPTCHA_SECRET_KEY=<YOUR_SECRET_KEY>
   ```
4. Without `CAPTCHA_SECRET_KEY` the backend will treat captcha as always valid (development convenience).

Development / Test Keys:
For quick local setup you can use Google's public TEST key pair for reCAPTCHA v2 checkbox (works on any domain, always validates):

```
Site (public) key: 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
Secret (server) key: 6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

Export them exactly like real keys. NEVER use these test keys in production.

Adaptive enforcement: The backend now also returns `captchaEnforced` from `GET /api/public/config` which is true only when the backend has a non-empty secret key (`captchaKey`).

Behavior matrix:

| Site Key Present | captchaEnforced | Widget Loads | Result |
|------------------|-----------------|--------------|--------|
| No               | false           | N/A          | No captcha shown, login proceeds normally |
| Yes              | false           | Yes          | Token collected but not required (dev / test mode) |
| Yes              | false           | Fails        | Warning banner; login still allowed |
| Yes              | true            | Yes          | User must complete captcha before submit |
| Yes              | true            | Fails        | Error banner – user may be blocked (operator should fix key/network) |

Watchdog: After 6 seconds, if a site key exists but the widget has not rendered, a warning (non-enforced) or danger (enforced) alert appears to aid debugging. In non-enforced mode users can still submit. In enforced mode they are advised that login may fail until the issue is resolved.

### Runtime Mechanism for Acquiring captchaSiteKey (No Rebuild Required)

To avoid rebuilding every time the site key is changed, the frontend determines the reCAPTCHA site key based on the following priority:
1. Build-time environment variable `REACT_APP_RECAPTCHA_SITE_KEY`
2. Runtime-injected `window.__RECAPTCHA_SITE_KEY__` (can be manually written in a script tag in `index.html`)
3. Fetched from the backend public endpoint `GET /api/public/config` which returns `captchaSiteKey`
   (since enhancement: also returns `captchaEnforced` boolean)

If neither 1 nor 2 exists, `Login.js` will automatically request `/api/public/config` after mounting. If the response contains `captchaSiteKey`, it will load the Google script and render the widget on the fly, without requiring a rebuild.

Example of backend public endpoint response:
```json
{
   "captchaSiteKey": "6Lxxxxxxxxxxxxxxxxxxxx",
   "companyName": "flexiWAN",
   "allowUsersRegistration": true
}
```

Example of runtime override (for operations to inject in the browser console without a rebuild):
```js
window.__RECAPTCHA_SITE_KEY__ = 'NEW_SITE_KEY';
// Manually trigger a page re-render (e.g., by navigating away and back to the login page) to reload the script
```

To disable reCAPTCHA: ensure that the key is not provided in any of the three locations (build variable, global injection, or API response).

The frontend does not expose the backend's SECRET (only the public site key is transmitted).

## Role-Based Route Guards

The frontend now decodes JWT permissions (`perms` claim) and guards certain routes.

Permission mapping (view requires GET bit = 0x1):
| Route | Permission Key |
|-------|----------------|
| /devices | devices |
| /tunnels | tunnels |
| /firewall | firewallpolicies |
| /qos | qospolicies |
| /monitoring | devices |
| /account, /account/profile | accounts |
| /account/organizations | organizations |
| /account/notifications | notifications |
| /account/billing | billing |
| /account/access-keys | accesstokens |
| /network | organizations |
| /users | accounts |

If user lacks the GET permission bit for the mapped key a 403 placeholder is shown.

Implementation details:
1. Token decoded client-side (no external libs) in `src/auth/permissions.js`.
2. Guard logic inside `App.js` via a lightweight `<Guard />` wrapper.
3. Adjust or extend mapping by editing the route definitions in `App.js`.

Future ideas: central route config, dynamic menu hiding based on same permission map.

## Development Notes

This frontend was created by analyzing the existing static build files and reconstructing a modern React application structure. The original source code was not available, so this represents a clean rebuild with similar functionality.

## Contributing

If you are aligning this UI with a customized fork of the flexiWAN backend, ensure any new endpoints are wrapped in the `src/services/api.js` layer to keep component code declarative.

Recommended next enhancements (open for contribution):
1. TypeScript migration (incremental – start with `src/services/` and shared hooks).
2. Error boundary & toast notification system for API failures.
3. Role-based route guards wired to backend JWT claims.
4. Recharts dashboard widgets (traffic, tunnels health, device status aggregation).
5. Cypress or Playwright smoke tests for critical navigation/auth flows.

## Branding Customization

All user‑visible brand strings are centralized in `src/constants/branding.js`:

```
export const BRAND_NAME = 'OpenSource-OpenNetworking';
export const BRAND_TAGLINE = 'Open SD-WAN Management Platform';
```

To rebrand:
1. Edit those constants.
2. (Optional) Update `public/index.html` `<title>` / `<meta description>` and `public/manifest.json` `short_name` / `name` if you need PWA metadata alignment.
3. Rebuild: `npm run build`.

Avoid scattering raw brand strings inside components—new UI code should import the constants.

1. Follow the existing code style and structure
2. Use functional components with hooks
3. Implement proper error handling
4. Add appropriate TypeScript types (planned)
5. Write tests for new components (planned)