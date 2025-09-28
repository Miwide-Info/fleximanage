# flexiWAN Official Repository

The official respository for flexiwan is in https://gitlab.com/flexiwangroup

# About flexiWAN

flexiWAN is the world's first open source [SD-WAN](https://flexiwan.com/). flexiWAN offers a complete SD-WAN solution comprising of flexiEdge (the edge router) and flexiManage (the central management system) with core SD-WAN functionality. Our mission is to democratize the SD-WAN Market through an open source & modular  SD-WAN solution lowering barriers to entry for companies to adopt it or offer services based on the flexiWAN SD-WAN solution. To learn more about the flexiWAN's unique approach to networking, visit the [flexiWAN](https://flexiwan.com/) website, and follow the company on [Twitter](https://twitter.com/FlexiWan) and [LinkedIn](https://www.linkedin.com/company/flexiwan).

To contact us please drop us an email at yourfriends@flexiwan.com, or for any general issue please use our [Google User Group](https://groups.google.com/a/flexiwan.com/forum/#!forum/flexiwan-users)

# flexiManage

This repository contains the flexiManage backend component from flexiWAN. flexiManage service is used for managing [flexiEdge devices](https://docs.flexiwan.com/overview/arch.html#flexiedge). It allows users to create users and accounts and manage the entire network inventory of the organizations in the account.

Our hosted service https://manage.flexiwan.com provides a free access to the flexiManage service for a 30 days trial where users can create an account and use up to 5 flexiEdge devices during the free trial. Users may request extension of the trial by contacting our account team (team@flexiwan.com). One account is allowed per company and users are not allowed to open additional accounts in order to gain additional free trials.

## What is included in this repository

The flexiManage backend component provides REST API for managing the flexiWAN network, configuring and connecting to the flexiWAN flexiEdge devices. 
The repository historically referenced several git submodules used by the hosted flexiWAN SaaS service that are **not open source**:

* `client` – original proprietary flexiWAN SaaS UI
* `backend/billing` – billing related service integration
* `vpnportal` – VPN portal web component

If you clone this public repository without credentials for those private modules they will appear as empty directories (or git will warn during submodule init). That is expected and harmless for local open-source usage.

These submodules are NOT required for running the open backend service. Instead, this fork / distribution introduces a brand new open React Web UI located in the `frontend/` directory (project name: **OpenSource-OpenNetworking**), developed specifically against the open flexiManage REST APIs.

### OpenSource-OpenNetworking Frontend

The new frontend replaces the closed-source `client` submodule. Key points:

* Location: `./frontend`
* Build output served by the backend from `frontend/build` (backend config updated: `clientStaticDir` -> `../frontend/build` per environment).
* Technology: React 18, React Router, Axios, Bootstrap 5.
* API Base: Defaults to relative `/api` (dev proxy); override with `REACT_APP_API_URL`.

Quick start for the open UI:
```bash
cd frontend
npm install
npm run build   # produces ./frontend/build
```
Then start backend (in another shell):
```bash
cd backend
npm install
npm start
```
Browse to: https://local.flexiwan.com:3443 (or configured host/port) — backend will serve the React app if the build directory exists.

Development (hot reload):
```bash
cd frontend
npm start
```
The dev server will proxy API calls to the backend (configure `proxy` in `package.json` or set `REACT_APP_API_URL`).

If you prefer not to have dangling proprietary submodule references you may comment out or delete their entries in `.gitmodules`; they are retained here solely for transparency with respect to the original upstream structure.
To experience the complete flexiWAN system, open a free account on our [hosted system](https://flexiwan.com/pricing).

## Install and use flexiManage locally

### Prerequisites
FlexiManage requires the following to run:
* Node.js v10+
* npm v6+
* MongoDB 4.0.9, running as a replica-set with 3 nodes on ports 27017, 27018, 27019
* Redis 5.0.5, running on port 6379
* A mailer application or trapper of your choice, running on port 1025 (Such as [python mailtrap](https://pypi.org/project/mailtrap/))

### Helper Installation Scripts (Optional Convenience)
For development convenience this repository now includes shell scripts to provision local dependencies quickly:

| Script | Purpose | Notes |
|--------|---------|-------|
| `scripts/install_mongodb.sh` | Downloads & configures MongoDB 4.0.9 replica set (3 members) on localhost ports 27017/27018/27019 | Idempotent; supports `STOP=1`, `STATUS=1`, `CLEAN=1` flags. Logs under `/var/log/mongodb`. |
| `scripts/install_redis.sh` | Installs & configures Redis (systemd or sysv) on port 6379 | Detects init system; creates minimal config; ACL example user retained. |
| `scripts/install_aiosmtpd.sh` | Sets up a lightweight SMTP sink using aiosmtpd on port 1025 | Supports systemd or init.d, virtualenv install, upgrade/uninstall flags. |

For deeper details (flags, safety notes, customization ideas) see `scripts/README.md`.

Example usages:
```bash
# MongoDB replica set
sudo ./scripts/install_mongodb.sh
sudo ./scripts/install_mongodb.sh STATUS=1   # check status

# Redis
sudo ./scripts/install_redis.sh

# aiosmtpd mail sink (default port 1025)
sudo ./scripts/install_aiosmtpd.sh
sudo ./scripts/install_aiosmtpd.sh UPGRADE=1           # upgrade aiosmtpd package
sudo ./scripts/install_aiosmtpd.sh UNINSTALL=1         # remove service & install dir
```

These scripts are meant for local/dev environments; hardening for production (security, backups, monitoring) should be applied separately.

### Installing
##### Getting the source code:
```
mkdir flexiManage
cd flexiManage
git clone https://gitlab.com/flexiwangroup/fleximanage.git .
```

##### Installing dependencies:
```
cd backend
npm install
```

### Running
```
npm start
```

### Creating a user
To create your first user, use the procedure below:
1) Register a new user:
```
curl -X POST -k "https://local.flexiwan.com:3443/api/users/register" -H "accept: application/json" -H "Content-Type: application/json" -d "{\"accountName\":\"account\",\"userFirstName\":\"user\",\"userLastName\":\"lastname\",\"email\":\"user@example.com\",\"password\":\"xxxxxxxx\",\"userJobTitle\":\"eng\",\"userPhoneNumber\":\"\",\"country\":\"US\",\"companySize\":\"0-10\",\"serviceType\":\"Provider\",\"numberSites\":\"10\",\"companyType\":\"\",\"companyDesc\":\"\",\"captcha\":\"\"}"
```
2) You should get an email to user@example.com with a verification link. In the verification link, copy the id and t (token) parameters and execute the verification API:
```
curl -X POST -k "https://local.flexiwan.com:3443/api/users/verify-account" -H "accept: application/json" -H "Content-Type: application/json" -d "{\"id\":\"<id parameter in the verification link>\",\"token\":\"<token parameter in the verification link>\"}"
```
3) Execute a login API:
```
curl -X POST -sD - -k "https://local.flexiwan.com:3443/api/users/login" -H "accept: application/json" -H "Content-Type: application/json" -d "{\"username\":\"user@example.com\",\"password\":\"xxxxxxxx\",\"captcha\":\"\"}"
```
Check the response header and use the Refresh-JWT as bearer token for any REST API.
```
Refresh-JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZTh...TlNo
```
Check the documentation REST API section for more details.  You can create an access-key for your account API key.

### Enabling Google reCAPTCHA (Login & Registration)

The backend now supports Google reCAPTCHA v2 ("I'm not a robot" checkbox) for both registration and login.

1. Create keys at: https://www.google.com/recaptcha/admin/create (choose v2 -> "I'm not a robot" checkbox).
2. Set environment variables (server side):
```
export CAPTCHA_SECRET_KEY="<YOUR_SECRET_KEY>"
export CAPTCHA_SITE_KEY="<YOUR_SITE_KEY>"
```
3. (Optional) Copy `.env.example` to `.env` and populate values; use a process manager or shell export to load them before `npm start`.
4. Frontend development start or build must receive the site key so the widget renders:
```
REACT_APP_RECAPTCHA_SITE_KEY=$CAPTCHA_SITE_KEY npm start
# or
REACT_APP_RECAPTCHA_SITE_KEY=$CAPTCHA_SITE_KEY npm run build
```
5. After setting keys, the login and register forms will require a successful captcha before sending credentials.

Behavior notes:
* If `CAPTCHA_SECRET_KEY` is empty, backend treats captcha as always valid (development convenience).
* If site key is present on frontend but secret key left empty, the widget shows but server will not verify (still acceptable for local dev).
* On failure backend responds with HTTP 500 and body `{ error: "Wrong Captcha" }`.

Test / Development Keys:
Google provides universal TEST keys for reCAPTCHA v2 checkbox that work on any hostname and always validate.

Site key (public): `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`

Secret key (server): `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

Use these ONLY for local development. Do NOT deploy them to production – they are publicly known.

Fallback Key Removal:
Earlier a hard-coded example site key was shipped in `configs.js`. That default has been removed; if you do not set `CAPTCHA_SITE_KEY` the widget simply will not render (avoiding confusing "Invalid domain for site key" errors). Supply either your real domain key or the Google test key above for local work.

Security tip: NEVER commit real keys. Only store them in environment variables or secret managers.

### Service Types Enum & Public Meta Endpoint

The backend now defines a canonical serviceType enumeration in `backend/constants/serviceTypes.js`:

```
MSP/Service provider
Systems Integrator (SI)
Value Added Reseller (VAR)
Telco
SaaS provider
```

The `accounts` schema enforces `enum` + relaxed formatting (letters, numbers, space, `/()_-`).

Frontend registration form consumes a synchronized list (`frontend/src/constants/serviceTypes.js`).

At runtime, clients can fetch the list (and permission preset keys) without rebuilding via:

```
GET /api/public/meta
=> { "serviceTypes": [...], "permissionPresets": ["none", "account_owner", ...] }
```

### Permission System (Summary)

Permissions are bitmasks per resource (get/post/put/del). Predefined sets live in `backend/models/membership.js` under `preDefinedPermissions`:

- account_owner / account_manager / account_viewer
- group_manager / group_viewer
- organization_manager / organization_viewer
- none
- super_admin (auto-expanded full permissions; not granted via membership, only when `user.admin === true`).

`GET /api/public/meta` exposes only the preset names (no raw bitmasks) for safe UI display.

### Super Admin

If a user document has `admin: true`, the system returns a dynamically generated `super_admin` permission set (full rights on all resources). This avoids hardcoding privileged bitmasks in multiple places.

### Permission Caching

User permissions are cached in-memory for 30 seconds (keyed by userId + defaultAccount + defaultOrg). A helper `invalidateUserPermissions(userId)` is exported for future hooks after membership changes.


### Documentation
For full documentation of flexiManage, please refer to [flexiManage documentation](https://docs.flexiwan.com/management/management-login.html).

## Versioning

FlexiManage uses [SemVer](https://semver.org/) scheme for versioning.

## License

This project is licensed under the GNU AGPLv3 License - see the [LICENSE.md](https://gitlab.com/flexiwangroup/fleximanage/blob/master/LICENSE) file for details

## Other Open Source Used

This project uses other Open Source components listed [here](https://gitlab.com/flexiwangroup/fleximanage/blob/master/OPENSOURCE.md).
