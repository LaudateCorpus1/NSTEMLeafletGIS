//mapping_api.js Written by Pirjot Atwal
console.log("MAP LOADING...");

class SmartMarker {
    constructor(info = {
        name: "DEFAULT",
        Lat: 0,
        Lon: 0,
        status: "off",
        filters: []
    }) {
        this.marker = L.circleMarker([info.Lat, info.Lon]); // switch to marker
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
        this.marker.bindPopup(this.info.name).openPopup();
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
        this.mymap = L.map(this.divID, {preferCanvas: true}).setView([Lat, Lon], View);
        var tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        this.tiles = L.tileLayer(tileURL, {
            attribution
        });
        this.tiles.addTo(this.mymap);
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
            if (row[0] && row[6] && row[7]) {
                var info = {};
                info.name = row[0];
                info.Lat = parseFloat(row[6]);
                info.Lon = parseFloat(row[7]);
                var filters = [];
                var indexAndFilters = [
                    [12, "NI"],
                    [8, "NAP"],
                    [14, "HBCU"],
                    [13, "HSI"]
                ];
                for (var item of indexAndFilters) {
                    if (row[item[0]]) {
                        filters.push([item[1], "off"]);
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
            ["button1", "NI"],
            ["button2", "NAP"],
            ["button3", "HBCU"],
            ["button4", "HSI"]
        ];
        function attachToButton(map, id, value) {
            var button = document.getElementById(id);
            button.addEventListener("click", (evt) => {
                map.toggleFilter(value);
            });
        }
        for (var item of IDs) {
            attachToButton(this, item[0], item[1]);
        }
    }
}

var myMap = null;

function instruct() {
    myMap = new Map('mapid');
    myMap.init();
}

document.addEventListener("DOMContentLoaded", (evt) => {
    instruct();
});