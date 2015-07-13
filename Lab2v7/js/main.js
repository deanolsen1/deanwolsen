//global variables
var keyArray = ["IMD","Income","Employment","Education","Housing","Environment"];
var expressed = keyArray[0];
var colorize;
//chart frame
var chartWidth = 450;
var chartHeight = 325;
//map frame dimensions
var width = 560;
var height = 650;

//Begin this script when window loads
window.onload = initialize();

//The first function after window loads
function initialize() {
	setMap();
};

//Set choropleth map parameters
function setMap() {
	
	//title for the page
	// var title = d3.select("body")
	// 	.append("h1")
	// 	.html("London borough of Camden")
	// 	.style("color", "#841A1C");

	//now we'll create a new svg element to place in those dimensions
	var map = d3.select("body")
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("class", "map");

	//I'm going to try to use Albers but I'd rather use British National Grid. Let's see...)
	var projection = d3.geo.albers()
		.rotate([0.153, 0])
		.center([0.003, 51.55])
		.parallels ([43, 62])
		.translate([height/2, width/2])
		.scale(470000);

	//I need to create the specific paths the will constitute the map
	//first the projection
	var path = d3.geo.path()
		.projection(projection);

		//next, the actual shapes of the London LSOA

	//use queue.js to parallel the asynchronous data loading
	queue()
		.defer(d3.csv, "data/n_camden_data.csv") //load attribute data from cvs
		.defer(d3.json, "data/camden2lite84.topojson") //load map data
		.defer(d3.json, "data/london2lite84.topojson")
		.await(callback);
		
	function callback(error, csvData, camden, london) {
//		console.log(csvData,camden,london);

		colorize = colorScale(csvData);

		//variables from CSV file to join to json file
		var jsonCamden = camden.objects.camden.geometries;

		//loop through each CSV catory to assign values to json LSOAs
		for (var i=0; i<csvData.length; i++) {
			var csvCamden = csvData[i];//current Camden LSOA
			var csvLSOA = csvCamden.LSOA11CD;

			for (var a=0; a<jsonCamden.length; a++)
				if (jsonCamden[a].properties.LSOA11CD == csvLSOA) {

					for (var key in keyArray) {
						var attr = keyArray[key];
						var val = parseFloat(csvCamden[attr]);
						jsonCamden[a].properties[attr] = val;
					};

					jsonCamden[a].properties.LSOA11CD = csvCamden.LSOA11CD;
					break;
				};
		};
		

		var london = map.append("path")
			.datum(topojson.feature(london, london.objects.london))
			.attr("class", "London")
			.attr("d", path)
			.style("fill", "#F5FAFF");

		var camdenLSOA = map.selectAll(".camden")
			.data(topojson.feature(camden, camden.objects.camden).features)//pulls all Camden
			.enter()//creates the elements
			.append("g")//gives each province its own g element
			.attr("class", "camdenLSOAs")
			.append("path")
			.attr("class", function(d) {
				return d.properties.LSOA11CD})
			.attr("d", path)
			.style("fill", function(d) {
				return choropleth(d, colorize);})

			.on("mouseover", highlight)
			.on("mouseout", dehighlight)
			.on("mousemove", moveLabel)
			.append("desc")
				.text(function(d) {
					return choropleth(d, colorize);
				});

		createDropdown(csvData); // creates the drop-down menu
		setChart(csvData, colorize); //creates the bar chart
	};	
};	


function createDropdown(csvData) {
	//add selection elements for dropdown menu
	var dropdown = d3.select("body")
		.append("div")
		.attr("class", "dropdown")
		.html("<h3>Select specific deprivation index:</h3>")
		.append("select")
		.on("change", function() {
			changeAttribute(this.value, csvData)});
	//create options to populate the dropdown menu
	dropdown.selectAll("options")
		.data(keyArray)
		.enter()
		.append("option")
		.attr("value", function(d) {
			return d
			})
		.text(function(d) {
			d = d[0].toUpperCase() + d.substring(1,3) + " " + d.substring(3);
			return d
			});
};

function setChart(csvData, colorize) {

	var chart = d3.select("body")
		.append("svg")
		.attr("width", chartWidth)
		.attr("height", chartHeight)
		.attr("class", "chart");

	var chartTitle = chart.append("text")
		.attr("x", 10)
		.attr("y", 28)
		.attr("class", "chartTitle");



	var bars = chart.selectAll(".bar")
		.data(csvData)
		.enter()
		.append("rect")
		.sort(function(a, b) {return a[expressed]-b[expressed]})
		.attr("class", function (d) {
			return "bar " + d.LSOA11CD;
		})
		.attr("width", chartWidth / csvData.length - 1)
		.on("mouseover", highlight)
		.on("mouseout", dehighlight)
		.on("mousemove", moveLabel);


	updateChart(bars, csvData.length);
};

function updateChart(bars, numbars) {
	bars.attr("height", function(d, i) {
		return Number(d[expressed]) * 4;
	})
	.attr("y", function(d, i) {
		return chartHeight - Number(d[expressed])*4;
	})
	.attr("x", function(d, i) {
		return i * (chartWidth/numbars);
	})
	.style("fill", function(d) {
		return choropleth(d, colorize);
	});
//	var y = d3.scale.linear()
//   	.range([chartHeight, 0]);

	//update chart title
	d3.select(".chartTitle")
		.text(//"Number of " +
			expressed[0]/*.toUpperCase()*/ + 
			expressed.substring(1,3) + " " +
			expressed.substring(3) +
			" Deprivation Index Value by LSOA");
};



//create quantile color choropleth scale outside of setMap function
function colorScale(csvData) {
	//single hue color scheme, light to dark
	var color = d3.scale.quantile()
		.range([
			"#FEF0D9",
			"#FDCC8A",
			"#FC8D59",
			"#E34A33",
			"#B30000"
		]);
	//construct array of all expressed values for input
	var domainArray = [];
	for (var i in csvData) {
		domainArray.push(Number(csvData[i][expressed]));
	};

	color.domain(domainArray); //pass array of expressed values as domain
	return color; //color these values in the geometry
};

function choropleth(d, colorize) {
//	var props = d.properties ? d.properties : d;
	var value = Number(d.properties ? d.properties[expressed] : d[expressed]);
//	var value = Number(d.properties[expressed]);//get the data value
		if (value) {
			return colorize(value);
		} else {
			return "#ccc";
		};
};

function changeAttribute(attribute, csvData) {
	expressed = attribute;
	colorize = colorScale(csvData);

	//recolor the map
	d3.selectAll(".camdenLSOAs")
		.select("path")
		.style("fill", function(d) {
			return choropleth(d, colorize);
		})
		.select("desc")
			.text(function(d) {
				return choropleth(d, colorize);
			});

	var bars = d3.selectAll(".bar")
		.sort(function(a, b) {
			return a[expressed] - b[expressed];
		})
		.transition() //slow transition effect
		.delay(function(d, i) {
			return i * 10
		});

	updateChart(bars, csvData.length);
};

function highlight(data){

	//json or csv properties
	var props = data.properties ? data.properties : data;

	d3.selectAll("."+props.LSOA11CD) //select the current province in the DOM
		.style("fill", "#000"); //set the enumeration unit fill to black

	var labelAttribute = "<h1>"+expressed+ " Score: "+props[expressed]+
		"</h1><b>"; //label content
//	var labelName = props.LSOA11CD;
	var labelName = props.LSOA11CD; //html string for name to go in child div
	
	//create info label div
	var infolabel = d3.select("body")
		.append("div") //create the label div
		.attr("class", "infolabel")
		.attr("id", props.LSOA11CD+"label") //for styling label
		.html(labelAttribute) //add text
		.append("div") //add child div for feature name
		.attr("class", "labelname") //for styling name
		.text("LSOA #"+props.LSOA11CD); //add feature name to label
};

function dehighlight(data){
	
	//json or csv properties
	var props = data.properties ? data.properties : data;
	var prov = d3.selectAll("."+props.LSOA11CD); //designate selector variable for brevity
	var fillcolor = prov.select("desc").text(); //access original color from desc
	prov.style("fill", fillcolor); //reset enumeration unit to orginal color
	
	d3.select("#"+props.LSOA11CD+"label").remove(); //remove info label
};

function moveLabel() {

	//horizontal label coordinate based mouse position stored in d3.event
	var x = d3.event.clientX < window.innerWidth - 210 ? d3.event.clientX+10 : d3.event.clientX-170; 
	//vertical label coordinate
	var y = d3.event.clientY < window.innerHeight - 10 ? d3.event.clientY-75 : d3.event.clientY-175; 
	
//	d3.select(".infolabel") //select the label div for moving
	d3.select(".infolabel")
		.style("margin-left", x+"px") //reposition label horizontal
		.style("margin-top", y+"px"); //reposition label vertical
};

//Accordian data panels
function openFirstPanel(){
  $('.accordion > dt:first-child').next().addClass('active').slideDown();
}

(function($) {
  var allPanels = $('.accordion > dd').hide();
  
  openFirstPanel();
	$('.accordion > dt > a').click(function() {
      	$this = $(this);
      	$target =  $this.parent().next();
    
      if($target.hasClass('active')){
        $target.removeClass('active').slideUp(); 

      } else {
        allPanels.removeClass('active').slideUp();
        $target.addClass('active').slideDown();
      }
    return false;
  });

})(jQuery);
