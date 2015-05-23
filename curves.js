/**
 * Created by ledesmaf on 22.5.2015.
 */


function Curves(w, h, groupedMeasurements, className){

    /**
     *
     * @param groupedMeasurements
     */
    function getMeasurements(groupedMeasurements){

        var collection = [];

        var group, measurements;

        for(var i = 0; i < groupedMeasurements.length; i ++){
            group = groupedMeasurements[i];
            measurements = group.measurements;
            collection = collection.concat(measurements);
        }

        return collection;
    }

    /**
     *
     * @param measurements
     * @returns {{min: number, max: number}}
     */
    function getMinMax(measurements){
        var measurement, samples, sample, timestamp;
        var timestamps = [];
        for(var i = 0; i < measurements.length; i ++){
            measurement = measurements[i];
            samples = measurement.samples;
            for(var j = 0; j < samples.length; j ++){
                sample = samples[j];
                timestamp = sample.timestamp;
                if(timestamps.indexOf(timestamp) < 0) // only add unique elements
                    timestamps.push(timestamp);
            }
        }

        var min = Math.min.apply(null, timestamps);
        var max = Math.max.apply(null, timestamps);

        return {
            min: min,
            max: max
        };
    }

    /**
     *
     * @param measurement
     * @param value
     * @returns {string}
     */
    function getColor(measurement, value){
        var optionalRanges = ["yellow_min", "yellow_max", "red_min", "red_max"];
        var ranges = {};
        var hasRanges = false;
        var color = "white";
        var rangeName = "";

        for(var i = 0; i < optionalRanges.length; i++){
            rangeName = optionalRanges[i];
            if (typeof measurement[rangeName] != 'undefined'){
                hasRanges = true; // set the bool true
                ranges[rangeName] = measurement[rangeName]; // add to the object
            }
        }

        if(!hasRanges)
            return color; // no ranges so return white

        color = "#73D651"; // set our nice green color

        if(ranges["yellow_max"] && value >= measurement.max){
            color = "gold";
        }
        if(ranges["red_max"] && value >= ranges["red_max"]){
            color = "tomato";
        }

        if(ranges["yellow_min"] && value <= measurement.min){
            color = "gold";
        }
        if(ranges["red_min"] && value <= ranges["red_min"]){
            color = "tomato";
        }

        return color;
    }

    /**
     *
     * @param measurement
     * @returns {Array}
     */
    function getLinePoints(measurement){
        var points = [];
        var samples = measurement.samples;
        var sample1, sample2;
        var linePoints;
        for(var i = 0; i + 1 < samples.length; i ++){
            sample1 = samples[i];
            sample2 = samples[i + 1];
            linePoints = {
                timestamp1: sample1.timestamp,
                timestamp2: sample2.timestamp,
                value1: sample1.value,
                value2: sample2.value
            };
            points.push(linePoints);
        }

        return points;
    }


    /**
     * Takes care of the dragging behavior.
     */
    var dx = 0;
    var drag = d3.behavior.drag()
        .on("drag", function(d, i) {
            dx += d3.event.dx; // add the movement in x
            // negative means we move it to the future
            // positive we mov it to the past

            // set a limit
            // limits change with the window size

            if(dx < w - limitX)
                dx = w - limitX;
            if(dx > window.x1)
                dx = window.x1;
            // we need to do this for all the curve elements
            // transform translate the group
            container.selectAll("g.draggable")
                .attr("transform", function(d, i){
                    return "translate(" + dx + ", 0)";
                })
        });

    /**
     * Begin the factory!
     */

    var div = d3.select("body")
        .append("div")
        .attr("class", className);

    var svg = div.append("svg")
        .attr("width", "50%")
        .attr("height", "100%"); // some margin

    var y = 30;
    var offset = 60;
    var frameHeight = 50;
    var hMeasurements = getMeasurements(groupedMeasurements);
    var minMax = getMinMax(hMeasurements);
    var timeMin = minMax.min;
    var timeMax = minMax.max;
    var window = {
        timestamp1: timeMin - (24 * 60 * 60),
        timestamp2: timeMin + (31 * 24 * 60 * 60), // a month window
        x1: 0, // to be updated with the timeScale
        x2: 0
    };

    // time scale for the given window
    var timeScale = d3.scale.linear()
        .domain([window.timestamp1, window.timestamp2])
        .range([0, w]);
    window.x1 = timeScale(window.timestamp1);
    window.x2 = timeScale(window.timestamp2);
    var limitX = timeScale(timeMax + (24 * 60 * 60));
    var container = svg.append("g").attr("class", "container");

    var m, valueScale, g, draggable, clip;
    for(var index = 0; index < hMeasurements.length; index ++){

        // extract the measurement
        m = hMeasurements[index];

        // the value scale for this curve
        valueScale = d3.scale.linear()
            .domain([m.min, m.max])
            .range([0, h/2]);

        // curve main container
        g = container.append("g")
            .attr("class", "curve");

        // label text
        g.append("text")
            .attr({
                "x": 2,
                "y": y - offset/4,
                "font-size": 14,
                "fill": "grey"
            })
            .text(m.label);

        // wellness zone
        g.append("rect")
            .attr({
                "x": 0,
                "y": y + h/4,
                "width": w,
                "height": h/2,
                "stroke": "none",
                "fill": "green",
                "opacity": 0.15,
                "class": "wellness-zone"
            });

        // Clip
        clip = svg.append("clipPath")
            .attr("id", "clip-" + index)
            .append("rect")
            .attr('x', 0)
            .attr('y', y - offset/2)
            .attr('width', w)
            .attr("height", h + frameHeight);

        g.attr("clip-path", function(d,i) { return "url(#clip-" + index + ")"; });

        // draggable group
        draggable = g.append("g")
            .attr("class", "draggable")
            .data([{
                "x": 0
            }])
            .call(drag);

        // lines
        draggable.append("g")
            .attr("class", "lines")
            .selectAll("line")
            .data(getLinePoints(m))
            .enter()
            .append("line")
            .attr("x1", function(d){
                return timeScale(d.timestamp1);
            })
            .attr("x2", function (d) {
                return timeScale(d.timestamp2);
            })
            .attr("y1", function (d) {
                return y + h/2 + h/4 - valueScale(d.value1);
            })
            .attr("y2", function (d) {
                return y + h/2 + h/4 - valueScale(d.value2);
            })
            .attr({
                "stroke-width": 1,
                "stroke": "grey",
                "vector-effect": "non-scaling-stroke"
            });

        // circles
        draggable.append("g")
            .attr("class", "measurements")
            .selectAll("circle")
            .data(m.samples)
            .enter()
            .append("circle")
            .attr("cx", function (d) {
                return timeScale(d.timestamp);
            })
            .attr("cy", function(d){
                return y + h/2 + h/4 - valueScale(d.value);
            })
            .attr("fill", function (d) {
                // clever function comes here
                return getColor(m, d.value);
            })
            .attr({
                "stroke-width": 2,
                "r": 4,
                "stroke": "grey",
                "vector-effect": "non-scaling-stroke"
            });


        // draggable rectangle
        draggable.append("rect")
             .attr({
                 "x": 0,
                 "y": y - offset/2,
                 "height": h + frameHeight,
                 "fill": "white",
                 "opacity": 0,
                 "stroke": "none",
                 "class": "mask"
             })
            .attr("width", function(d){
                 return timeScale(timeMax + (24 * 60 * 60));
             });



        // Frame
        g.append("rect")
            .attr({
                "x": 0,
                "y": y - offset/2,
                "height": h + frameHeight,
                "width": w,
                "fill": "none",
                "stroke": "grey",
                "stroke-width": 1.25,
                "vector-effect": "non-scaling-stroke",
                "class": "frame"
            })
        // update the offset
        y += h + offset;
    }



    var translate = "translate(" + 5 + ", " + 5 + ")";
    container.attr("transform", translate);

    // svg.attr("height", y + 5);
}