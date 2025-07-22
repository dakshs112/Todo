require('dotenv').config()
const express = require("express");
const path = require("path");
const app = express();
const fs = require("fs")
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.set("view engine", "ejs")
app.get('/', function (req, res) {
    fs.readdir(`./files`, function (err, files) {
        res.render("main", { files: files });
    })
})
app.post('/create', function (req, res) {
    fs.writeFile(`./files/${req.body.title}.txt`, req.body.details, function (err) {
        res.redirect('/')
    })
})
app.get('/file/:filename', function (req, res) {
    fs.readFile(`./files/${req.params.filename}`, "utf-8", function (err, filedata) {
        res.render('show', { filename: req.params.filename, filedata: filedata });
    })
})
app.get('/edit/:filename', function (req, res) {
    res.render('edit', { filename: req.params.filename })
})
app.post('/edit', function (req, res) {
    fs.rename(`./files/${req.body.previous}`,`./files/${req.body.new}`,function(err){
        res.redirect('/')
    }) 
})
app.get('/delete/:filename',function(req,res){
    fs.unlink(`./files/${req.params.filename}`,function(err){
        res.redirect('/')
    })
})
// app.get('/profile/:username/:age',function(req,res){
//     res.send(`Welcome,${req.params.username} of age ${req.params.age}`);
// })
const port = 3000;
app.listen(process.env.PORT,() => {
    console.log(`Server is running on port ${port}`)
}) 