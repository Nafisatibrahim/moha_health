import "./i18n";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { Auth0EnabledContext } from "@/lib/auth0-context";
import App from "./App";
import "./index.css";

const domain = import.meta.env.VITE_AUTH0_DOMAIN ?? "";
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID ?? "";
const redirectUri = typeof window !== "undefined" ? window.location.origin : undefined;
const auth0Enabled = Boolean(domain && clientId && redirectUri);

const root = createRoot(document.getElementById("root")!);

if (auth0Enabled) {
  root.render(
    <Auth0EnabledContext.Provider value={true}>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: redirectUri!,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE || undefined,
        }}
        cacheLocation="localstorage"
        useRefreshTokens={true}
      >
        <App />
      </Auth0Provider>
    </Auth0EnabledContext.Provider>
  );
} else {
  root.render(
    <Auth0EnabledContext.Provider value={false}>
      <App />
    </Auth0EnabledContext.Provider>
  );
}
