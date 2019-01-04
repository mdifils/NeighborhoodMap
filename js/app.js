// ------------------------ Foursquare credentials -------------------------- //
var client_id='FOURSQUARE_CLIENTID';             //
var client_secret='FOURSQUARE_CLIENT_SECRET';         //
// -------------------------------------------------------------------------- //
// ---------------------- GLOBAL VARIABLES ----------------------------------
// Creating a map variable
var map;
// Blank Markers Array
var markers = [];
// This observable will help displaying and hiding additional location info
// in the DOM along side with the marker infowindow.
var isVisible = ko.observable();
// This array will contain every location object associated with the
// corresponding marker.
var placeMarkers = ko.observableArray([]);
var venueName = ko.observable('');
var venueAddress = ko.observable('');
var venueLikes = ko.observable();
var venueRating = ko.observable();
var imgUrl = ko.observable('');
// ---------------------------------------------------------------------------
// -------------------Template for a location object -------------------------
/**
* @description Represents a location or point of interest
* @constructor
* @param {json} data - An object with the following properties: title,
* foursquareID (for that location), info (short description) and latlng (latitude, longitude)
*/
var Place = function(data) {
    this.foursquareID = data.foursquareID;
    this.title = ko.observable(data.title);
    this.info = ko.observable(data.info);
    this.latlng = {
        lat: data.latlng.lat,
        lng: data.latlng.lng
    }
};
// ----------------------------------------------------------------------------
// ------------------------ UTILITY FUNCTIONS ---------------------------------
//
// This function populates the infowindow when the marker is clicked.
// We'll only allow one infowindow which will open at the marker that is clicked,
// and populate based on that markers position.
function populateInfoWindow(marker, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        infowindow.marker = marker;
        infowindow.setContent('<div>' + marker.info + '</div>');
        // Bounce marker when either marker or list item is clicked
        marker.setAnimation( google.maps.Animation.BOUNCE );
        infowindow.open(map, marker);
        // End animation on marker after 2 seconds
        setTimeout(function() {
            marker.setAnimation(null);
        }, 2000);
        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
            // Hide additional information when closing the infowindow
            isVisible(false);
        });
    }
}
// Given a location ID, this function is going to use FOURSQUARE API to get some
// details about it such as: address, name, likes and rating.
function getLocationDetails(place) {
    var squareEndpoint = `https://api.foursquare.com/v2/venues/${place.foursquareID}?`;
    squareEndpoint += `client_id=${client_id}&client_secret=${client_secret}&v=20181221`;
    // $.getJSON is prefered over $.ajax if there is no header to send and if dataType
    // is not jsonp. Because it's a shortcut.
    $.getJSON(squareEndpoint, data => {
        var prefix = data.response.venue.photos.groups[1].items[0].prefix;
        var suffix = data.response.venue.photos.groups[1].items[0].suffix;
        var address = data.response.venue.location.formattedAddress;
        imgUrl(prefix + '300x100' + suffix);
        venueAddress(address[0] + ', ' + address[1] + ' ' + address[3] + ', ' + address[4]);
        venueLikes(data.response.venue.likes.count);
        venueRating(data.response.venue.rating);
        venueName(data.response.venue.name);
    }).fail(() => $('#error').html(`<b>Failed to fetch location details with status:</b> ${data.meta.code}`));

    isVisible(true);
}
// Close and open the sidebar
function openNav() {
    document.getElementById("sidebar").style.width = "320px";
    document.getElementById("main").style.left = "320px";
}

function closeNav() {
    document.getElementById("sidebar").style.width = "0";
    document.getElementById("main").style.left= "0";
}
// ----------------------------------------------------------------------------
// This is the callback function for GOOGLE MAP API that will display the map,
// create markers, track click events on markers and display infowindow.
// NOTICE THAT WE USE AJAX TO DOWNLOAD DATA FROM A SERVER, it is a json file
// with 7 points of interest in London (around the Big Ben).
function initMap() {
    $.ajax({
        url: 'https://api.jsonbin.io/b/5c2ac7e5412d482eae58a496',
        headers: {"secret-key": "SECRET_KEY"},
        dataType: "json",
        success: function (result, textStatus, jqXHR) {
            if (jqXHR.status === 200) {
                // Defining the map to be displayed.
                map = new google.maps.Map(document.getElementById('map'), {
                    center: result.locations[0].latlng,
                    zoom: 14
                });

                var largeInfowindow = new google.maps.InfoWindow();

                result.locations.forEach(function(data) {
                    var place = new Place(data);
                    // Creating a marker for every location
                    var marker = new google.maps.Marker({
                        position: data.latlng,
                        title: data.title,
                        info: data.info,
                        animation: google.maps.Animation.DROP
                    });
                    marker.setMap(map);
                    // push the marker to our array
                    markers.push(marker);
                    // Adding a marker property to our place object
                    place.marker = marker;
                    placeMarkers.push(place);
                    // create an onclick event to open an infowindow at each marker
                    marker.addListener('click', function() {
                        // This will open the infowindow on the map
                        populateInfoWindow(this, largeInfowindow);
                        var index = markers.indexOf(marker);
                        // this will display additional info on the DOM
                        getLocationDetails(placeMarkers()[index]);
                    });
                });
            }
        },
        error: function(jqXHR, textStatus, error) {
            // Letting the user know about the error
            $('#error').html(`<b>Failed to download locations data with status:</b> ${jqXHR.status}`);
        }
    });

    ko.applyBindings(new ViewModel());
}
// ----------------------------------------------------------------------------
// -------------------------- VIEW MODEL --------------------------------------
// This where we handle the locations list, locations filter and how to display
// additional locations information.
var ViewModel = function() {
    // To avoid confusion and conflicts, we'll be using self to maintain
    // a reference  to ViewModel properties
    var self = this;
    // Tracking the input pattern for the filter
    this.pattern = ko.observable('');

    // Here is the filter
    this.filteredList = ko.computed(function() {
        return ko.utils.arrayFilter(placeMarkers(), function(item) {
            if (RegExp(self.pattern(),'i').test(item.title())) {
                return true;
            }
            return false;
        });
    });
    console.log(this.filteredList());
    // Clicking any item in the list will open infowindow on the marker and
    // display additional details in the DOM.
    this.openMarkerInfo = function(place) {
        getLocationDetails(place);
        google.maps.event.trigger(place.marker, 'click');
    };
    // filtering the list also filters the markers on the map.
    this.filterMarkers = () => {
        placeMarkers().forEach(function(item) {
            item.marker.setVisible(false);
        });
        self.filteredList().forEach(function(item) {
            item.marker.setVisible(true);
        })
    };
    // Hiding everything in the list and also every marker on the map.
    this.hideMarkers = () => {
        self.pattern('Nothing');
        placeMarkers().forEach(function(item) {
            item.marker.setVisible(false);
        });
    };
    // reseting markers and the list to default.
    this.showMarkers = () => {
        self.pattern('');
        placeMarkers().forEach(function(item) {
            item.marker.setVisible(true);
        });
    };
};
