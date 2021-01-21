//mapping_api.js Written by Pirjot Atwal

class SmartMarker {
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
    addTo(map) {
        this.marker.addTo(map);
    }
    remove() {
        this.marker.remove();
    }
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

class Map {
    constructor(id) {
        this.divID = id;
        this.markers = [];
        this.createMap();
    }
    createMap(Lat = 0, Lon = 0, View = 1) {
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
        this.mymap.setMinZoom(4);
        this.mymap.setMaxBounds([
            [54, -163],
            [20, -30]
        ]);
        this.mymap.fitBounds([
            [52, -124],
            [21, -67]
        ]);

        //Compass
        this.mymap.addControl(new L.Control.Compass());
        //Panning
        L.control.pan().addTo(this.mymap);
        //Search Control Button
        this.searchControl = L.esri.Geocoding.geosearch().addTo(this.mymap);
        this.searchControl.on('results', function (data) {});
    }
    addMarker(marker) {
        if (!this.markers.includes(marker)) {
            this.pushMarker(marker)
        }
        if (marker.info.status == "on") {
            marker.addTo(this.mymap);
        }
    }
    pushMarker(marker) {
        this.markers.push(marker);
    }
    createMarker(info) {
        var marker = new SmartMarker(info);
        this.pushMarker(marker);
        this.addMarker(marker);
    }
    hideMarker(marker) {
        if (this.markers.includes(marker) && marker.info.status == "off") {
            marker.remove();
        }
    }
    toggleFilter(filter = "NI") {
        for (var item of this.filters) {
            if (item.name == filter) {
                if (item.status == "off") {
                    item.status = "on";
                } else {
                    item.status = "off";
                }
            }
        }
        for (var marker of this.markers) {
            marker.toggle(filter);
            if (marker.info.status == "on") {
                this.addMarker(marker);
            } else {
                this.hideMarker(marker);
            }
        }
    }
    async init() {
        //Initialize Filters
        this.filters = [];
        var filterNames = ["NI", "NAP", "HBCU", "HSI"];
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
            if (row && row.length >= 14 && row[0] && row[6] && row[7]) {
                var info = {};
                info.name = row[0];
                info.address = row[1];
                info.Lat = parseFloat(row[6]);
                info.Lon = parseFloat(row[7]);
                var filters = [];
                var indexAndFilters = [
                    [8, "NAP", "blue"],
                    [12, "NI", "orange"],
                    [14, "HBCU", "green"],
                    [13, "HSI", "purple"]
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
        this.toggleFilter("NI");
        //Initialize Buttons
        var IDs = [
            ["button1", "NI", "orange"],
            ["button2", "NAP", "blue"],
            ["button3", "HBCU", "green"],
            ["button4", "HSI", "purple"]
        ];

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
    }
}

var myMap = null;

async function instruct() {
    console.log("MAP LOADING...");
    myMap = new Map('mapid');
    await myMap.init();
    console.log('Map Loaded!');
}

document.addEventListener("DOMContentLoaded", (evt) => {
    instruct();
});