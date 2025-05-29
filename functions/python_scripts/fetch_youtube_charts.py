from ytmusicapi import YTMusic
import json
import sys
import io

def fetch_charts(country='IN'):
    try:
        ytmusic = YTMusic()  # No auth needed
        charts = ytmusic.get_charts(country=country)
        return json.dumps(charts, ensure_ascii=False, indent=4)
    except Exception as e:
        return json.dumps({"error": str(e)}, ensure_ascii=False)

if __name__ == "__main__":
    # Set stdout to use UTF-8
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    # Get country code from command line args if provided
    country = sys.argv[1] if len(sys.argv) > 1 else 'IN'
    result = fetch_charts(country)
    print(result)

