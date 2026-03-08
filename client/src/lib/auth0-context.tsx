import { createContext, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";

export const Auth0EnabledContext = createContext(false);

/** When Auth0 is enabled and user is logged in, this is user.sub (patient_id). Otherwise null. */
export const Auth0UserContext = createContext<string | null>(null);

/** Provides patient_id (user.sub) when inside Auth0Provider and authenticated. Use inside Auth0Provider only. */
export function Auth0UserProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth0();
  const patientId = isAuthenticated && user?.sub ? user.sub : null;
  return (
    <Auth0UserContext.Provider value={patientId}>
      {children}
    </Auth0UserContext.Provider>
  );
}
