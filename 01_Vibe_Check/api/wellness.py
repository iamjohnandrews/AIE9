"""
Wellness Assistant API Endpoint for Vercel
Provides mental health support and exercise recommendations
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# Add the api directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from aimakerspace.openai_utils.chatmodel import ChatOpenAI
from aimakerspace.openai_utils.prompts import SystemRolePrompt, UserRolePrompt

# Cache for the assistant instance
_assistant = None


SYSTEM_PROMPT = """You are a holistic wellness assistant that provides both mental health support and physical fitness recommendations.

Your capabilities:
- Provide mental health support and stress management techniques
- Recommend exercises appropriate for different mental states
- Offer breathing exercises and mindfulness techniques
- Give nutrition and sleep hygiene advice
- Suggest lifestyle improvements for overall wellbeing

Guidelines:
- Be warm, supportive, and encouraging
- Provide practical, actionable advice
- When recommending exercises, consider the user's mental state:
  * For stress/anxiety: suggest gentle movements, stretching, breathing exercises
  * For low energy: suggest energizing compound movements
  * For tension: suggest progressive muscle relaxation, stretching
- Always remind users to consult healthcare professionals for medical concerns
- Include safety reminders for physical activity when appropriate

Exercise recommendations by mental state:
- Stress Relief: Bench Dips, Glute Bridges, gentle stretching (bodyweight, novice)
- Energy Boost: Squats, Push-ups, Lunges (compound movements)
- Anxiety Reduction: Deep breathing, Progressive muscle relaxation, slow stretching
- Mood Improvement: Walking, Dancing, any enjoyable physical activity
- Tension Release: Neck rolls, Shoulder shrugs, full body stretching"""


class WellnessAssistant:
    """Simple wellness assistant for API use."""
    
    def __init__(self):
        self.llm = ChatOpenAI()
        self.system_prompt = SystemRolePrompt(SYSTEM_PROMPT)
        self.user_prompt = UserRolePrompt("{question}")
    
    def query(self, question: str) -> str:
        """Process a wellness query and return a response."""
        messages = [
            self.system_prompt.create_message(),
            self.user_prompt.create_message(question=question)
        ]
        return self.llm.run(messages)


def get_assistant():
    """Get or create the assistant instance (singleton pattern)."""
    global _assistant
    if _assistant is None:
        _assistant = WellnessAssistant()
    return _assistant


class handler(BaseHTTPRequestHandler):
    """Vercel serverless function handler."""
    
    def do_POST(self):
        """Handle POST requests for wellness queries."""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body) if body else {}
            
            question = data.get('question', '').strip()
            
            if not question:
                self._send_response(400, {'error': 'Question is required'})
                return
            
            assistant = get_assistant()
            response = assistant.query(question)
            
            self._send_response(200, {'response': response})
            
        except json.JSONDecodeError:
            self._send_response(400, {'error': 'Invalid JSON'})
        except Exception as e:
            self._send_response(500, {'error': str(e)})
    
    def do_GET(self):
        """Handle GET requests for health check."""
        self._send_response(200, {
            'status': 'healthy',
            'service': 'wellness-assistant',
            'version': '1.0.0'
        })
    
    def _send_response(self, status_code: int, data: dict):
        """Helper to send JSON response."""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
