import os
import json
import logging
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class ARIAEngine:
    """
    ARIA (Advanced Reasoning & Intelligence Assistant)
    Optimized for hybrid environments:
    - Uses OpenAI or Groq if API keys are provided in .env (highly capable).
    - Falls back to local Ollama (qwen:0.5b/tinyllama) for offline Raspberry Pi 4 environment.
    """
    
    def __init__(self):
        self.ollama_url = os.getenv("AI_URL", "http://127.0.0.1:11434/api/generate")
        self.ollama_model = os.getenv("AI_MODEL", "qwen:0.5b")
        
        self.system_prompt = """[SYSTEM INSTRUCTIONS]
You are Molly, the intelligent AI Assistant for the Smart IoT Attendance System at Northern Technical University (NTU).
If asked "who are you" or about your identity, you must always state: "I am your assistant Molly."

[SYSTEM CONFIGURATION & ARCHITECTURE DETAILS]
- Hardware: Raspberry Pi 4 (4GB RAM) acting as a standalone offline local server, and ESP32 microcontrollers with RC522 RFID scanners.
- Network: The Pi runs hostapd (SSID: "SmartAttendance", password: "university-admin") and dnsmasq (acting as DHCP and DNS server, mapping all domains via captive portal redirection address=/#/192.168.4.1 to the Pi).
- Web Server: Nginx serves the React frontend (compiled static files in /home/shadow/smart_Iot_Project/frontend/build) at the local domain "http://otu.university". It routes "/api" requests to port 8000.
- Backend: Python FastAPI server running on Uvicorn, managed as a daemon service by PM2.
- Database: Local PostgreSQL database (asyncpg connection).
- Android App: Native Kotlin application with offline caching (Room DB) and JWT credentials storage (DataStore) that communicates with "http://otu.university/api/".
- IoT Data Loop: ESP32 reads RFID cards using RC522 and sends payload to "192.168.4.1:8000/api/iot/scan".
- Frontend Navigation Structure:
  - `/dashboard`: Overall metrics and statistics.
  - `/students`: Manage students directory and profiles.
  - `/faculties` & `/departments/:id`: Set up academic departments.
  - `/courses` & `/courses/:id`: Define academic courses.
  - `/sessions`: Start/stop lab class sessions.
  - `/reports`: Export attendance logs to CSV.
  - `/devices`: Check RFID scanner health and battery status.
  - `/monitoring`: System configuration, Emergency Lockdown toggle, Data Purge, and Audit logs.

[ROLE DEFINITIONS & RESPONSIBILITIES]
1. Sovereign (Super Admin):
   - Capabilities: Manage system-wide configurations, toggle Emergency Lockdown (which restricts login access), grant override privileges, and audit system-wide security logs.
2. Operations (Admin):
   - Capabilities: Approve/reject student registrations, manage course listings, view global attendance statistics, blocklist/allowlist students, and monitor IoT device health.
3. Academic (Doctor/Professor):
   - IMPORTANT: "Doctors" are university professors/faculty members. They are NOT medical doctors. Do not discuss medical advice, clinical records, or health diagnostics.
   - Capabilities: Manage course syllabus/blueprints, schedule assessments (quizzes, midterms, practicals, finals), view student grades, and track academic performance.
4. Technical (Instructor/Engineer):
   - Capabilities: Manage hardware diagnostics, start/stop lab sessions, check RFID reader connection/battery status, and manually override attendance if RFID cards fail.
5. Student:
   - Capabilities: View personal attendance logs, current GPA, enrollment details, and class schedules.

[STRICT GUIDELINES]
1. Factual Verification: Answer queries using the provided [CONTEXT] and the SYSTEM DETAILS above. If information is missing, state: "I do not have this information in my database." Then, guide the user on how they can find or add it based on their role's navigation guidelines.
2. Terminology: Never refer to Doctors as medical physicians.
3. Privacy & Security: Do not expose raw database IDs, password hashes, or security tokens.
4. Professional tone: Be precise, helpful, and clear. Use neat formatting like bullet points or bold text where appropriate.
"""

    async def generate_response(self, question: str, context: dict) -> str:
        """Generates a detailed, context-aware response using hybrid LLM clients."""
        role = context.get("role", "Professional")
        clean_context = self._minify_context(context)
        
        prompt = f"""{self.system_prompt}

[USER IDENTITY]
User Role: {role.upper()}

[CONTEXT]
{clean_context}

[USER QUESTION]
{question}

[ARIA RESPONSE]:"""
        
        # Check settings for keys
        openai_key = settings.OPENAI_API_KEY
        groq_key = settings.GROQ_API_KEY
        
        if openai_key:
            logger.info("Routing query to OpenAI...")
            response = await self._call_openai(prompt, openai_key)
            if response:
                return response
        
        if groq_key:
            logger.info("Routing query to Groq...")
            response = await self._call_groq(prompt, groq_key)
            if response:
                return response
                
        # Fallback to local Ollama
        logger.info("No cloud keys available or call failed. Routing query to local Ollama...")
        return await self._call_ollama(prompt)

    def _minify_context(self, context: dict) -> str:
        """Converts context dictionary into readable sentences for LLM input."""
        sentences = []
        for key, value in context.items():
            if key in ["role", "system_policies", "recent_logs"]:
                continue
            clean_key = key.replace("_", " ").strip().capitalize()
            sentences.append(f"{clean_key} is {value}.")
        
        if "system_policies" in context:
            for cat, actions in context["system_policies"].items():
                for act, path in actions.items():
                    sentences.append(f"To {act.replace('_', ' ')}, {path}.")
        
        return " ".join(sentences)

    async def _call_openai(self, prompt: str, api_key: str) -> str:
        """Calls OpenAI Chat API via HTTPX."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 250
                    },
                    timeout=15.0
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    logger.warning(f"OpenAI API error ({response.status_code}): {response.text}")
        except Exception as e:
            logger.error(f"OpenAI Request failed: {e}")
        return None

    async def _call_groq(self, prompt: str, api_key: str) -> str:
        """Calls Groq API via HTTPX."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama3-8b-8192",
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 250
                    },
                    timeout=15.0
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    logger.warning(f"Groq API error ({response.status_code}): {response.text}")
        except Exception as e:
            logger.error(f"Groq Request failed: {e}")
        return None

    async def _call_ollama(self, prompt: str) -> str:
        """Communicates with the local Ollama instance."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.ollama_url,
                    json={
                        "model": self.ollama_model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.0,
                            "num_predict": 150,
                            "stop": ["[USER]", "CONTEXT:", "###"]
                        }
                    },
                    timeout=45.0
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("response", "I could not generate a response.")
                else:
                    logger.warning(f"Ollama error ({response.status_code}): {response.text}")
                    return "My reasoning engine is momentarily offline. Ensure Ollama is running on the Pi."
        except httpx.ConnectError:
            logger.error("Failed to connect to Ollama.")
            return "I am currently offline. Please ensure Ollama is installed and running on the local server, or configure online API keys in your environment."
        except httpx.ReadTimeout:
            logger.error("Ollama inference timed out.")
            return "That request took too long to process on local hardware. Could you ask something simpler?"
        except Exception as e:
            logger.error(f"Failed to connect to local AI provider: {e}")
            return "I'm having trouble reaching my neural core. Please check the system logs."

aria_engine = ARIAEngine()
