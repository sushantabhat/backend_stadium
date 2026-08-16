import os
from PIL import Image
from pymongo import MongoClient
import sys

img_path = '/Users/sushant/.gemini/antigravity/brain/f879f993-65c5-4d74-bc62-0de2c466c2c9/.user_uploaded/media__1785714552059.png'
if not os.path.exists(img_path):
    print("File not found.")
    sys.exit(1)

img = Image.open(img_path)
width, height = img.size
print(f"Image loaded: {width}x{height}")

# If it's a phone screenshot, it's tall. If it's the 2x4 grid, it's roughly square or portrait but grid-like.
# A 2x4 grid of logos is usually roughly 1:1 or 1:2.

cell_w = width // 2
cell_h = height // 4

teams = [
    [("Janakpur Bolts", "jb"), ("Sudurpaschim Royals", "sr")],
    [("Karnali Yaks", "ky"), ("Kathmandu Gurkhas", "kg")],
    [("Pokhara Avengers", "pa"), ("Lumbini Lions", "ll")],
    [("Chitwan Rhinos", "cr"), ("Biratnagar Kings", "bk")]
]

out_dir = '/Users/sushant/Desktop/smart-stadium/backend/uploads/team_logos'
os.makedirs(out_dir, exist_ok=True)

client = MongoClient('mongodb://127.0.0.1:27017/smart-stadium')
db = client.get_database()
teams_col = db.teams

for row in range(4):
    for col in range(2):
        team_name, short = teams[row][col]
        left = col * cell_w
        upper = row * cell_h
        right = left + cell_w
        lower = upper + cell_h
        
        box = (left, upper, right, lower)
        cropped = img.crop(box)
        
        save_path = os.path.join(out_dir, f"{short}.png")
        cropped.save(save_path)
        
        # Update MongoDB
        logo_url = f"/uploads/team_logos/{short}.png"
        res = teams_col.update_one({'name': team_name}, {'$set': {'logoUrl': logo_url}})
        print(f"Saved {team_name} to {save_path}, DB modified: {res.modified_count}")

print("Done!")
