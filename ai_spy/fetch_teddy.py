import urllib.request
import json
import base64

urls = [
    "https://raw.githubusercontent.com/HayesTheGreat/teddy_rive/main/assets/login_bear.riv",
    "https://raw.githubusercontent.com/PoojaB26/Flutter_Rive/master/assets/teddy.riv",
    "https://raw.githubusercontent.com/willyelm/flutter-teddy/master/assets/teddy.riv",
    "https://raw.githubusercontent.com/Ayman-ElAhl2001/Flutter-Rive-Animation/main/assets/teddy.riv",
]

for url in urls:
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            if len(data) > 1000:
                with open('assets/teddy.riv', 'wb') as f:
                    f.write(data)
                print(f"Downloaded from {url}, size: {len(data)}")
                break
    except Exception as e:
        pass
