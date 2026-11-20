
import os
import json
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from groq import Groq


# Load backend environment variables
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# Initialize Groq
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError("GROQ_API_KEY is missing from backend/.env")

client = Groq(api_key=api_key)

router = APIRouter(
    prefix="/api/practice",
    tags=["Daily Practice"]
)


# Request model
class DailyExerciseRequest(BaseModel):
    goal: str
    daily_minutes: int
    english_level: str
    assessment_report: dict[str, Any]
    previous_performance: list[dict[str, Any]] = Field(
        default_factory=list
    )


@router.post("/generate")
async def generate_daily_practice(data: DailyExerciseRequest):

    allowed_durations = [15, 30, 45, 60, 90, 120]

    if data.daily_minutes not in allowed_durations:
        raise HTTPException(
            status_code=400,
            detail="Daily minutes must be 15, 30, 45, 60, 90 or 120."
        )

    prompt = f"""
You are an expert adaptive English language learning coach.

Create one personalized daily English practice plan.

LEARNER PROFILE:
Learning goal: {data.goal}
Available daily time: {data.daily_minutes} minutes
English level: {data.english_level}

ASSESSMENT REPORT:
{json.dumps(data.assessment_report, ensure_ascii=False)}

PREVIOUS PERFORMANCE:
{json.dumps(data.previous_performance, ensure_ascii=False)}

REQUIREMENTS:
1. Focus on the learner's actual weaknesses.
2. Consider previous performance when choosing exercises.
3. Increase difficulty gradually when the learner improves.
4. Include grammar, vocabulary, speaking and review where relevant.
5. Adapt the exercises to the learner's goal.
6. Do not create a fixed 30-day plan.
7. Generate exactly one day's plan.
8. Total exercise duration must equal exactly {data.daily_minutes} minutes.
9. Make every exercise practical and suitable for the learner's level.
10. Do not include answers that are ambiguous.

Return valid JSON using this structure:

{{
  "title": "Today's personalized practice",
  "focus": "Main learning focus",
  "total_minutes": {data.daily_minutes},
  "reason": "Why these exercises were selected",
  "exercises": [
    {{
      "type": "grammar",
      "title": "Grammar practice",
      "description": "Instructions for the learner",
      "duration_minutes": 10,
      "difficulty": "beginner",
      "questions": [
        {{
          "question": "Choose the correct sentence.",
          "options": [
            "She go to college.",
            "She goes to college.",
            "She going to college.",
            "She gone to college."
          ],
          "correct_answer": "She goes to college.",
          "explanation": "Use goes with she, he or it in the simple present tense."
        }}
      ]
    }},
    {{
      "type": "vocabulary",
      "title": "Vocabulary practice",
      "description": "Instructions for the learner",
      "duration_minutes": 5,
      "difficulty": "beginner",
      "questions": [
        {{
          "question": "Choose the closest meaning of improve.",
          "options": [
            "Become better",
            "Become weaker",
            "Become slower",
            "Become smaller"
          ],
          "correct_answer": "Become better",
          "explanation": "Improve means to make or become better."
        }}
      ]
    }},
    {{
      "type": "speaking",
      "title": "Speaking challenge",
      "description": "Speak about the given topic.",
      "duration_minutes": 15,
      "difficulty": "beginner",
      "topic": "Describe your daily routine"
    }}
  ]
}}

The durations in the example are illustrative.
Adjust them so all exercise durations add up to exactly {data.daily_minutes}.

Return JSON only.
"""

    try:
        result = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an adaptive English learning coach. "
                        "Return valid JSON only."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )

        content = result.choices[0].message.content

        if not content:
            raise ValueError("The AI returned an empty response.")

        daily_plan = json.loads(content)

        # Validate total exercise duration
        exercises = daily_plan.get("exercises", [])

        total_duration = sum(
            exercise.get("duration_minutes", 0)
            for exercise in exercises
        )

        if total_duration != data.daily_minutes:
            raise ValueError(
                "AI generated a plan with an incorrect total duration."
            )

        return {
            "status": "success",
            "daily_plan": daily_plan
        }

    except Exception as error:
        print("Daily practice generation error:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to generate daily exercises. Please try again."
        )
