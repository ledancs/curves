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
     * Takes care of the dragging behavior.
     */
    var dx = 0;
    var drag = d3.behavior.drag()
        .on("drag", function(d, i) {

            var cssClass = d3.select(this).attr("class");

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
                });
            // try to move the custom line
            container.selectAll("g.custom-line")
                .attr("transform", function(d, i){
                    return "translate(" + dx + ", 0)";
                });
        });

    var dragCustomLine = d3.behavior.drag()
        .on("drag", function (d, i) {

            var lineClass = d3.select(this).attr("class");
            // get all the lines of each measurement with the same CSS class
            container.selectAll("g.custom-line line." + lineClass)
                .attr("x1", function(d){
                    return d.x += d3.event.dx;
                })
                .attr("x2", function(d){
                    return d.x;
                });
        });

    function moveCustomLine(container, lineClass, timestamp){
        container.selectAll("g.custom-line line." + lineClass)
            .attr("x1", function(d){
                return d.x = timestampToPixelScale(timestamp);
            })
            .attr("x2", function(d){
                return d.x;
            });
    }

    /**
     * For exceptionally high or low values we set a limit
     * @param y
     * @param h
     * @param value
     * @returns {number}
     */
    function getYValue(y, h, value){

        var adjustedValue = Math.min(y + h/2 + h/4 - value, y + h + h/4);

        adjustedValue = Math.max(adjustedValue, y + h/16);

        return adjustedValue;

    }

    function sortAscByTimestamp(a, b){
        return a.timestamp - b.timestamp;
    }

    function sortDesByTimestamp(a, b){
        return b.timestamp - a.timestamp;
    }

    function getAllSamples(measurements){
        var allSamples = [];
        for(var i = 0; i < measurements.length; i ++){
            allSamples = allSamples.concat(measurements[i].samples);
        }
        return allSamples;
    }

    function getEarliestSample(samples){
        samples.sort(sortAscByTimestamp);
        return samples[0];
    }

    function getLatestSample(samples){
        samples.sort(sortDesByTimestamp);
        return samples[0];
    }

    function getEarliestSampleFromMeasurements(measurements){
        var samples = getAllSamples(measurements);
        return getEarliestSample(samples);
    }

    function getLatestSampleFromMeasurements(measurements){
        var samples = getAllSamples(measurements);
        return getLatestSample(samples);
    }

    function getEarliestTimestampWithAllSamples(measurements){
        var samples = [];
        var latestStartingSample = {
            timestamp: 0
        };
        var earliestSample;
        for(var i = 0; i < measurements.length; i ++){
            samples = measurements[i].samples;
            earliestSample = getEarliestSample(samples);
            if(earliestSample.timestamp > latestStartingSample.timestamp)
                latestStartingSample = earliestSample;
        }
        return latestStartingSample;
    }

    /**
     * Begin the factory!
     */

    var div = d3.select("div." + className);

    var svg = div.append("svg")
        .attr("width", w + 5)
        .attr("height", h); // some margin



    var frameHeight = h;
    var offset = frameHeight;
    var y = h;
    var hMeasurements = getMeasurements(groupedMeasurements);

    var latestStartingSample = getEarliestTimestampWithAllSamples(hMeasurements);

    var timeMin = getEarliestSampleFromMeasurements(hMeasurements).timestamp;
    var timeMax = getLatestSampleFromMeasurements(hMeasurements).timestamp;
    var window = {
        timestamp1: timeMin - (32 * 24 * 60 * 60),
        timestamp2: timeMin + (32 * 24 * 60 * 60), // a month window
        x1: 0, // to be updated with the timestampToPixelScale
        x2: 0
    };
    var customLineAName = "custom-line-a";
    var customLineBName = "custom-line-b";

    var circleMeasurementRadius = 7;

    // convert from a timestamp to the coordinates of the whole width of the window
    var timestampToPixelScale = d3.scale.linear()
        .domain([window.timestamp1, window.timestamp2])
        .range([0, w]);

    // convert from coordinates of the window to a timestamp
    var pixelToTimestampScale = d3.scale.linear()
        .domain([0, w])
        .range([window.timestamp1, window.timestamp2]);

    window.x1 = timestampToPixelScale(window.timestamp1);
    window.x2 = timestampToPixelScale(window.timestamp2);
    var limitX = timestampToPixelScale(timeMax + (32 * 24 * 60 * 60));

    /**
     * Create the Date objects for each month in between the measurements
     */
    var date = new Date(window.timestamp1 * 1000);
    var month = date.getUTCMonth();
    var year = date.getUTCFullYear();

    var tsMonth = new Date(year, month, 0, 0, 0, 0, 0);
    var tsMonthSeconds = tsMonth.getTime() / 1000;
    var tsMonths = [];

    var monthsYear = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // check the year
    while(tsMonthSeconds < timeMax){
        month++;
        if(month > 11){
            month = 0;
            year++;
        }
        tsMonth = new Date(year, month, 0, 0, 0, 0, 0);
        tsMonthSeconds = tsMonth.getTime() / 1000;
        tsMonths.push({
            ts: tsMonthSeconds,
            month: monthsYear[month],
            year: year
        });
    }

    /**
     * Tooltip
     */
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-5, 0])
        .html(function(d) {
            return d.tooltipText;
        });

    svg.call(tip);

    /**
     * Start the container building
     */

    var container = svg.append("g").attr("class", "container");
    var m, valueScale, g, draggable, clip, labels, samplesData;
    var minLabelGroup, minLabel, minLabelBox, minLabelBackground;
    var maxLabelGroup, maxLabel, maxLabelBox, maxLabelBackground;
    /**
     * Using paths instead of lines
     */
    var lineFunction = d3.svg.line()
        .x(function(d) {
            return timestampToPixelScale(d.timestamp);
        })
        .y(function(d) {
            return getYValue(y, h, valueScale(d.value));
        })
        .interpolate("monotone");

    for(var index = 0; index < hMeasurements.length; index ++){

        // extract the measurement
        m = hMeasurements[index];

        // create samples data model
        samplesData = m.samples;
        samplesData.forEach(function (d) {
            d.tooltipText = m.label + " : " + d.value + " " + m.units;
        });

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
                "x": 5,
                "y": y - offset/2,
                "font-size": h * 0.3,
                "fill": "grey"
            })
            .text(m.label)
            .attr("transform", function (d) {
                return "translate( 0 , " + (this.getBBox().height) + ")";
            });

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

        g.attr("clip-path", function(d) { return "url(#clip-" + index + ")"; });

        // we need a new rectangle in the background to drag all the elements no matter where we click
        // in fact this is the one we listen to although we move all the draggable groups
        g.append("g")
            .attr("class", "actionable")
            .append("rect")
            .attr({
                "x": 0,
                "y": y - offset/2,
                "height": h + frameHeight,
                "width": w,
                "fill": "grey",
                "opacity": 0,
                "stroke": "none"
            });

        // draggable group
        draggable = g.append("g")
            .attr("class", "draggable")
            .data([{
                "x": 0
            }]);

        // labels for the dates at the bottom
        // group containing the labels
        labels = draggable.append("g")
            .attr("class", "labels");
        // add the vertical line marking the division of the dates
        labels.selectAll("line")
            .data(tsMonths)
            .enter()
            .append("line")
            .attr("x1", function(d){
                return timestampToPixelScale(d.ts);
            })
            .attr("x2", function (d) {
                return timestampToPixelScale(d.ts);
            })
            .attr("y1", function (d) {
                return y - h;
            })
            .attr("y2", function (d) {
                return ( index % 3 === 0 && index > 0 ) ? y + h * 1.2: y + h + frameHeight;
            })
            .attr({
                "stroke-width": 0.75,
                "stroke": "grey",
                "vector-effect": "non-scaling-stroke"
            });
        // append the text of the actual date in a given format: month year
        // not to every measurement
        if( index % 3 === 0 && index > 0 ){

            labels.selectAll("text")
                .data(tsMonths)
                .enter()
                .append("text")
                .attr("x", function (d) {
                    return timestampToPixelScale(d.ts);
                })
                .attr({
                    "y": y + h * 1.4,
                    "font-size": h * 0.25,
                    "fill": "grey"
                })
                .text(function (d) {
                    return d.month + " " + d.year;
                })
                .attr("transform", function (d) {
                    // center the text
                    return "translate(" + (-this.getBBox().width/2) + ", " + (this.getBBox().height * 0.2) + ")";
                });

        }

        labels.attr("opacity", 0.75);

        // lines for the curves connecting the dots
        draggable.append("g")
            .attr("class", "path-line")
            .append("path")
            .attr("d", lineFunction(m.samples))
            .attr({
                "vector-effect": "non-scaling-stroke",
                "stroke-width": "1.75",
                "stroke": "grey",
                "fill": "none",
                "shape-rendering": "optimizeQuality"
                // "shape-rendering": "geometricPrecision"
            });

        // circles
        draggable.append("g")
            .attr("class", "measurements")
            .selectAll("circle")
            .data(samplesData)
            .enter()
            .append("circle")
            .attr("cx", function (d) {
                return timestampToPixelScale(d.timestamp);
            })
            .attr("cy", function(d){
                return getYValue(y, h, valueScale(d.value));
            })
            .attr("fill", function (d) {
                // clever function comes here
                return getColor(m, d.value);
            })
            .attr({
                "vector-effect": "non-scaling-stroke",
                "stroke-width": 1,
                "r": circleMeasurementRadius,
                "stroke": "grey"
            })
            .on("mouseover", function(d) {
                d3.select(this).attr("r", circleMeasurementRadius * 2.15);
                tip.show(d);
            })
            .on("mouseout", function(d) {
                d3.select(this).attr("r", circleMeasurementRadius);
                tip.hide(d);
            });




        // here is the right spot to insert the line indicating the displayed measurements

        g.append("g")
            .attr("class", "custom-line")
            .selectAll("line")
            .data([ {
                x: timestampToPixelScale(latestStartingSample.timestamp)
            }, {
                x: timestampToPixelScale(timeMax)
            } ])
            .enter()
            .append("line")
            .attr({
                "x1": function (d) {
                    return d.x;
                },
                "x2": function (d) {
                    return d.x;
                },
                y1: y - offset/2,
                y2: y - offset/2 + h + frameHeight,
                "stroke": "blue",
                "stroke-width": 6,
                opacity: 0.25
            })
            .attr("stroke-dasharray", function (d, i) {
                return i % 2 === 0 ? "none": "5 1";
            })
            .attr("class", function (d, i) {
                return i % 2 === 0 ? customLineAName: customLineBName;
            })
            .call(dragCustomLine);

        // try a min and max label
        // min label
        minLabelGroup = g.append("g").attr("class", "minLabelGroup");

        minLabel = minLabelGroup.append("text")
            .attr({
                "x": 0,
                "y": y + h,
                "font-size": h * 0.25,
                "fill": "white",
                "text-anchor": "start"
            })
            .text(m.min + " " + m.units)
            .each(function () {
                // save the dimensions of the text
                minLabelBox = this.getBBox();
            });

        // background of the min label

        minLabelBackground = minLabelGroup.append("rect")
            .attr({
                "x": minLabelBox.x - 5,
                "y": minLabelBox.y - 1,
                "width": minLabelBox.width + 10,
                "height": minLabelBox.height + 2,
                // "stroke": "black",
                // "stroke-width": 0.75,
                // "vector-effect": "non-scaling-stroke"
                "fill": "dimgrey"
            });

        minLabel.each(function () {
            this.parentNode.appendChild(this);
        });

        minLabelGroup.attr("transform", function () {
            var box = this.getBBox();
            var x = Math.abs(box.x) + 3;
            var y = 0;
            return "translate(" + x + ", " + y + ")";
        });

        minLabelGroup.attr("opacity", 0.65);

        // max label now
        /*
         g.append("text")
         .attr({
         "x": 0,
         "y": y + h/4,
         "font-size": h * 0.3,
         "fill": "grey",
         "text-anchor": "start"
         })
         .text(m.max + " " + m.units)
         .each(function () {
         maxLabelBox = this.getBBox();
         });
         */
        maxLabelGroup = g.append("g").attr("class", "minLabelGroup");

        maxLabel = maxLabelGroup.append("text")
            .attr({
                "x": 0,
                "y": y + h/4,
                "font-size": h * 0.25,
                "fill": "white",
                "text-anchor": "start"
            })
            .text(m.max + " " + m.units)
            .each(function () {
                // save the dimensions of the text
                maxLabelBox = this.getBBox();
            });

        // background of the min label

        maxLabelBackground = maxLabelGroup.append("rect")
            .attr({
                "x": maxLabelBox.x - 5,
                "y": maxLabelBox.y - 1,
                "width": maxLabelBox.width + 10,
                "height": maxLabelBox.height + 2,
                // "stroke": "black",
                // "stroke-width": 0.75,
                // "vector-effect": "non-scaling-stroke"
                "fill": "dimgrey"
            });

        maxLabel.each(function () {
            this.parentNode.appendChild(this);
        });

        maxLabelGroup.attr("transform", function () {
            var box = this.getBBox();
            var x = Math.abs(box.x) + 3;
            var y = - box.height * 0.2;
            return "translate(" + x + ", " + y + ")";
        });

        maxLabelGroup.attr("opacity", 0.65);

        // A border around the window
        g.append("rect")
            .attr({
                "x": 0,
                "y": y - offset/2,
                "height": h + frameHeight,
                "width": w,
                "fill": "none",
                "stroke": "grey",
                "stroke-width": 0.75,
                "vector-effect": "non-scaling-stroke",
                "class": "frame",
                "opacity": 0.5
            });

        // update the offset
        y += h + offset;
    }

    container.attr("transform", "translate(" + 2.5 + ", " + 2.5 + ")");

    svg.selectAll("g.actionable")
        .call(drag);

    svg.attr("height", y + 5);

    return {
        svg: svg,
        container: container,
        moveCustomLineA: function(timestamp){
            moveCustomLine(container, customLineAName, timestamp);
        },
        moveCustomLineB: function(timestamp){
            moveCustomLine(container, customLineBName, timestamp);
        }
    };
}