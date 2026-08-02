const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mongoose = require('mongoose');

const imgPath = '/Users/sushant/.gemini/antigravity/brain/f879f993-65c5-4d74-bc62-0de2c466c2c9/.user_uploaded/media__1785714552059.png';
const fallbackImgPath = '/Users/sushant/.gemini/antigravity/brain/f879f993-65c5-4d74-bc62-0de2c466c2c9/.user_uploaded/media__1785679944644.png';
const outDir = path.join(__dirname, 'uploads', 'team_logos');

const teams = [
    [{ name: "Janakpur Bolts", short: "jb" }, { name: "Sudurpaschim Royals", short: "sr" }],
    [{ name: "Karnali Yaks", short: "ky" }, { name: "Kathmandu Gurkhas", short: "kg" }],
    [{ name: "Pokhara Avengers", short: "pa" }, { name: "Lumbini Lions", short: "ll" }],
    [{ name: "Chitwan Rhinos", short: "cr" }, { name: "Biratnagar Kings", short: "bk" }]
];

async function run() {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    let activeImgPath = imgPath;
    if (!fs.existsSync(activeImgPath)) {
        activeImgPath = fallbackImgPath;
    }
    
    if (!fs.existsSync(activeImgPath)) {
        console.log("No valid image found.");
        process.exit(1);
    }

    const image = sharp(activeImgPath);
    const metadata = await image.metadata();
    
    console.log(`Image loaded: ${metadata.width}x${metadata.height}`);
    
    const cellW = Math.floor(metadata.width / 2);
    const cellH = Math.floor(metadata.height / 4);

    require('dotenv').config();
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-stadium');
    const Team = mongoose.connection.collection('teams');

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 2; col++) {
            const team = teams[row][col];
            const left = col * cellW;
            const top = row * cellH;
            
            const savePath = path.join(outDir, `${team.short}.png`);
            
            await image.clone()
                .extract({ left, top, width: cellW, height: cellH })
                .toFile(savePath);
                
            const logoUrl = `/uploads/team_logos/${team.short}.png`;
            const res = await Team.updateOne({ name: team.name }, { $set: { logoUrl } });
            
            console.log(`Saved ${team.name} to ${savePath}, DB modified: ${res.modifiedCount}`);
        }
    }
    
    console.log("Done!");
    process.exit(0);
}

run().catch(console.error);
