import urllib.request
names = ['monster', 'marty', 'bear', 'teddy', 'avatar', 'character', 'rating_animation']
for name in names:
    url = f"https://cdn.rive.app/animations/{name}.riv"
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print(f"FOUND: {url}")
    except:
        pass
