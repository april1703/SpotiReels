***DURING TESTING; TO TEST ON YOUR MACHINE, MAKE SURE YOU HAVE A SPOTIFY DEVELOPER ACCOUNT. CREATE AN APP, WITH THESE REQUIREMENTS***

APP NAME : (whatever you want)
REDIRECT URI: http://127.0.0.1:3000/auth/callback
APIS USED: Web Playback SDK

***ONCE THESE ARE MADE, GO INTO YOUR "APP" AND COPY CLIENT ID AND CLIENT SECRET INTO ALL SPOTS WHERE CLIENT ID AND CLIENT SECRET IS STATED IN CODEBASE. HERE ARE ALL SPOTS WHERE IT NEEDS TO BE CHANGED***

<img width="1487" height="326" alt="REPLACECID" src="https://github.com/user-attachments/assets/42067489-cbca-4ea0-85f4-7353c5170de0" />

<img width="920" height="899" alt="REPLACECID1" src="https://github.com/user-attachments/assets/1512701a-122e-4f41-934f-10e2b645b65c" />


***DOWNLOAD THESE DEPENDENCIES WITH THESE COMMANDS***

(in client)

npm i react-scripts  [IF react-scripts DOESNT WORK, MAKE SURE under "dependencies" in src/package.json "react-scripts": "^0.0.0", is changed to "react-scripts": "^5.0.1", ]

if it still doesn't work, do this in terminal (in client folder)

Remove-Item -Force package-lock.json

npm install

(ignore vulnerabilities warnings, just keep going)
npm i bootstrap react-bootstrap

npm i axios

npm i spotify-web-api-node

npm i react-spotify-web-playback

----------------------------------------------------------------
(in server)
npm i express spotify-web-api-node (installs express AND spotify web api library)

npm i nodemon --save-dev

npm i cors

npm i body-parser

----------------------------------------------------------------
