/** single_leaflet.js
 * This file contains a combination of the code in both mapping_api
 * and client_package_leaf. The code authenticates the user using
 * self-provided and hardcoded credentials in the forms of strings
 * then uses the Leaflet library to inject a map onto the screen
 * with markers built from the Educated Partners Spreadsheet.
 * The code also injects into a Searching Utility on the page
 * which is connected to the Map to allow the user to search
 * schools.
 * 
 * @file single_leaflet.js
 * @author Pirjot Atwal
 */


//NOTE: MAKE SURE TO INCLUDE FOLLOWING TAGS IN HTML FILE.
//<script src = "http://kjur.github.io/jsrsasign/jsrsasign-latest-all-min.js"></script>
//<script async defer src="https://apis.google.com/js/api.js"
// onload="this.onload=function(){};handleClientLoad()"
// onreadystatechange="if (this.readyState === 'complete') this.onload()">
// </script>
//<script src = "client_package.js"></script>

/**
 * The gapiReady variable helps in the get method below to 
 * ensure that async behavior does cause the GAPI to fetch
 * without being authenticated beforehand. It also helps
 * with the handleClientLoad function which is extended
 * in the index.html file.
 */
var gapiReady = false;

/**
 * Loads the gapi, comes from the gapi template.
 */
function handleClientLoad() {
    gapi.load('client:auth2', init());
}

/**
 * init (called by handleClientLoad above) takes hardcoded credentials
 * and authenticates the Google API with them. Make sure that the
 * tester email has access to the resources it's using (by sharing
 * the documents with that email).
 */
async function init() {
    /**
     * Credentials provided through Google Developer
     * Console.
     */
    var cred2 = "PRIVATEKEY";
    var cred3 = 'SERVICEEMAIL';
    var cred4 = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
    /**
     * Following code adapted from stackoverflow:
     * https://stackoverflow.com/questions/28751995/how-to-obtain-google-service-account-access-token-javascript
     */
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
        /**
         * API Key provided by Google Developer Console.
         * gapiReady gets set to true once authenticated.
         */
        gapi.client.init({
            apiKey: 'APIKEY',
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

/** get
 * Get grabs the rows from the hardcoded
 * ENDURL and returns it in a promise.
 * @param {*} subsheet Subsheet name in spreadsheet
 */
async function get(subsheet = "") {
    const delay = (ms = 500) => new Promise(res => setTimeout(res, ms));
    while (!gapiReady) {
        await delay(50);
    }
    //Hardcoded URL to Educated Partners GIS Spreadsheet
    var ENDURL = "SHEETURL";
    var ENDPOINT = new RegExp("\\/d\\/(.*?)(\\/|$)").exec(ENDURL)[1];
    return await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: ENDPOINT,
        range: subsheet + '!A1:Z',
    }).then(function (response) {
        rows = response.result.values;
        if (!rows) {
            rows = [];
        }
        var rowMax = 0;
        for (var row of rows) {
            if (row.length > rowMax) {
                rowMax = row.length;
            }
        }
        for(var row of rows) {
            for (var i = rowMax - row.length; i > 0; i--) {
                row.push("");
            }
        }
        return rows;
    });
}

///////
///////
///////
///////

//mapping_api.js Written by Pirjot Atwal

/**
 * Must match corresponding hardcoded values in init filter Names and indexAndFilters Names.
 */
var IDs = [
    ["button1", "WIF", "orange"],
    ["button2", "ACU", "blue"],
    ["button3", "HBCU", "green"],
    ["button4", "HSI", "red"]
];

/**
 * The SmartMarker class holds all the information that a
 * marker needs to display its information and the corresponding node.
 */
class SmartMarker {
    /**
     * SmartMarker constructs, creates a SmartMarker
     * and sets up its Popup.
     * this.filters is an array of arrays of type: ["WIF", "off", "orange"]
     * @param {*} info JSON format
     */
    constructor(info = {
        name: "DEFAULT",
        Lat: 0,
        Lon: 0,
        status: "off",
        filters: []
    }) {
        this.marker = L.circleMarker([info.Lat, info.Lon], {weight: 1, radius: 7});
        this.info = info;
        this.setupPopup();
    }
    /**
     * Following functions extend L.circleMarker functions.
     */
    addTo(map) {
        this.marker.addTo(map);
    }
    remove() {
        this.marker.remove();
    }
    /**
     * Sets up popup with given info and binds it to
     * this.marker.
     */
    setupPopup() {
        //University Name
        var popupHeading = "<h4>" + this.info.name + "</h4>";
        //Filters
        var subHeading = "<h6>";
        for (var filter of this.info.filters) {
            subHeading += filter[0] + ", ";
        }
        subHeading = subHeading.slice(0, -2) + "</h6>";
        //Address
        var popupText = "<p>" + this.info.address +  "</p>";
        this.marker.bindPopup(popupHeading + subHeading + popupText).openPopup();
    }
    /**
     * Toggles a given filter in this.filters if that
     * filter's name (filter[0]) matches the passed in parameter.
     * Then updates this SmartMarker's status.
     */
    toggle(filter) {
        for (var item of this.info.filters) {
            if (item[0] == filter) {
                if (item[1] == "on") {
                    item[1] = "off";
                } else {
                    item[1] = "on";
                }
            }
        }
        this.updateStatus();
    }
    /**
     * updateStatus sets this SmartMarkers info.status
     * to on or off correctly. If any of the filters
     * of a marker or on, then that marker is considered on.
     * Otherwise it is considered off.
     * If a marker was newly set to on, then it's color
     * will change to the latest filter that was turned
     * on.
     */
    updateStatus() {
        var myStatus = "off";
        for (var item of this.info.filters) {
            if (item[1] == "on") {
                myStatus = "on";
                this.marker.setStyle({color: item[2], fillColor: item[2]});
            }
        }
        this.info.status = myStatus;
    }
}

/**
 * The NSTEMMap class is used to initialize the a NSTEMMAP object
 * with the information found in the Educated Partners spreadsheet,
 * where certain columns in the spreadsheet are expected to
 * hold either the name, address, lat, lon, or "filter/tag." The
 * instance then injects a LeafletMap on the page into a div
 * with the provided id, initializes all the smartMarkers for 
 * all the rows in spreadsheet, and finally initializes
 * the "search console" on the page with the hardcoded id of
 * "mySearch" and "myMenu."
 * 
 * It is expected for full use that the user calls init seperately
 * to set up all the markers on the page.
 */
class NSTEMMap {
    /**
     * Initializes an empty array for markers and
     * calls createMap to inject the Leaflet Map.
     * @param id The ID of a mapDIV on the page.
     */
    constructor(id) {
        this.divID = id;
        this.markers = [];
        this.createMap();
    }
    /**
     * Injects a Leaflet Map into a div with this.id as an id.
     * Sets the Zoom and Bounds to hardcoded values.
     * Adds plugins for control.
     */
    async createMap(Lat = 0, Lon = 0, View = 1) {
        //Create Map
        this.mymap = L.map(this.divID, {
            preferCanvas: true
        }).setView([Lat, Lon], View);
        //Set Tiles
        var tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        this.tiles = L.tileLayer(tileURL, {
            attribution
        });
        this.tiles.addTo(this.mymap);
        //Set Map Bounds
        this.mymap.setMinZoom(2);
        this.mymap.setMaxBounds([
            [90, -180],
            [-90, 180]
        ]);
        this.mymap.fitBounds([
            [52, -124],
            [21, -67]
        ]);
        //Compass was removed from this line
        //Panning
        L.control.pan().addTo(this.mymap);
        //Search Control Button
        this.searchControl = L.esri.Geocoding.geosearch().addTo(this.mymap);
        this.searchControl.on('results', function (data) {});
    }
    /**
     * Pushes SmartMarker to this map's array if it doesn't
     * already exist there.
     * Displays the marker if it's status is on.
     */
    addMarker(marker) {
        if (!this.markers.includes(marker)) {
            this.pushMarker(marker);
        }
        if (marker.info.status == "on") {
            marker.addTo(this.mymap);
        }
    }
    pushMarker(marker) {
        this.markers.push(marker);
    }
    /**
     * Creates a marker with the provided JSON info.
     */
    createMarker(info) {
        var marker = new SmartMarker(info);
        this.pushMarker(marker);
        this.addMarker(marker);
    }
    /**
     * Removes the marker from the Leaflet Map.
     * Does not remove it from the NSTEMMap's memory
     * since it can be displayed later.
     */
    hideMarker(marker) {
        if (this.markers.includes(marker) && marker.info.status == "off") {
            marker.remove();
        }
    }
    /**
     * Toggles a provided filter name on or off.
     * this.filters is initialized in init.
     * Goes through this.filters and turns it on or off,
     * then goes through all of this.markers and 
     * turns it on or off with a certain filter name.
     * Then, for every marker, if it's status is on or off,
     * it is added or removed to this instance.
     * @param {string} filter a filtername
     */
    toggleFilter(filter = "WIF") {
        //Update this.filters
        for (var item of this.filters) {
            if (item.name == filter) {
                if (item.status == "off") {
                    item.status = "on";
                } else {
                    item.status = "off";
                }
            }
        }
        //Update all markers
        for (var marker of this.markers) {
            marker.toggle(filter);
            if (marker.info.status == "on") {
                this.addMarker(marker);
            } else {
                this.hideMarker(marker);
            }
        }
    }
    /**
     * init does all the big work for NSTEMMap.
     * It first initializes this.filters with JSON objects
     * of name = "WIF,etc." and status = "off."
     * It then retrieves all the data from the Educated
     * Partners Sheet and for every row in the data,
     * creates a seperate "info" JSON variable for that marker.
     * It iterates through all of these JSON variables and 
     * pushes a new SmartMarker with that information to this.markers.
     * Next, init initializes the buttons with the data found in 
     * the global IDs variable. Those buttons are given the ability
     * to toggle the filter associated with their name. Lastly
     * the function turns on the first filter with the hardcoded
     * "button1" and finally calls on NSTEMMap to initialize
     * the search console/engine.
     */
    async init() {
        //Initialize Filters
        this.filters = [];
        var filterNames = IDs.map((item) => item[1]);
        for (var item of filterNames) {
            this.filters.push({
                name: item,
                status: "off"
            });
        }
        //Parse Info and Initialize Markers
        this.rows = await get();
        var infos = [];
        for (var row of rows.slice(1)) {
            if (row && row.length >= rows[0].length && row[0] && row[6] && row[7]) {
                var info = {};
                info.name = row[0];
                info.address = row[1];
                info.Lat = parseFloat(row[6]);
                info.Lon = parseFloat(row[7]);
                var filters = [];
                //Must match IDs
                var indexAndFilters = [
                    [8, "WIF", "orange"],
                    [9, "ACU", "blue"],
                    [10, "HBCU", "green"],
                    [11, "HSI", "red"]
                ];
                for (var item of indexAndFilters) {
                    if (row[item[0]]) {
                        filters.push([item[1], "off", item[2]]);
                    }
                }
                info.status = "off";
                info.filters = filters;
                infos.push(info);
            }
        }
        for (var item of infos) {
            this.pushMarker(new SmartMarker(item));
        }
        //Initialize Buttons
        function attachToButton(map, id, value, color) {
            var button = document.getElementById(id);
            button.on = false;
            button.addEventListener("click", (evt) => {
                button.on = !button.on;
                if (button.on) {
                    button.style = "background-color: " + color;
                } else {
                    button.style = "";
                }
                map.toggleFilter(value);
            });
        }
        for (var item of IDs) {
            attachToButton(this, item[0], item[1], item[2]);
        }
        //Turn on NI
        document.getElementById("button1").click();
        //Initialize Search Engine
        await this.initSearchEngine();
    }
    /**
     * initSearchEngine initializes all the list items in the
     * div myMenu and provides them the ability to interact
     * with the map and to toggle filters.
     * Most of the code is self-explanatory.
     * Zoom value is hardcoded to 13 when zooming in on a marker.
     * The SearchMenu causes Institution names to disappear
     * if they match the given user input by changing their
     * CSS style display to "none" or "".
     */
    async initSearchEngine() {
        //Get Search Bar and Menu with Filters
        var map = this.mymap;
        var searchText = document.getElementById("mySearch");
        var menu = document.getElementById("myMenu");
        //Remove Loading... Place holder list item
        var currentLIChildren = menu.getElementsByTagName("li");
        while (currentLIChildren.length > 0) {
            menu.removeChild(currentLIChildren[0]);
        }
        //Function for Map Viewing Ability
        //Turns On Marker selected if it is off (by clicking correct button)
        function view(li, marker) {
            li.addEventListener("click", function (evt) {
                map.setView([marker.info.Lat, marker.info.Lon], 13);
                if (marker.info.status == "off" && marker.info.filters.length > 0) {
                    var tagToTurnOn = marker.info.filters[0][0];
                    for (var id of IDs) {
                        if (id[1] == tagToTurnOn) {
                            var buttonToClick = document.getElementById(id[0]);
                            buttonToClick.click();
                            break;
                        }
                    }
                }
            });
        }
        //For Each Marker, Add a List Item to the Menu
        for (var marker of this.markers) {
            //Add All Elements
            var li = document.createElement("li");
            var div = document.createElement("div");
            var text1 = document.createElement("p");
            text1.textContent = marker.info.name;
            var text2 = document.createElement("p");
            text2.textContent = marker.info.address;
            div.appendChild(text1);
            div.appendChild(text2);
            li.appendChild(div);
            menu.appendChild(li);
            //When a Li is clicked upon, it will tell the map to zoom to that marker
            view(li, marker);
        }

        //Give the Search Menu Ability to hide li elements
        function search(evt) {
            var find = searchText.value.toUpperCase();
            var div = null;
            for (var li of currentLIChildren) {
                div = li.getElementsByTagName("div")[0];
                var text1 = div.getElementsByTagName("p")[0];
                var text2 = div.getElementsByTagName("p")[1];
                if (text1.textContent.toUpperCase().includes(find) ||
                    text2.textContent.toUpperCase().includes(find)) {
                    li.style.display = "";
                } else {
                    li.style.display = "none";
                }
            }
        }
        searchText.onkeyup = search;
    }
}

/**
 * All hardcoded values below.
 */
var myMap = null;

async function instruct() {
    if (document.getElementById("mapid") == undefined) {
        return;
    }
    console.log("MAP LOADING...");
    myMap = new NSTEMMap('mapid');
    await myMap.init();
    console.log('Map Loaded!');
}

document.addEventListener("DOMContentLoaded", (evt) => {
    instruct();
});