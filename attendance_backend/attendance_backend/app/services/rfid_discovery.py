import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

class RFIDDiscoveryService:
    def __init__(self):
        self.current_token: Optional[str] = None
        self.captured_uid: Optional[str] = None
        self.expires_at: Optional[datetime] = None

    def start_session(self) -> str:
        """Starts a new discovery session and returns a random 6-char token."""
        self.current_token = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        self.captured_uid = None
        self.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        return self.current_token

    def capture_uid(self, uid: str) -> bool:
        """Captures a UID if a session is currently active and not yet captured."""
        if self._is_active() and not self.captured_uid:
            self.captured_uid = uid
            return True
        return False

    def check_session(self, token: str) -> Optional[str]:
        """Returns the captured UID if the token matches and session is active."""
        if self._is_active() and self.current_token == token:
            return self.captured_uid
        return None

    def _is_active(self) -> bool:
        """Checks if the discovery session is still valid (not expired)."""
        if not self.expires_at:
            return False
        return datetime.now(timezone.utc) < self.expires_at

# Singleton instance for global state
rfid_discovery = RFIDDiscoveryService()
