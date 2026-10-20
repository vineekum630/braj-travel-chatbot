import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from google import genai
from google.genai import types

load_dotenv(Path(__file__).with_name(".env"))

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")}})

SYSTEM_PROMPT = """You are Braj, a thoughtful travel companion for Mathura, Vrindavan, and the wider Braj region in Uttar Pradesh, India.
Help travelers plan practical, respectful visits: routes, temples, ghats, local transport, food, accessibility, and cultural etiquette.
Be warm and concise. Ask a clarifying question when dates, pace, or interests would change the recommendation.
Temple hours, road conditions, fares, and event schedules can change. Never present uncertain or time-sensitive details as guaranteed; recommend verifying them locally before travel.
Do not invent bookings, live availability, or personal experiences. If unsure about a local fact, say so and offer a way to verify it."""


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/chat")
def chat():
    payload = request.get_json(silent=True)
    messages = payload.get("messages") if isinstance(payload, dict) else None
    if not isinstance(messages, list) or not messages:
        return jsonify({"error": "Send at least one chat message."}), 400
    if len(messages) > 20:
        return jsonify({"error": "This conversation is too long. Start a new chat to continue."}), 400

    clean_messages = []
    for message in messages:
        if not isinstance(message, dict) or message.get("role") not in {"user", "assistant"}:
            return jsonify({"error": "Messages must have a user or assistant role."}), 400
        content = message.get("content")
        if not isinstance(content, str) or not content.strip() or len(content) > 4000:
            return jsonify({"error": "Each message must contain between 1 and 4,000 characters."}), 400
        clean_messages.append({"role": message["role"], "content": content.strip()})

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "The travel guide is not configured yet. Add GEMINI_API_KEY to backend/.env."}), 503

    try:
        contents = [
            {
                "role": "model" if message["role"] == "assistant" else "user",
                "parts": [{"text": message["content"]}],
            }
            for message in clean_messages
        ]
        with genai.Client(api_key=api_key) as client:
            response = client.models.generate_content(
                model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
            )
        if not response.text:
            return jsonify({"error": "The travel guide returned an empty reply. Please try again."}), 502
        return jsonify({"reply": response.text})
    except Exception:
        app.logger.exception("Gemini chat request failed")
        return jsonify({"error": "The travel guide could not answer just now. Please try again."}), 502


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG") == "1")