/*Js for Lab 1, Leaflet Map
Dean Olsen, Geog 575, Fall 2014*/


$(document).ready(function () {

	var cities;			
	map = L.map("map", {
 		center: [37.8, -96],
 		zoom: 4,
 		minZoom: 4
 	});

 	//new Leaflet tileLayer for background slippy tiles
 	L.tileLayer(
 		"http://{s}.acetate.geoiq.com/tiles/acetate/{z}/{x}/{y}.png", {
 			attribution: "Acetate tileset from GeoIQ"
 		}).addTo(map); 

	$.getJSON("data/airport_data.geojson")
		.done(function(data) {
			var info = processData(data);
			createPropSymbols(info.timestamps, data);
			createLegend(info.min, info.max);
			createSliderUI(info.timestamps);
			console.log(data);
})
	/*attempt to load added geojson file*/
	$.getJSON("data/percentchange.geojson")
		.done(function(data) {
			console.log(data);
			var info = processData(data);
			createPopups(info.timestamps, data);
		})

	.fail(function() {alert("There has been a problem loading the data.")});

	function processData(data) {
		var timestamps = [];
		var min = Infinity;
		var max = -Infinity;

		for (var feature in data.features) {

			var properties = data.features[feature].properties;

		for (var attribute in properties) {
			if (attribute != "id" &&
				attribute != "code" &&
				attribute != "airport_name" &&
				attribute != "city_name" &&
				attribute != "latitude" &&
				attribute != "longitude") {
				
					if ($.inArray(attribute, timestamps) === -1) {
						timestamps.push(attribute);
					}
					if (properties[attribute] < min) {
						min = properties[attribute];
					}
					if  (properties[attribute] > max) {
						max = properties[attribute];
					}
				}
			}
		}
		return {
			timestamps : timestamps,
			min : min,
			max : max
		}
	} //end processData
		
//});

	function createPropSymbols(timestamps, data) {

		cities = L.geoJson(data, {
		//puts a circle on the lat/long location of the feature
			pointToLayer: function(feature, latlng) {

				return L.circleMarker(latlng, {
					fillColor: "#FFCC00",
					color: "#2974B6",
					//color: "#537898",
					weight: 2,
					fillOpacity: 0.8
				}).on ({
					//changes color of proportional circle outline on 
					//mouseover
					mouseover: function(e) {
						this.openPopup();
						this.setStyle({color: "yellow"});
					},
					//changes the color back to original
					mouseout: function(e) {
						this.closePopup();
						this.setStyle({color: "#537898"});
					}
				});

			}//must always say to put it on the map!
		}).addTo(map);
	
		updatePropSymbols(timestamps[0]);

	} //end createPropSymbols

		//function to resize each prop symbol individually by year
	function updatePropSymbols(timestamp) {

		cities.eachLayer(function(layer) {

			var props = layer.feature.properties;
			var radius = calcPropRadius(props[timestamp]);
			var popupContent = addThousandsSeparator(String(props[timestamp])) +
					" Aircraft Movements " +
					" at " + props.city_name +
					" in " + timestamp;

			layer.setRadius(radius);
			layer.bindPopup(popupContent, {offset: new L.Point (0,-radius)});

		});
	}
	 //end updatePropSymbols

	 //attempt to put thousands comma separator in popup
	 	function addThousandsSeparator(input) {
    		var output = input
    		if (parseFloat(input)) {
       		 	input = new String(input); // so you can perform string operations
        		var parts = input.split("."); // remove the decimal part
        		parts[0] = parts[0].split("").reverse().join("").replace(/(\d{3})(?!$)/g, "$1,").split("").reverse().join("");
        		output = parts.join(".");
    }

    return output;
	}
	

	function calcPropRadius (attributeValue) {
	//scale function lowered and attributes divided by 10,000 b/c data is large
		var scaleFactor = 8;
			area = (attributeValue/10000) * scaleFactor;
		return Math.sqrt(area/Math.PI) * 3;

	}; //end calcPropRadius


	function createLegend(min, max) {

		//rounds number in legend to nearest 100,000
		function roundNumber (inNumber) {
			return (Math.round(inNumber/100000) * 100000);
		}

		var legend = L.control( {position: "bottomright"} );

		legend.onAdd = function(map) {

			var legendContainer = L.DomUtil.create("div", "legend");
			var symbolsContainer = L.DomUtil.create("div", "symbolsContainer");
			var classes = [roundNumber(min), roundNumber((max+min)/2), 
				roundNumber(max)];
			var legendCircle;
			var lastRadius = 0;
			var currentRadius;			
			var margin;
			//stops map from responding to mouse over legend area
			L.DomEvent.addListener(legendContainer, "mousedown", function(e) {
				L.DomEvent.stopPropagation(e);
			});

			$(legendContainer).append("<h2 id='legendTitle'>Aircraft Movements</h2>");

			for (var i = 0; i <= classes.length-1; i++) {
//			for (var i = 0; i <= classes.length-1; i--) {

				legendCircle = L.DomUtil.create("div", "legendCircle");
				currentRadius = calcPropRadius(classes[i]);
				margin = -currentRadius - lastRadius - 3.9;

				$(legendCircle).attr("style", "width: " + currentRadius*2 +
					"px;  height: " + currentRadius*2 +
					"px; margin-left: " +margin + "px");

				$(legendCircle).append ("<span class='legendValue'>" +
					classes[i] + "<span>");

				$(symbolsContainer).append (legendCircle);

				lastRadius = currentRadius;
			}

			$(legendContainer).append(symbolsContainer);

			return legendContainer;

		};

		legend.addTo(map);
	};

	function createSliderUI(timestamps) {

		var sliderControl = L.control({position: "bottomleft"});

		sliderControl.onAdd = function(map) {

			var slider = L.DomUtil.create("input", "range-slider");
			

			L.DomEvent.addListener(slider, "mousedown", function(e) {
				L.DomEvent.stopPropagation(e);

			});

			$(slider)
				.attr({
					"type": "range",
					"max": timestamps.length-1,
					"min": 0,
					"step": 1,
					"value": 0
				}).on ("input", function() {
					updatePropSymbols(timestamps[$(this).val()]);
					$(".temporal-legend").text(timestamps[this.value]);
				});
			return slider;
		}

		sliderControl.addTo(map)
		createTemporalLegend(timestamps[0]);
	}


	function createTemporalLegend(startTimestamp) {

		var temporalLegend = L.control({position: "bottomleft"});

		temporalLegend.onAdd = function(map) {
			var output = L.DomUtil.create("output", "temporal-legend");
			$(output).text(startTimestamp);
			return output;
		}
		temporalLegend.addTo(map);
	}
	

//closes beginning $(document).ready function brackets
});
