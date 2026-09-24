"""One-off: generate cartoon full-frame background art via Gemini Nano Banana.
Saves PNGs into frontend/assets/images/game/. Full-frame (no transparency needed).
"""
import asyncio
import base64
import os
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")
OUT = "/app/frontend/assets/images/game"
os.makedirs(OUT, exist_ok=True)
API_KEY = os.getenv("EMERGENT_LLM_KEY")
MODEL = "gemini-3.1-flash-image-preview"

STYLE = (
    "flat cartoon mobile-game art style, bright cheerful colors, thick clean outlines, "
    "soft cel shading, playful casual-game look similar to hyper-casual idle games, "
    "no text, no logos, no UI elements, vertical 9:16 portrait composition"
)

JOBS = {
    "bg_city.png": (
        "A blurred cartoon city skyline background under a warm sunny sky, "
        "soft rounded skyscrapers in soft yellows and light blues, hazy depth, "
        "empty lower third (ground area) kept simple and light. " + STYLE
    ),
    "bg_desert.png": (
        "A blurred cartoon desert highway background, warm sandy tan and orange sky, "
        "soft rounded distant mesas and cacti silhouettes, hazy depth, "
        "empty lower third kept simple and light. " + STYLE
    ),
    "bg_rain.png": (
        "A blurred cartoon rainy mountain pass background, cool teal and grey-blue tones, "
        "soft rounded misty mountains, gentle rain haze, "
        "empty lower third kept simple and light. " + STYLE
    ),
    "home_bg.png": (
        "A cheerful cartoon sunset city highway background for a game main menu, "
        "warm orange and yellow sky, soft rounded skyline, a wide empty road curving away, "
        "vibrant and inviting, lots of open sky at the top. " + STYLE
    ),
    "splash_hero.png": (
        "A dynamic cartoon hero illustration of a cute chunky sportbike motorcycle "
        "speeding on a highway with motion lines and little dust puffs, warm sunset colors, "
        "bold outlines, energetic and fun, centered subject with open space around it. " + STYLE
    ),
}


async def gen(name, prompt):
    chat = LlmChat(api_key=API_KEY, session_id=f"slip-{name}", system_message="You generate game art.")
    chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])
    try:
        _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
        if images:
            img = images[0]
            with open(os.path.join(OUT, name), "wb") as f:
                f.write(base64.b64decode(img["data"]))
            print("OK", name, img["mime_type"])
        else:
            print("NO IMAGE", name)
    except Exception as e:
        print("ERR", name, str(e)[:160])


async def main():
    for name, prompt in JOBS.items():
        await gen(name, prompt)


if __name__ == "__main__":
    asyncio.run(main())
