import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { monitoringApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function TelemetryTracker() {
  const location = useLocation();
  const { token } = useAuth();
  
  // To batch telemetry events
  const queueRef = useRef([]);
  // Ref to store timer
  const timerRef = useRef(null);

  useEffect(() => {
    // Only track if logged in
    if (!token) return;

    // Build event
    const event = {
      action_type: 'NAVIGATE',
      path: location.pathname + location.search,
      description: `Navigated to ${location.pathname}`,
    };

    queueRef.current.push(event);

    // Debounce the API call so rapid clicks aren't spamming, batch them every 3 seconds
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        if (queueRef.current.length > 0) {
          // Send batch
          const batch = [...queueRef.current];
          queueRef.current = [];
          
          monitoringApi.logTelemetry(batch).catch(e => {
            // Silently ignore telemetry failure to avoid console spam
          });
        }
        timerRef.current = null;
      }, 3000);
    }
    
    return () => {
      // Cleanup happens on unmount, but don't flush immediately to avoid unmount bugs,
      // it handles naturally.
    };
  }, [location.pathname, location.search, token]);

  // Expose manual tracking method to window so we can trigger it inside non-hook areas
  // or components could import a helper function if needed.
  useEffect(() => {
    window.trackAction = (action_type, description, details_json = null) => {
      if (!token) return;
      const event = {
        action_type,
        path: window.location.pathname,
        description,
        details_json
      };
      
      monitoringApi.logTelemetry([event]).catch(e => {});
    };
  }, [token]);

  return null; // Silent render
}
