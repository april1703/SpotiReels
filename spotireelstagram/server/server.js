const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const cors = require("cors");
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/auth/refresh', (req, res) => {
    const refreshToken = req.body.refreshToken
    const spotifyApi = new SpotifyWebApi({
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
        clientId: 'dc8739cb5461422bbf58930a7251a7c5', //put your client id here
        clientSecret: 'ea030b20208b4c7e90db0a9bbd9b9d6f', //put your client secret here
        refreshToken,
    })

    spotifyApi
        .refreshAccessToken().then
        (data => {
            res.json({
                accessToken: data.body.access_token,
                expiresIn: data.body.expires_in
            })
        })
        .catch((err) => {
            console.log(err)
            res.sendStatus(400)
        })
    })
        

app.post('/auth/login', (req, res) => {
    const code = req.body.code;
    const spotifyApi = new SpotifyWebApi({
        redirectUri: 'http://127.0.0.1:3000/auth/callback',
        clientId: 'dc8739cb5461422bbf58930a7251a7c5',
        clientSecret: 'ea030b20208b4c7e90db0a9bbd9b9d6f'
    })

    spotifyApi.authorizationCodeGrant(code).then(data => {
        res.json({
            accessToken: data.body.access_token,
            refreshToken: data.body.refresh_token,
            expiresIn: data.body.expires_in,
        })
    })
    .catch(err => {
        console.log(err)
        res.sendStatus(400)
    })
})

app.listen(3001, () => {
    console.log('Server is running on port 3001');
})
