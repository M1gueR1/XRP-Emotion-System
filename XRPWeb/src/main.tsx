import {
  StrictMode,
  useEffect,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  GoogleOAuthProvider,
} from "@react-oauth/google";

import "@/index.css";
import "@/utils/i18n";
import "@/utils/blockly-global";

import App from "@/App.tsx";
import { ThemeInit } from "../.flowbite-react/init";


function Root() {
  const [
    googleClientId,
    setGoogleClientId,
  ] = useState<string | null>(null);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  const googleAuthBackendUrl =
    import.meta.env.GOOGLE_AUTH_URL as
      | string
      | undefined;

  useEffect(() => {
    let cancelled = false;

    const fetchClientId = async () => {
      /*
       * The deployed version receives GOOGLE_AUTH_URL
       * from its environment. A local clone may not have it.
       */
      if (!googleAuthBackendUrl) {
        console.warn(
          "GOOGLE_AUTH_URL is not configured. " +
            "Using local development authentication."
        );

        if (!cancelled) {
          setGoogleClientId(
            "local-development-client-id"
          );
          setAuthLoading(false);
        }

        return;
      }

      try {
        const response = await fetch(
          `${googleAuthBackendUrl}` +
            "/google-auth/client-id"
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch Google client ID: ` +
              `${response.status} ` +
              `${response.statusText}`
          );
        }

        const data: unknown =
          await response.json();

        if (
          typeof data !== "object" ||
          data === null ||
          !("client_id" in data) ||
          typeof data.client_id !== "string"
        ) {
          throw new Error(
            "Authentication backend returned " +
              "an invalid client ID."
          );
        }

        if (!cancelled) {
          setGoogleClientId(
            data.client_id
          );
        }
      } catch (error) {
        console.error(
          "Error loading Google authentication:",
          error
        );

        /*
         * Allow local development to continue.
         * The Google login button itself will not work
         * until the real authentication URL is configured.
         */
        if (
          import.meta.env.DEV &&
          !cancelled
        ) {
          setGoogleClientId(
            "local-development-client-id"
          );
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    void fetchClientId();

    return () => {
      cancelled = true;
    };
  }, [googleAuthBackendUrl]);

  if (authLoading) {
    return (
      <div>
        Loading Google authentication...
      </div>
    );
  }

  if (!googleClientId) {
    return (
      <div>
        Google authentication could not be loaded.
      </div>
    );
  }

  return (
    <GoogleOAuthProvider
      clientId={googleClientId}
    >
      <StrictMode>
        <ThemeInit />
        <App />
      </StrictMode>
    </GoogleOAuthProvider>
  );
}


createRoot(
  document.getElementById("root")!
).render(<Root />);