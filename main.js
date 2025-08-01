require('dotenv').config()
const express = require("express");
const path = require("path");
const app = express();
const fs = require("fs")

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.set("view engine", "ejs")

// Ensure files directory exists
const filesDir = path.join(__dirname, 'files');
if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
}

app.get('/', function (req, res) {
    fs.readdir(`./files`, function (err, files) {
        if (err) {
            console.error('Error reading files directory:', err);
            return res.render("main", { files: [] }); // Pass empty array on error
        }
        res.render("main", { files: files || [] }); // Ensure files is always an array
    })
})

app.post('/create', function (req, res) {
    if (!req.body.title || !req.body.details) {
        return res.status(400).send('Title and details are required');
    }
    
    fs.writeFile(`./files/${req.body.title}.txt`, req.body.details, function (err) {
        if (err) {
            console.error('Error creating file:', err);
            return res.status(500).send('Error creating file');
        }
        res.redirect('/');
    })
})

app.get('/file/:filename', function (req, res) {
    fs.readFile(`./files/${req.params.filename}`, "utf-8", function (err, filedata) {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(404).send('File not found');
        }
        res.render('show', { filename: req.params.filename, filedata: filedata });
    })
})

app.get('/edit/:filename', function (req, res) {
    // Check if file exists before rendering edit page
    fs.access(`./files/${req.params.filename}`, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('File not found:', err);
            return res.status(404).send('File not found');
        }
        res.render('edit', { filename: req.params.filename });
    });
})

app.post('/edit', function (req, res) {
    if (!req.body.previous || !req.body.new) {
        return res.status(400).send('Previous and new filenames are required');
    }
    
    fs.rename(`./files/${req.body.previous}`, `./files/${req.body.new}`, function(err) {
        if (err) {
            console.error('Error renaming file:', err);
            return res.status(500).send('Error renaming file');
        }
        res.redirect('/');
    }) 
})

app.get('/delete/:filename', function(req, res) {
    fs.unlink(`./files/${req.params.filename}`, function(err) {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).send('Error deleting file');
        }
        res.redirect('/');
    })
})

// Fix port configuration
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})
