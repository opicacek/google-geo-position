// *********************************************
// Geo Status by Opi Danihelka (http://jan.danihelka.net/)
// Inspired from "Geo by Felipe Oliveira" (http://twitter.com/_felipera)
// *********************************************

// Version
this.version = [0, 0, 1];

// Import HTTP to Request Geocode
var http = require('http'),
    _ = require('underscore');


// Google Geocode Provider
function GoogleGeocoder() {}

// Google Geocode Provider - Request
GoogleGeocoder.prototype.request = function(location, sensor) {
  return {
    host: 'maps.googleapis.com',
    port: 80,
    path: '/maps/api/geocode/json?address=' + escape(location) + '&sensor=' + sensor,
    method: 'GET'
  };
};

// Google Geocode Provider - Response
GoogleGeocoder.prototype.responseHandler = function(response, callback) {
  var json = JSON.parse(response);
  if (!json.results.length) {
    callback(null, null, null, null, json.status);
  } else {
    callback(json.results[0].address_components, json.results[0].formatted_address, json.results[0].geometry.location.lng, json.results[0].geometry.location.lat, json.status);
  }
};

// Main Geo Class
function Geo() {
  // Read more about it: http://ejohn.org/blog/adv-javascript-and-processingjs/
  if (! (this instanceof arguments.callee)) {
    return new arguments.callee(arguments);
  }

  // Init Class
  this.init();
}

// Constructor
Geo.prototype.init = function() {
  this.google = new GoogleGeocoder();
};

// Get Geocode
Geo.prototype.geocoder = function(geocoder, location, sensor, callback, user_settings) {
  // Check Input
  if (!geocoder) {
    throw new Error("Invalid Geocoder");
  }
  if (!location) {
    throw new Error("Invalid Location");
  }
  if (!sensor) {
    sensor = false;
  }
  if (!callback) {
    throw new Error("Invalid Callback");
  }

  // Get HTTP Request Options
  var options = geocoder.request(location, sensor);

  var settings = {
    // Maximum of allowed tries per request to prevent infinite loop
    //NOTE: set value to '0' to disable automatic repeats in case of Query Limit
    tries_left: 10, // Ten tries should be enough

    // delay before firing request again in case that we hit Query Limit
    timeout_delay: 250 // 250ms seems to be minimal required value of delay for Google request
  };

  // use User Setting
  settings = _.extend(settings, user_settings);

  // try again in case Google returns status "OVER_QUERY_LIMIT"
  var requestCallback = function(response) {
    var responseBody = '';

    // another chunk of data has been recieved, so append it to `responseBody`
    response.on('data', function (chunk) {
      responseBody += chunk;
    });

    // the whole response has been recieved, so we just print it out here
    response.on('end', function () {
      var json = JSON.parse(responseBody);
      if (json.status == "OVER_QUERY_LIMIT" && settings.tries_left > 0) {
        settings.tries_left -= 1;
        setTimeout(function() {
          // Repeat Request
          http.request(options, requestCallback).end();
        }, settings.timeout_delay);
        return;
      } else {
        geocoder.responseHandler(responseBody, callback);
      }
    });
  };

  // Make Request
  http.request(options, requestCallback).end();

};

// Export Main Class
module.exports = new Geo();
