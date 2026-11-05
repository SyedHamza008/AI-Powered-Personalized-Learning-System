import google.generativeai as genai
import config 

print("--- DIAGNOSTIC SCRIPT STARTED ---")

# 1. Check if Key exists
if not hasattr(config, 'Gemini_API_KEY') or not config.Gemini_API_KEY:
    print(" Error: Gemini_API_KEY is missing in config.py")
    exit()

print(f" API Key found (ends with ...{config.Gemini_API_KEY[-4:]})")

# 2. Configure Gemini
try:
    genai.configure(api_key=config.Gemini_API_KEY)
except Exception as e:
    print(f" Configuration failed: {e}")
    exit()

# 3. List available models
print("\nRequesting available models from Google...")
try:
    found_any = False
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"  • Found model: {m.name}")
            found_any = True
            
    if not found_any:
        print("\n No models found. This usually means:")
        print("   1. The API Key is invalid.")
        print("   2. The 'Generative Language API' is not enabled in Google Cloud Console.")
        print("   3. Your region is blocked.")
    else:
        print("\n SUCCESS! Use one of the names above (e.g., 'gemini-1.5-flash') in your .env file.")

except Exception as e:
    print(f"\n CRITICAL ERROR connecting to Google: {e}")