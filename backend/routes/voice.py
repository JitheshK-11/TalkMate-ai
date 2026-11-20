
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from groq import Groq
import json

# Load backend environment variables
BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError("GROQ_API_KEY is missing from backend/.env")

client = Groq(api_key=api_key)

router = APIRouter(
    prefix="/api/voice",
    tags=["AI Voice Tutor"]
)


# Request model for tutor conversation
class VoiceReplyRequest(BaseModel):
    transcript: str
    history: list[dict] = []
    english_level: str = "Beginner"
    learning_goal: str = "English Fluency"
    assessment_context: str = ""


# 1. Convert learner's audio into text
@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):

    try:
        audio_bytes = await audio.read()

        if not audio_bytes:
            raise HTTPException(
                status_code=400,
                detail="No audio was received."
            )

        transcription = client.audio.transcriptions.create(
            file=(
                audio.filename or "recording.webm",
                audio_bytes,
                audio.content_type or "audio/webm"
            ),
            model="whisper-large-v3-turbo",
            response_format="json",
            language="en",
            temperature=0
        )

        return {
            "transcript": transcription.text
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


# 2. Generate the AI tutor's response
@router.post("/reply")
async def generate_tutor_reply(request: VoiceReplyRequest):

    try:
        system_prompt = f"""

You are TalkMate, a friendly, intelligent and patient English-speaking tutor.

LEARNER PROFILE:
English level: {request.english_level}
Learning goal: {request.learning_goal}

INITIAL ASSESSMENT:
{request.assessment_context}

YOUR MAIN RESPONSIBILITY:
Conduct a natural, interactive English speaking session.
You are the learner's personal AI speaking coach.

SESSION RULES:
1. Ask only ONE question at a time.
2. Let the learner express their thoughts naturally.
3. Listen carefully and respond to their actual answer.
4. Identify important grammar, vocabulary and sentence
   formation mistakes.
5. Correct mistakes gently using this format:
   - What you said
   - Better way to say it
   - Short explanation
6. Focus on the weaknesses identified in the assessment.
7. Adapt questions to the learner's English level and goal.
8. Gradually increase question difficulty as the learner improves.
9. Ask relevant follow-up questions instead of repeating questions.
10. Encourage complete sentences and natural conversation.
11. Keep responses short and easy to understand.
12. Never embarrass or discourage the learner.

IMPORTANT:
- Do not behave like a multiple-choice examination.
- Do not give all corrections at once.
- Prioritize natural speaking practice.
- Balance assessment weaknesses with the learner's interests.
- Remember the conversation history.

You are conducting a live one-to-one speaking practice session.


"""

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # Include previous conversation context
        for item in request.history[-10:]:
            if item.get("role") in ["user", "assistant"]:
                messages.append({
                    "role": item["role"],
                    "content": str(item.get("content", ""))
                })

        messages.append({
            "role": "user",
            "content": request.transcript
        })

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages,
            temperature=0.7,
            max_completion_tokens=300
        )

        reply = response.choices[0].message.content

        return {
            "reply": reply
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Tutor response failed: {str(e)}"
        )
