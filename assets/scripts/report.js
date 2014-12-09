// All Hail Ye Report
//
// The idea was this would be a print page, because try as I might I can't convince
// people that burning your screen into pressed tree pulp in 2014 is a bad idea.
// But I figured if I could format it well for printing and display so it could be a
// "nice feature".
//
// Because there isn't interactivity and I need all of the data, I'm loading the full
// montey and not doing any fancy PubSub or other design patterns.
//
// Also, because it's very printer/designer-y, it's mostly hard coded to our data.
// Sorry - I can't figure out a generic way to do what we wanted. Still, it isn't
// hard. Directions to come here.
//
// Imagine my face while coding up a print page.

// script for getting crap out of the select box for the page tables
// run this in your browser's JS console
// var text = "";
// $("optgroup[label='Economics'] option").each(function() {
//     var label = $(this).prop("label");
// 	var m = $(this).val();
// 	text += "<tr><td data-label='" + m + "'><a target='_blank' href='data/meta/" + m + ".html'>" + label + "</a></td><td class='text-right' data-metric='" + m + "'></td><td class='text-right' data-change='" + m + "'></td><td class='text-right' data-average='" + m + "'></td></tr>";
// });
// console.log(text);


// ****************************************
// Globals
// ****************************************
var theFilter = ["434","372","232"],   // default list of neighborhoods if none passed
    theData,                                // global for fetched raw data
    theConfig,
    numDecimals;

_.templateSettings.variable = "rc";

// ****************************************
// Create the chart.js charts
// The container's data-labels and data-chart properties
// are used to customize the chart.
// ****************************************
function createCharts() {
    var colors = ["#F7464A", "#E2EAE9", "#D4CCC5", "#949FB1", "#bada55"];

    // doughnut charts
    $(".chart-doughnut").each(function() {
        var data = [];
        _.each($(this).data('chart').split(','), function(el, i) {
            data.push({
                value: Number($(".data-" + el).data("val")),
                color: colors[i],
                label: $(".label-" + el).data("val")
            });
        });
        ctx = document.getElementById($(this).prop("id")).getContext("2d");
        var chart = new Chart(ctx).Doughnut(data, {
            showTooltips: false,
            legendTemplate : '<% for (var i=0; i<segments.length; i++){%><span style="border-color:<%=segments[i].fillColor%>" class="title"><%if(segments[i].label){%><%=segments[i].label%><%}%></span><%}%>'
        });
        $("#" + $(this).prop("id") + "-legend").html(chart.generateLegend());
    });

    // bar charts
    $(".chart-bar").each(function() {
        // prep the data
        var data = {};

        datasets = [
            {
                fillColor: "rgba(151,187,205,0.5)",
                strokeColor: "rgba(151,187,205,0.8)",
                data: [],
                label: "NPA"
            },
            {
                fillColor: "rgba(220,220,220,0.5)",
                strokeColor: "rgba(220,220,220,0.8)",
                data: [],
                label: "County"
            }
        ];

        data.labels = $(this).data('labels').split(",");

        _.each($(this).data('chart').split(','), function(el) {
            var npaMean = mean(_.filter(theData[el], function(d) { return theFilter.indexOf(d.id.toString()) !== -1; })),
                countyMean = mean(theData[el]),
                keys = Object.keys(npaMean);
            datasets[0].data.push(npaMean[keys[keys.length - 1]]);
            datasets[1].data.push(countyMean[keys[keys.length - 1]]);
        });

        if (!$.isNumeric(datasets[0].data[0])) {
            datasets.shift();
        }

        data.datasets = datasets;

        ctx = document.getElementById($(this).prop("id")).getContext("2d");
        var chart = new Chart(ctx).Bar(data, {
            showTooltips: false,
            legendTemplate : '<% for (var i=0; i<datasets.length; i++){%><span class="title"  style="border-color:<%=datasets[i].strokeColor%>"><%if(datasets[i].label){%><%=datasets[i].label%><%}%></span><%}%>'
        });

        $("#" + $(this).prop("id") + "-legend").html(chart.generateLegend());

    });

    // line charts
    $(".chart-line").each(function() {
        var metric = $(this).data("chart"),
            npaMean = mean(_.filter(theData[metric], function(el) { return theFilter.indexOf(el.id.toString()) !== -1; })),
            countyMean = mean(theData[metric]),
            keys = Object.keys(theData[metric][0]);

        var data = {
            labels: [],
            datasets: [
                {
                    fillColor: "rgba(151,187,205,0.2)",
                    strokeColor: "rgba(151,187,205,1)",
                    pointColor: "rgba(151,187,205,1)",
                    pointStrokeColor: "#fff",
                    data: [],
                    label: "NPA"
                },
                {
                    fillColor: "rgba(220,220,220,0.2)",
                    strokeColor: "rgba(220,220,220,1)",
                    pointColor: "rgba(220,220,220,1)",
                    pointStrokeColor: "#fff",
                    data: [],
                    label: "County"
                }
            ]
        };

        _.each(keys, function(el, i) {
            if (i > 0) {
                data.labels.push(el.replace("y_", ""));
                data.datasets[1].data.push(countyMean[el]);
                data.datasets[0].data.push(npaMean[el]);
            }
        });

        if (!$.isNumeric(data.datasets[0].data[0])) {
            data.datasets.shift();
        }

        ctx = document.getElementById($(this).prop("id")).getContext("2d");
        var chart = new Chart(ctx).Line(data, {
            showTooltips: false,
            legendTemplate : '<% for (var i=0; i<datasets.length; i++){%><span class="title"  style="border-color:<%=datasets[i].strokeColor%>"><%if(datasets[i].label){%><%=datasets[i].label%><%}%></span><%}%>'
        });

        if ($("#" + $(this).prop("id") + "-legend").length > 0) {
            $("#" + $(this).prop("id") + "-legend").html(chart.generateLegend());
        }
    });
}


// ****************************************
// Create the metric blocks and table values
// ****************************************
function createData() {
    var template = _.template($("script.template-row").html());


    _.each(theConfig, function(dim, key) {
      var theTable = $(".table-" + key.toLowerCase());
      _.each(dim, function(el) {
        var tdata = {
              "id": el.Normalized,
              "name": el.Variable,
              "label": el.Variable,
              "val": "",
              "units": "",
              "change": "",
              "raw": "",
              "rawunits": "",
              "rawchange": ""
          };

          // name
          keys = Object.keys(theData[el.Normalized][0]);
          year = ' (' + keys[keys.length -1].replace('y_', '') + ')';
          label = '<a target="_blank" href="data/meta/' + el.Normalized + '.html">' + el.Variable + '</a>';
          tdata.name = label + year;

          // val
          var theMean = mean(_.filter(theData[el.Normalized], function(d) { return theFilter.indexOf(d.id.toString()) !== -1; })),
              theAgg = aggregateMean(_.filter(theData[el.Normalized], function(d) { return theFilter.indexOf(d.id.toString()) !== -1; }), _.filter(theData[el.Raw], function(d) { return theFilter.indexOf(d.id.toString()) !== -1; }));
              keys = Object.keys(theMean);
          tdata.val = theAgg[keys[keys.length -1]];

          // units
          if (el["Normalized Label"]) {
            tdata.units = el["Normalized Label"];
          }

          // change
          keys = Object.keys(theData[el.Normalized][0]);

          if (keys.length > 2) {
            theAgg = aggregateMean(_.filter(theData[el.Normalized], function(d) { return theFilter.indexOf(d.id.toString()) !== -1; }), _.filter(theData[el.Raw], function(d) { return theFilter.indexOf(d.id.toString()) !== -1; }));
            theDiff = theAgg[keys[keys.length - 1]] - theAgg[keys[1]];


            if (Number(theDiff.toFixed(1)) == 0) {
                theDiff = "↔ 0";
            } else if (theDiff > 0) {
                theDiff = "<span class='glyphicon glyphicon-arrow-up'></span> " + theDiff.toFixed(1);
            } else {
                theDiff = "<span class='glyphicon glyphicon-arrow-down'></span> " + (theDiff * -1).toFixed(1);
            }

            tdata.change = theDiff;
          }




          // RAW stuff
          // if (metricSummable.indexOf(el.Raw) !== -1) {
          //   // raw
          //
          //   // raw units
          //   if (el["Raw Label"]) {
          //     tdata.rawunits = el["Raw Label"];
          //   }
          //
          //   // raw change
          //
          // }


          // Write out stuff
          theTable.append(template(tdata));
      });
    });

    // // year
    // $("[data-label]").each(function() {
    //     if (theData[$(this).data("label")]) {
    //       var el = $(this),
    //           keys = Object.keys(theData[el.data("label")][0]);
    //       el.append(' (' + keys[keys.length -1].replace('y_', '') + ')');
    //     }
    // });
    //
    // // metrics
    // $("[data-metric]").each(function() {
    //     var el = $(this),
    //         theMean = mean(_.filter(theData[el.data("metric")], function(d) { return theFilter.indexOf(d.id.toString()) !== -1; })),
    //         keys = Object.keys(theMean);
    //
    //     el.html(dataPretty(theMean[keys[keys.length -1]], el.data("metric")));
    // });
    //
    // // diffs
    // $("[data-change]").each(function() {
    //     var el = $(this),
    //         theMean = mean(_.filter(theData[el.data("change")], function(d) { return theFilter.indexOf(d.id.toString()) !== -1; })),
    //         keys = Object.keys(theMean),
    //         theDiff = ((theMean[keys[keys.length - 1]] - theMean[keys[0]]) / theMean[keys[0]]) * 100;
    //
    //     if (theDiff === 0 || !$.isNumeric(theDiff)) {
    //         theDiff = "--";
    //     } else if (theDiff > 0) {
    //         theDiff = "<span class='glyphicon glyphicon-arrow-up'></span> +" + theDiff.toFixed(1) + "%";
    //     } else {
    //         theDiff = "<span class='glyphicon glyphicon-arrow-down'></span> -" + (theDiff * -1).toFixed(1) + "%";
    //     }
    //
    //     el.html(theDiff);
    // });
    //
    // // county averages
    // $("[data-average]").each(function() {
    //     var el = $(this),
    //         theMean = mean(theData[el.data("average")]),
    //         keys = Object.keys(theMean);
    //     el.html(dataPretty(theMean[keys[keys.length - 1]], el.data("average")));
    // });
}


// ****************************************
// Initialize the map
// Neighborhoods labled with leaflet.label
// ****************************************
function createMap(data){
    // set up map
    L.Icon.Default.imagePath = './images';
    var map = L.map("map", {
            attributionControl: false,
            zoomControl: false,
            touchZoom: false,
            minZoom: mapGeography.minZoom,
            maxZoom: mapGeography.maxZoom
        });

    // Disable drag and zoom handlers.
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();

    // add data filtering by passed neighborhood id's
    var geom = L.geoJson(topojson.feature(data, data.objects[neighborhoods]), {
        style: {
            "color": "#FFA400",
            "fillColor": "rgba(0,0,0,0)",
            "weight": 2,
            "opacity": 1
        },
        filter: function(feature, layer) {
            return theFilter.indexOf(feature.id.toString()) !== -1;
        },
        onEachFeature: function(feature, layer) {
            var pt = L.geoJson(feature).getBounds().getCenter();
            label = new L.Label();
            label.setContent(feature.id.toString());
            label.setLatLng(pt);
            map.showLabel(label);
        }
    }).addTo(map);

    // zoom to data
    map.fitBounds(geom.getBounds());

    // add base tiles at the end so no extra image grabs
    L.tileLayer(baseTilesURL).addTo(map);
}


// ****************************************
// Document ready kickoff
// ****************************************
$(document).ready(function() {
    // ye customizable subtitle
    $(".subtitle").on("click", function() { $(this).select(); });

    // grab the neighborhood list from the URL to set the filter
    if (getURLParameter("n") !== "null") {
        theFilter.length = 0;
        _.each(getURLParameter("n").split(","), function (n) {
            theFilter.push(n);
        });
    }

    // populate the neighborhoods list on the first page
    $(".neighborhoods").text("NPA " + theFilter.join(", "));

    // fetch map data and make map
    $.get("data/geography.topo.json", function(data) {
        createMap(data);
    });

    // fetch the metrics and make numbers and charts
    $.when(
        $.get("data/merge.json"),
        $.get("data/report.json")
    ).then(function(merge, report) {
        theData = merge[0];
        theConfig = report[0];
        createData();
        createCharts();
    });

});
