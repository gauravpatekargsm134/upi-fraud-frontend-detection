import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv()
key = os.environ.get("GEMINI_API_KEY", "")
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={key}"

def ask(q):
    prompt = f"""You are AegisPay AI Payment Security Assistant.
Context: Transaction Rs 82,000, Status: BLOCKED, Reasons: 65x typical amount, unrecognized new device, 1450km distance jump.
User asked: "{q}"
Answer directly and helpfully in 2-3 sentences. Speak to the user."""
    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=6) as resp:
        d = json.loads(resp.read().decode("utf-8"))
        ans = d["candidates"][0]["content"]["parts"][0]["text"].strip()
        print(f"Q: {q}")
        print(f"A: {ans}")
        print("-" * 50)

if __name__ == "__main__":
    ask("Why was this payment marked as BLOCKED?")
    ask("is it safe using otp")
    ask("What should the user do now?")
