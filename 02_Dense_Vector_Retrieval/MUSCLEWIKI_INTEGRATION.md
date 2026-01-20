# MuscleWiki API Integration Plan

## Overview

Integrate the [MuscleWiki API](https://api.musclewiki.com/documentation) into the Personal Wellness Assistant to add physical fitness recommendations alongside mental health support.

**Goal:** Create a holistic wellness RAG pipeline that connects mental states to appropriate physical exercises.

---

## Step 1: Understand What MuscleWiki Offers

The MuscleWiki API provides:

| Feature | RAG Value |
|---------|-----------|
| **1,700+ exercises** | Rich content for recommendations |
| **Step-by-step instructions** | Perfect for text embeddings |
| **Difficulty levels** | Match to user's fitness level |
| **Muscle group targeting** | Enable specific recommendations |
| **Equipment categories** | Filter for home/gym workouts |
| **Video demonstrations** | Supplement text responses |

**Key insight:** The `steps` field (instructions) is ideal for RAG - it contains detailed, actionable text.

---

## Step 2: Get API Access

1. Go to [RapidAPI](https://rapidapi.com) and search for MuscleWiki API
2. Subscribe to the API (free tier available)
3. Get your `X-RapidAPI-Key` from the dashboard

**Required headers for all requests:**
```
X-RapidAPI-Key: YOUR_KEY
X-RapidAPI-Host: musclewiki-api.p.rapidapi.com
```

**⚠️ Security:** Never hardcode API keys. Use environment variables or `getpass()`.

---

## Step 3: Data Ingestion Strategy

**Recommended approach:** Pre-load curated exercises into your vector database.

### Why pre-load?
- Faster query responses
- Works offline
- Can add mental health context to exercise descriptions
- Control over which exercises are included

### Alternative: On-demand API queries
- Fresher data
- But adds latency and API dependency

---

## Step 4: Design the MuscleWiki Loader Class

Follow the existing `TextFileLoader` pattern:

```python
class MuscleWikiLoader:
    def __init__(self, api_key: str, host: str = "musclewiki-api.p.rapidapi.com"):
        self.headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": host
        }
        self.base_url = f"https://{host}"
        self.documents = []
    
    def fetch_exercises(self, category=None, difficulty=None, muscles=None, limit=50):
        # Fetch exercises from API with filters
        pass
    
    def format_exercise_as_document(self, exercise: dict, mental_health_context: str = "") -> str:
        # Convert exercise JSON to embeddable text
        pass
    
    def load_documents(self) -> list:
        # Main interface matching existing loaders
        return self.documents
```

---

## Step 5: Mental Health ↔ Exercise Mappings

Map mental states to appropriate exercise types:

| Mental State | Recommended Exercise Types | MuscleWiki Filters |
|--------------|---------------------------|-------------------|
| **Stress/Anxiety** | Low-intensity, stretching | `difficulty=novice`, `category=bodyweight` |
| **Low Energy/Depression** | Mood-boosting compound movements | `force=push`, `mechanic=compound` |
| **Restlessness** | High-intensity, energy release | `difficulty=intermediate` or `advanced` |
| **Need for Focus** | Mind-muscle connection | `mechanic=isolation` |
| **Tension/Anger** | Heavy compound lifts | `force=push`, `category=barbell` |

---

## Step 6: Format Exercises for RAG

Transform API responses into documents optimized for embedding:

```
Exercise: {name}
Difficulty: {difficulty}
Equipment: {category}
Target Muscles: {primary_muscles}
Mental Health Benefit: {added context}

Instructions:
1. {step 1}
2. {step 2}
...

This exercise is helpful for: {mental health context}
```

Adding mental health context helps RAG retrieve exercises for mental health queries.

---

## Step 7: Curated Exercise Collections

### Stress Relief Collection
- Bodyweight stretches
- Low-intensity movements
- Breathing-focused exercises
- Query: `GET /exercises?category=bodyweight&difficulty=novice`

### Energy Boost Collection
- Compound movements
- Full-body exercises
- Medium intensity
- Query: `GET /exercises?mechanic=compound&difficulty=intermediate`

### Mood Improvement Collection
- Research-backed mood-boosting exercises
- Mix of cardio and strength
- Query: `GET /exercises?category=bodyweight&mechanic=compound`

---

## Step 8: Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mental Coach App                         │
├─────────────────────────────────────────────────────────────┤
│  User Query: "I'm feeling stressed and need to relax"       │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Unified Vector Database                    ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ ││
│  │  │Mental Health │  │  Wellness    │  │  MuscleWiki   │ ││
│  │  │   Content    │  │    Guide     │  │   Exercises   │ ││
│  │  └──────────────┘  └──────────────┘  └───────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
│                          ↓                                  │
│  Retrieved: Mental health tips + Relevant exercises         │
│                          ↓                                  │
│  LLM Response: Holistic recommendation (mind + body)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 9: Update RAG Prompts

Modify system prompt for holistic wellness:

```
You are a holistic wellness coach that addresses both mental health 
and physical fitness. When appropriate, recommend exercises alongside 
mental health strategies. Always consider:
- User's current mental state
- Appropriate exercise intensity for their mood
- The mind-body connection
- Safety disclaimers for physical activity
```

---

## Step 10: Implementation Checklist

- [ ] Set up RapidAPI key securely (environment variable)
- [ ] Test API connection with `/health` endpoint
- [ ] Create `MuscleWikiLoader` class
- [ ] Fetch and curate exercises for each mental health category
- [ ] Add mental health context to exercise documents
- [ ] Load exercises into vector database
- [ ] Test retrieval with mental health queries
- [ ] Update system prompts for holistic responses
- [ ] End-to-end testing

---

## Useful API Endpoints

| Endpoint | Use Case |
|----------|----------|
| `GET /health` | Test API connection |
| `GET /exercises` | List exercises with filters |
| `GET /exercises/{id}` | Get exercise details |
| `GET /search?q={query}` | Search exercises by name |
| `GET /categories` | List equipment categories |
| `GET /muscles` | List muscle groups |
| `GET /random` | Get random exercise |
| `GET /workouts/push` | Get push exercises |
| `GET /workouts/pull` | Get pull exercises |

---

## Resources

- [MuscleWiki API Documentation](https://api.musclewiki.com/documentation)
- [RapidAPI Dashboard](https://rapidapi.com/developer/dashboard)
