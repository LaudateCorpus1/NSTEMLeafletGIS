//client_package.js, developed by Pirjot Atwal, supports one endpoint and simple functionality to push only
//NOTE: MAKE SURE TO INCLUDE FOLLOWING TAGS IN HTML FILE.
//<script src = "http://kjur.github.io/jsrsasign/jsrsasign-latest-all-min.js"></script>
//<script async defer src="https://apis.google.com/js/api.js"
// onload="this.onload=function(){};handleClientLoad()"
// onreadystatechange="if (this.readyState === 'complete') this.onload()">
// </script>
//<script src = "client_package.js"></script>

var gapiReady = false;

function handleClientLoad() {
    gapi.load('client:auth2', init());
}

async function init() {
    var cred2 = "PRIVATE KEY";
    var cred3 = "EMAIL";
    var cred4 = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
    var pHeader = {
        "alg": "RS256",
        "typ": "JWT"
    }
    var sHeader = JSON.stringify(pHeader);
    var pClaim = {};
    pClaim.aud = "https://www.googleapis.com/oauth2/v3/token";
    pClaim.scope = "https://www.googleapis.com/auth/drive";
    pClaim.iss = cred3;
    pClaim.exp = KJUR.jws.IntDate.get("now + 1hour");
    pClaim.iat = KJUR.jws.IntDate.get("now");

    var sClaim = JSON.stringify(pClaim);

    var key = cred2;
    var sJWS = KJUR.jws.JWS.sign(null, sHeader, sClaim, key);

    var XHR = new XMLHttpRequest();
    var urlEncodedData = "";
    var urlEncodedDataPairs = [];

    urlEncodedDataPairs.push(encodeURIComponent("grant_type") + '=' +
        encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer"));
    urlEncodedDataPairs.push(encodeURIComponent("assertion") + '=' + encodeURIComponent(sJWS));
    urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');

    XHR.addEventListener('load', async function (event) {
        var response = JSON.parse(XHR.responseText);
        const delay = (ms = 500) => new Promise(res => setTimeout(res, ms));
        while (!gapi.auth) {
            await delay(500);
        }
        gapi.auth.setToken({
            access_token: response["access_token"]
        });
        gapi.client.init({
            apiKey: "API KEY",
            discoveryDocs: cred4
        }).then(function () {gapiReady = true;}, error => console.log(error));
    });

    XHR.addEventListener('error', function (event) {
        console.log('Oops! Authentication went wrong.');
    });

    XHR.open('POST', 'https://www.googleapis.com/oauth2/v3/token');
    XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    XHR.send(urlEncodedData);
}

async function get(subsheet = "") {
    const delay = (ms = 500) => new Promise(res => setTimeout(res, ms));
    while (!gapiReady) {
        await delay(500);
    }
    var ENDURL = "SPREADSHEET URL";
    var ENDPOINT = new RegExp("\\/d\\/(.*?)(\\/|$)").exec(ENDURL)[1];
    return await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: ENDPOINT,
        range: subsheet + '!A1:Z',
    }).then(function (response) {
        rows = response.result.values;
        return rows;
    });
}