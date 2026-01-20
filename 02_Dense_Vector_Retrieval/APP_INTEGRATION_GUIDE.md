# Integrating the Wellness Assistant into Your App

This guide shows how to integrate the RAG-based wellness assistant (with MuscleWiki exercises) into your existing application.

---

## Overview

You'll be integrating these components from `02_Dense_Vector_Retrieval`:

| Component | File | Purpose |
|-----------|------|---------|
| `VectorDatabase` | `aimakerspace/vectordatabase.py` | Store and search embeddings |
| `EmbeddingModel` | `aimakerspace/openai_utils/embedding.py` | Generate embeddings |
| `ChatOpenAI` | `aimakerspace/openai_utils/chatmodel.py` | LLM interface |
| `Prompt Classes` | `aimakerspace/openai_utils/prompts.py` | Prompt templates |
| `TextFileLoader` | `aimakerspace/text_utils.py` | Load documents |
| `MuscleWikiLoader` | From notebook | Load exercises from API |
| `RetrievalAugmentedQAPipeline` | From notebook | RAG pipeline |

---

## Option 1: Copy the `aimakerspace` Module (Simplest)

### Step 1: Copy the module to your app

```bash
# From your app's root directory
cp -r /path/to/AIE9/02_Dense_Vector_Retrieval/aimakerspace ./aimakerspace
```

### Step 2: Create `wellness_assistant.py` in your app

```python
"""
Wellness Assistant with MuscleWiki Integration
Copy this file to your app's directory
"""
import os
import asyncio
import requests
from typing import List, Dict, Optional

# Import from the aimakerspace module
from aimakerspace.text_utils import TextFileLoader, CharacterTextSplitter
from aimakerspace.vectordatabase import VectorDatabase
from aimakerspace.openai_utils.prompts import SystemRolePrompt, UserRolePrompt
from aimakerspace.openai_utils.chatmodel import ChatOpenAI


# ============================================
# MENTAL HEALTH TO EXERCISE MAPPINGS
# ============================================
MENTAL_HEALTH_EXERCISE_MAP = {
    "stress_relief": {
        "filters": {"category": "bodyweight", "difficulty": "novice"},
        "context": "This exercise is helpful for stress relief and relaxation."
    },
    "energy_boost": {
        "filters": {"mechanic": "compound", "difficulty": "intermediate"},
        "context": "This exercise is great for boosting energy and improving mood."
    },
    "anxiety_reduction": {
        "filters": {"category": "bodyweight", "difficulty": "novice"},
        "context": "This exercise can help reduce anxiety through focused movement."
    },
    "mood_improvement": {
        "filters": {"category": "bodyweight", "mechanic": "compound"},
        "context": "This exercise supports mood improvement through endorphin release."
    },
    "tension_release": {
        "filters": {"category": "bodyweight"},
        "context": "This exercise helps release physical tension stored in muscles."
    }
}


# ============================================
# MUSCLEWIKI LOADER
# ============================================
class MuscleWikiLoader:
    """Loads exercises from MuscleWiki API for RAG."""
    
    def __init__(self, api_key: str, host: str = "musclewiki-api.p.rapidapi.com"):
        self.documents = []
        self.headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": host
        }
        self.base_url = f"https://{host}"
    
    def fetch_exercises(self, category=None, difficulty=None, mechanic=None, limit=20):
        params = {"limit": limit}
        if category: params["category"] = category
        if difficulty: params["difficulty"] = difficulty
        if mechanic: params["mechanic"] = mechanic
        
        response = requests.get(
            f"{self.base_url}/exercises",
            headers=self.headers,
            params=params
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])
        return []
    
    def get_exercise_details(self, exercise_id: int):
        response = requests.get(
            f"{self.base_url}/exercises/{exercise_id}",
            headers=self.headers
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def format_exercise_as_document(self, exercise, mental_health_context=""):
        if 'steps' not in exercise:
            exercise = self.get_exercise_details(exercise['id']) or exercise
        
        doc_parts = [
            f"Exercise: {exercise.get('name', 'Unknown')}",
            f"Difficulty: {exercise.get('difficulty', 'Not specified')}",
            f"Equipment: {exercise.get('category', 'Not specified')}",
            f"Target Muscles: {', '.join(exercise.get('primary_muscles', ['Not specified']))}",
        ]
        
        steps = exercise.get('steps', [])
        if steps:
            doc_parts.append("\nInstructions:")
            for i, step in enumerate(steps, 1):
                doc_parts.append(f"{i}. {step}")
        
        if mental_health_context:
            doc_parts.append(f"\nMental Health Benefit: {mental_health_context}")
        
        return "\n".join(doc_parts)
    
    def load_for_mental_health(self, category: str, limit: int = 10):
        if category not in MENTAL_HEALTH_EXERCISE_MAP:
            return
        
        config = MENTAL_HEALTH_EXERCISE_MAP[category]
        exercises = self.fetch_exercises(**config["filters"], limit=limit)
        
        for exercise in exercises:
            doc = self.format_exercise_as_document(exercise, config["context"])
            self.documents.append(doc)
    
    def load_all_categories(self, limit_per_category: int = 5):
        for category in MENTAL_HEALTH_EXERCISE_MAP:
            self.load_for_mental_health(category, limit=limit_per_category)
    
    def load_documents(self):
        return self.documents


# ============================================
# RAG PIPELINE
# ============================================
RAG_SYSTEM_TEMPLATE = """You are a holistic wellness assistant that provides both mental health support and physical fitness recommendations.

Instructions:
- Answer questions using the provided context
- Recommend exercises when appropriate for mental health concerns
- Be supportive and encouraging
- Include safety reminders for physical activity
- Suggest consulting healthcare professionals when appropriate"""

RAG_USER_TEMPLATE = """Context:
{context}

Question: {user_query}

Please provide a helpful, holistic response."""


class WellnessAssistant:
    """Main wellness assistant with RAG capabilities."""
    
    def __init__(
        self,
        openai_api_key: str,
        rapidapi_key: str = None,
        wellness_data_path: str = None
    ):
        # Set API keys
        os.environ["OPENAI_API_KEY"] = openai_api_key
        
        # Initialize components
        self.llm = ChatOpenAI()
        self.vector_db = VectorDatabase()
        self.text_splitter = CharacterTextSplitter()
        
        # Initialize prompts
        self.system_prompt = SystemRolePrompt(RAG_SYSTEM_TEMPLATE)
        self.user_prompt = UserRolePrompt(RAG_USER_TEMPLATE)
        
        # Load data
        self.documents = []
        
        # Load wellness guide if provided
        if wellness_data_path:
            loader = TextFileLoader(wellness_data_path)
            self.documents.extend(loader.load_documents())
        
        # Load MuscleWiki exercises if API key provided
        if rapidapi_key:
            muscle_loader = MuscleWikiLoader(api_key=rapidapi_key)
            muscle_loader.load_all_categories(limit_per_category=5)
            self.documents.extend(muscle_loader.load_documents())
        
        self._build_index()
    
    def _build_index(self):
        """Build the vector database index."""
        if self.documents:
            chunks = self.text_splitter.split_texts(self.documents)
            # Use nest_asyncio if in notebook environment
            try:
                import nest_asyncio
                nest_asyncio.apply()
            except ImportError:
                pass
            
            asyncio.run(self.vector_db.abuild_from_list(chunks))
    
    def query(self, question: str, k: int = 5) -> str:
        """Query the wellness assistant."""
        # Retrieve relevant context
        results = self.vector_db.search_by_text(question, k=k)
        
        # Build context string
        context = "\n\n".join([text for text, score in results])
        
        # Create messages
        messages = [
            self.system_prompt.create_message(),
            self.user_prompt.create_message(context=context, user_query=question)
        ]
        
        # Get response
        return self.llm.run(messages)
    
    def add_documents(self, documents: List[str]):
        """Add more documents to the knowledge base."""
        self.documents.extend(documents)
        self._build_index()


# ============================================
# USAGE EXAMPLE
# ============================================
if __name__ == "__main__":
    # Initialize the assistant
    assistant = WellnessAssistant(
        openai_api_key="your-openai-key",
        rapidapi_key="your-rapidapi-key",  # Optional
        wellness_data_path="data/HealthWellnessGuide.txt"  # Optional
    )
    
    # Query the assistant
    response = assistant.query(
        "I'm feeling stressed and anxious. What can I do to feel better?"
    )
    print(response)
```

### Step 3: Install dependencies

Add to your app's `requirements.txt`:
```
openai>=1.0.0
numpy
requests
nest-asyncio
```

### Step 4: Use in your app

```python
from wellness_assistant import WellnessAssistant

# Initialize once (e.g., in app startup)
assistant = WellnessAssistant(
    openai_api_key=os.environ["OPENAI_API_KEY"],
    rapidapi_key=os.environ.get("RAPIDAPI_KEY"),  # Optional
    wellness_data_path="path/to/wellness_guide.txt"
)

# Use in your endpoint/handler
def handle_user_message(user_message: str) -> str:
    return assistant.query(user_message)
```

---

## Option 2: Create an API Endpoint (For Web Apps)

If your app is a web application (FastAPI, Flask, etc.), create an API endpoint:

### FastAPI Example

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from wellness_assistant import WellnessAssistant
import os

app = FastAPI()

# Initialize assistant on startup
assistant = WellnessAssistant(
    openai_api_key=os.environ["OPENAI_API_KEY"],
    rapidapi_key=os.environ.get("RAPIDAPI_KEY"),
)

class QueryRequest(BaseModel):
    question: str
    context_count: int = 5

class QueryResponse(BaseModel):
    response: str

@app.post("/wellness/query", response_model=QueryResponse)
async def query_wellness(request: QueryRequest):
    try:
        response = assistant.query(request.question, k=request.context_count)
        return QueryResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/wellness/health")
async def health_check():
    return {"status": "healthy", "documents_loaded": len(assistant.documents)}
```

### Flask Example

```python
from flask import Flask, request, jsonify
from wellness_assistant import WellnessAssistant
import os

app = Flask(__name__)

assistant = WellnessAssistant(
    openai_api_key=os.environ["OPENAI_API_KEY"],
    rapidapi_key=os.environ.get("RAPIDAPI_KEY"),
)

@app.route("/wellness/query", methods=["POST"])
def query_wellness():
    data = request.json
    question = data.get("question", "")
    
    if not question:
        return jsonify({"error": "Question required"}), 400
    
    response = assistant.query(question)
    return jsonify({"response": response})

if __name__ == "__main__":
    app.run(debug=True)
```

---

## Option 3: Streamlit Integration

If your app uses Streamlit:

```python
import streamlit as st
from wellness_assistant import WellnessAssistant
import os

st.title("🧘 Holistic Wellness Assistant")

# Initialize assistant (cached)
@st.cache_resource
def get_assistant():
    return WellnessAssistant(
        openai_api_key=os.environ["OPENAI_API_KEY"],
        rapidapi_key=os.environ.get("RAPIDAPI_KEY"),
    )

assistant = get_assistant()

# Chat interface
if "messages" not in st.session_state:
    st.session_state.messages = []

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if prompt := st.chat_input("How are you feeling today?"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
    
    with st.chat_message("assistant"):
        response = assistant.query(prompt)
        st.markdown(response)
    
    st.session_state.messages.append({"role": "assistant", "content": response})
```

---

## Environment Variables

Set these in your deployment environment:

```bash
# Required
export OPENAI_API_KEY="sk-..."

# Optional (for MuscleWiki exercises)
export RAPIDAPI_KEY="your-rapidapi-key"
```

For Vercel, add these in Project Settings → Environment Variables.

---

## File Structure After Integration

```
your-app/
├── aimakerspace/           # Copied from 02_Dense_Vector_Retrieval
│   ├── __init__.py
│   ├── vectordatabase.py
│   ├── text_utils.py
│   └── openai_utils/
│       ├── __init__.py
│       ├── chatmodel.py
│       ├── embedding.py
│       └── prompts.py
├── wellness_assistant.py   # Main assistant class
├── data/
│   └── HealthWellnessGuide.txt  # Optional: wellness content
├── app.py                  # Your main app
└── requirements.txt
```

---

## Testing the Integration

```python
# test_integration.py
from wellness_assistant import WellnessAssistant
import os

def test_wellness_assistant():
    assistant = WellnessAssistant(
        openai_api_key=os.environ["OPENAI_API_KEY"],
        rapidapi_key=os.environ.get("RAPIDAPI_KEY"),
    )
    
    # Test queries
    test_queries = [
        "I'm feeling stressed. What should I do?",
        "What exercises can help with anxiety?",
        "How can I improve my sleep?",
        "I need more energy. Any suggestions?",
    ]
    
    for query in test_queries:
        print(f"\n{'='*50}")
        print(f"Q: {query}")
        print(f"{'='*50}")
        response = assistant.query(query)
        print(f"A: {response[:500]}...")

if __name__ == "__main__":
    test_wellness_assistant()
```

---

## Next Steps

1. Copy the `aimakerspace` folder to your app
2. Create `wellness_assistant.py` with the code above
3. Integrate into your app's UI/API
4. Set environment variables
5. Deploy!

Need help with a specific integration? Let me know your app's framework (FastAPI, Flask, Streamlit, Next.js, etc.)!
