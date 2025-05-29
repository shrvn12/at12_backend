from ytmusicapi import YTMusic
import json

ytmusic = YTMusic()  # No auth needed

charts = ytmusic.get_charts(country='IN')  # Use region code like 'US', 'GB', etc.

# Print the charts data to the console
print(json.dumps(charts, indent=4))

# with open('charts_response.json', 'w', encoding='utf-8') as f:
#     json.dump(charts, f, ensure_ascii=False, indent=4)

# albums = charts.get('albums', {}).get('items', [])

# for album in albums:
#     print(f"{album['title']} by {', '.join(a['name'] for a in album['artists'])}")
