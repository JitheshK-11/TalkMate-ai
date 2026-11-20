import os
import json
from importlib import import_module

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import json
from typing import List
from routes.practice import router as practice_router
from routes.voice import router as voice_router

try:
    Groq = import_module("groq").Groq
except ModuleNotFoundError as error:
    if error.name != "groq":
        raise
    raise RuntimeError("Groq SDK is missing. Install it in this Python environment with: pip install groq") from error

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError("Please configure GROQ_API_KEY in backend/.env")

groq_client = Groq(api_key=GROQ_API_KEY)

if not GROQ_API_KEY :
    raise RuntimeError("Please configure  API key in backend/.env")

groq_client = Groq(api_key=GROQ_API_KEY)


app = FastAPI(title="TalkMate AI Backend")
app.include_router(practice_router)
app.include_router(voice_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EvaluationRequest(BaseModel):
    question: str
    transcript: str

class AssessmentAnswer(BaseModel):
    question: str
    transcript: str


class FullAssessmentRequest(BaseModel):
    answers: List[AssessmentAnswer]
    goal: str
    daily_minutes: int


@app.get("/")
def home():
    return {"message": "SpeakMate AI backend is running!"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.post("/api/assessment/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    allowed_types = [
        "audio/webm",
        "audio/wav",
        "audio/mpeg",
        "audio/mp4",
        "audio/ogg",
        "audio/x-m4a",
    ]
    content_type = (audio.content_type or "").split(";")[0].strip().lower()
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type: {audio.content_type}"
        )

    audio_bytes = await audio.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file exceeds 25 MB.")

    try:
        result = groq_client.audio.transcriptions.create(
            file=(audio.filename or "recording.webm", audio_bytes),
            model="whisper-large-v3-turbo",
            language="en",
            response_format="json",
            temperature=0.0,
        )

        return {"transcript": result.text}

    except Exception as error:
        print("Groq transcription error:", error)
        raise HTTPException(
            status_code=502,
            detail="Speech transcription failed. Please try again."
        )


@app.post("/api/assessment/evaluate")


@app.post("/api/assessment/evaluate")

@app.post("/api/assessment/evaluate")
def evaluate_answer(data: EvaluationRequest):

    if not data.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript is empty."
        )

    prompt = f"""
You are TalkMate AI, an expert English speaking coach.

Evaluate this student's English answer.

QUESTION:
{data.question}

STUDENT'S ANSWER:
{data.transcript}

Evaluate grammar, vocabulary, sentence formation and relevance.

Return a JSON object with these fields:

{{
    "overall_feedback": "Supportive feedback",
    "grammar_score": 0,
    "vocabulary_score": 0,
    "sentence_formation_score": 0,
    "relevance_score": 0,
    "strengths": ["strength 1", "strength 2"],
    "mistakes": [
        {{
            "original": "incorrect phrase",
            "correction": "correct phrase",
            "explanation": "simple explanation"
        }}
    ],
    "improved_answer": "Improved version of the student's answer",
    "practice_tip": "One specific practice exercise"
}}

Rules:
- Scores must be integers from 1 to 10.
- Be encouraging and specific.
- Do not invent grammar mistakes.
- Do not penalize simple English.
- If no clear mistakes exist, return an empty mistakes array.
- Never assign a pronunciation score from text alone.
- Return valid JSON only.
"""

    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": "You are SpeakMate AI. Evaluate English fairly and return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_completion_tokens=2000
        )

        result_text = response.choices[0].message.content

        if not result_text:
            raise ValueError("AI returned an empty response.")

        result = json.loads(result_text)

        return {
            "question": data.question,
            "transcript": data.transcript,
            "evaluation": result,
            "pronunciation_status": "Not assessed from transcript"
        }

    except Exception as error:
        print("Groq evaluation error:", error)

        raise HTTPException(
            status_code=502,
            detail="English evaluation failed. Please try again."
        )

@app.post("/api/assessment/evaluate-full")
def evaluate_full_assessment(data: FullAssessmentRequest):

    if len(data.answers) != 5:
        raise HTTPException(
            status_code=400,
            detail="Exactly five answers are required."
        )

    for index, answer in enumerate(data.answers):
        if not answer.transcript.strip():
            raise HTTPException(
                status_code=400,
                detail=f"Answer {index + 1} has an empty transcript."
            )

    # Combine all five answers
    answer_text = ""

    for index, answer in enumerate(data.answers):
        answer_text += f"""
QUESTION {index + 1}:
{answer.question}

STUDENT ANSWER:
{answer.transcript}

-------------------------
"""

    prompt = f"""
LEARNING GOAL:
{data.goal}

DAILY AVAILABLE PRACTICE TIME:
{data.daily_minutes} minutes
You are SpeakMate AI, an expert English communication
assessment specialist.

Analyze the student's complete speaking assessment.

Here are all five answers:

{answer_text}

Your task is to understand the student's overall English
communication ability rather than evaluating answers independently.

Evaluate these dimensions:

1. Grammar
2. Fluency indicators from transcript (pauses cannot be
   reliably measured from transcript alone)
3. Vocabulary
4. Sentence formation
5. Relevance and communication

Identify:

- Repeated grammar mistakes.
- Incorrect sentence patterns.
- Repeated vocabulary.
- Weak vocabulary usage.
- Incomplete sentences.
- Communication difficulties.
- Strengths.
- Most important areas to improve.

Return valid JSON with exactly this structure:

{{
  "overall_level": "Beginner / Elementary / Intermediate / Advanced",
  "overall_summary": "Detailed but simple assessment summary",

  "scores": {{
    "grammar": 0,
    "fluency_indicators": 0,
    "vocabulary": 0,
    "sentence_formation": 0,
    "communication": 0
  }},

  "strengths": [
    "Strength 1",
    "Strength 2"
  ],

  "weaknesses": [
    {{
      "area": "Grammar",
      "problem": "Description of weakness",
      "evidence": "Example from student's transcript",
      "priority": "High"
    }}
  ],

  "recurring_mistakes": [
    {{
      "mistake": "Incorrect sentence or repeated pattern",
      "correction": "Correct version",
      "explanation": "Simple explanation",
      "occurrences": "Observed frequency or examples"
    }}
  ],

  "vocabulary_analysis": {{
    "observations": "Description of vocabulary usage",
    "suggestions": [
      "Suggested vocabulary improvement"
    ]
  }},

  "learning_priorities": [
    {{
      "skill": "Grammar",
      "reason": "Why this needs improvement",
      "recommended_activity": "What the learner should practise"
    }}
  ],

  "recommended_focus": "The most important skill to improve first"
"personalized_roadmap": [
    "estimated_duration": "Estimated time needed to work toward the learner's goal",
    "daily_minutes": 30,
    "daily_session": [
        {{
            "activity": "Grammar practice",
            "duration_minutes": 5,
            "description": "Practice based on identified weaknesses"
        }}
    ],
    "milestones": [
        {{
            "stage": "Foundation",
            "focus": "Improve sentence formation",
            "success_criteria": "Produce clearer and more accurate sentences"
        }}
    ],
    "adaptation_rules": [
        "Increase difficulty when the learner consistently performs well",
        "Provide additional practice when recurring mistakes continue"
    ]
]
}}

IMPORTANT RULES:

- All scores must be integers from 1 to 10.
- Be fair and supportive.
- Use evidence from the five answers.
- Do not invent mistakes.
- Do not penalize simple English unnecessarily.
- Do not confuse lack of vocabulary with grammar mistakes.
- Do not claim to measure pronunciation from transcripts.
- Do not claim to measure actual speaking speed or pauses from text.
- Use the five answers together to identify repeated patterns.
- If evidence is insufficient, mention that clearly.
- Return valid JSON only.
- Personalize the roadmap using the learner's learning goal.
- Respect the learner's available daily practice time.
- Estimate the learning duration based on current ability and target.
- Do not force a fixed 30-day learning plan.
- Make the roadmap adaptive to future assessment results.
- Ensure daily activity durations add up to the available practice time.
- Never promise guaranteed fluency within a specific period.
"""

    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are TalkMate AI. "
                        "You provide evidence-based English "
                        "communication assessments. "
                        "Return valid JSON only."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_completion_tokens=4000
        )

        result_text = response.choices[0].message.content

        if not result_text:
            raise ValueError("AI returned an empty response.")

        result = json.loads(result_text)

        return {
            "status": "success",
            "total_answers": len(data.answers),
            "assessment_report": result
        }

    except Exception as error:
        print("Full assessment error:", error)

        raise HTTPException(
            status_code=502,
            detail="Complete assessment evaluation failed."
        )
    
