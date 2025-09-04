
const express = require('express');
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const PASSWORD = "DeinSicheresPasswort123!"; // hier Passwort ändern

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(fileUpload());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    if (req.cookies.loggedIn === "true") {
        res.redirect('/gallery');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    if(password === PASSWORD){
        res.cookie('loggedIn', 'true', { httpOnly: true });
        res.redirect('/gallery');
    } else {
        res.send("Falsches Passwort!");
    }
});

app.get('/gallery', (req, res) => {
    if (req.cookies.loggedIn !== "true") {
        return res.redirect('/');
    }

    fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
        if(err) files = [];
        let images = files.map(file => `<img src="/uploads/${file}" alt="${file}" class="img">`).join('');
        res.send(`
            <html>
                <head>
                    <link rel="stylesheet" href="/public/style.css">
                    <title>Gallery</title>
                </head>
                <body>
                    <h1>Bild Galerie</h1>
                    <form action="/upload" method="POST" enctype="multipart/form-data">
                        <input type="file" name="image" required>
                        <button type="submit">Upload</button>
                    </form>
                    <div class="gallery">${images}</div>
                </body>
            </html>
        `);
    });
});

app.post('/upload', (req, res) => {
    if (req.cookies.loggedIn !== "true") {
        return res.redirect('/');
    }

    if (!req.files || !req.files.image) {
        return res.send("Keine Datei ausgewählt!");
    }

    let image = req.files.image;
    let uploadPath = path.join(__dirname, 'uploads', image.name);

    image.mv(uploadPath, err => {
        if(err) return res.send("Fehler beim Upload");
        res.redirect('/gallery');
    });
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
