# Auth0 Setup (MLH – Best Use of Auth0)

## Why does the login page say "Sign Up to dev-xxxxx to continue to Moha"?

That screen is **Auth0 Universal Login**. The first part is your **Auth0 tenant** name (e.g. `dev-wrrmvshcm6okdzli`). **"Moha"** (or whatever you see) is the **Application name** you set in the Auth0 Dashboard. To change it:

1. Auth0 Dashboard → **Applications** → **Applications** → your app.
2. **Settings** → **Application Name** → set to e.g. **"Lumina Health"** → Save.

You can also customize the look and copy under **Branding** → **Universal Login**.

---

This app uses [Auth0](https://auth0.com) for secure sign-in and user identity. Auth0 provides social login, MFA, and passwordless options out of the box.

## 1. Create an Auth0 account and application

1. Sign up at [auth0.com](https://auth0.com) (free tier: 7,000 active users, unlimited logins).
2. In the Dashboard, go to **Applications** → **Applications** → **Create Application**.
3. Choose **Single Page Application** → Create.
4. Note your **Domain** and **Client ID** from the application **Settings**.

## 2. Configure Application URIs

In your Auth0 Application **Settings**:

- **Allowed Callback URLs**:  
  `http://localhost:5000` (dev)  
  Add your production URL when you deploy, e.g. `https://your-app.com`.
- **Allowed Logout URLs**:  
  `http://localhost:5000`  
  Add production URL if needed.
- **Allowed Web Origins**:  
  `http://localhost:5000`  
  Add production URL if needed.

Save changes.

## 3. Environment variables

### Frontend (Vite)

Create or edit `.env` in the project root (or set in your host, e.g. Replit Secrets). The Vite dev server runs on port 5000 by default.

```env
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id_here
```

- `VITE_AUTH0_DOMAIN` – Your Auth0 tenant domain (e.g. `dev-xxxx.us.auth0.com`).
- `VITE_AUTH0_CLIENT_ID` – The Client ID of your Single Page Application.

Optional (for API authorization later):

```env
VITE_AUTH0_AUDIENCE=your_api_identifier
```

Restart the Vite dev server after changing `.env`.

### Backend (optional)

If you want the backend to expose Auth0 config via `/frontend-config` or to validate tokens later:

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_client_id_here
```

## 4. Run the app

1. Set the env vars above.
2. Start the backend (e.g. `uvicorn backend.main:app` or your usual command).
3. Start the frontend: `npm run dev`.
4. Open the app (e.g. `http://localhost:5000`). You should see **Log in** in the navbar when Auth0 is configured.
5. Click **Log in** → redirect to Auth0 → sign up or sign in → redirect back to the app. Your avatar/name and **Log out** appear when authenticated.

## 5. What’s implemented

- **Auth0 React SDK** (`@auth0/auth0-react`): `Auth0Provider`, `useAuth0`.
- **Navbar**: Log in (redirect to Auth0), user avatar/name, Log out.
- **i18n**: “Log in”, “Log out”, “Profile” in EN/FR/ES.
- **Graceful fallback**: If `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` are not set, the app runs without Auth0 (no Login/Logout in the navbar).

For more: [Auth0 SPA Quickstart](https://auth0.com/docs/quickstart/spa), [MLH Auth0 guides](https://mlh.link/auth0-MLH-guides).
