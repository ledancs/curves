/**
 * Created by ledesmaf on 22.5.2015.
 */

function Curves(w, h, groupedMeasurements, className){
    var div = d3.select("body")
        .append("div")
        .attr("class", className);

    var svg = div.append("svg")
        .attr("width", w + 10)
        .attr("height", h + 10); // some margin

    var y = 30;

    var hMeasurements = new HealthMeasurements(groupedMeasurements);

    var timeScale = d3.scale.linear()
        .domain([hMeasurements.min - (1 * 24 * 60 * 60), hMeasurements.max + (1 * 24 * 60 * 60)])
        .range([0, w]);

    var container = svg.append("g").attr("class", "container");

    var m, valueScale, g;
    for(var i = 0; i < hMeasurements.collection.length; i ++){

        m = hMeasurements.collection[i]; // for testing


        valueScale = d3.scale.linear()
            .domain([m.min, m.max])
            .range([0, h/2]);

        g = container.append("g")
            .attr("class", "curve");

        g.append("text")
            .attr({
                "x": 0,
                "y": y - 15,
                "font-size": 14,
                "fill": "grey"
            })
            .text(m.label);

        g.append("rect")
            .attr({
                "x": 0,
                "y": y + h/4,
                "width": w,
                "height": h/2,
                "stroke": "none",
                "fill": "green",
                "opacity": 0.15
            });


        /*
        TODO:
            Build viewModels for the lines and the circles.
         */

        g.append("g")
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
                return d.value > m.max || d.value < m.min ? "tomato": "limegreen";
            })
            .attr({
                "stroke": 1,
                "r": 5
            });
        y += h + 60;
    }



    var translate = "translate(" + 5 + ", " + 5 + ")";
    container.attr("transform", translate);

    svg.attr("height", y + 5);
}

function HealthMeasurements(groupedMeasurements){

    this.collection = [];

    var group, measurements, measurement, samples, sample, timestamp;
    var timestamps = [];

    for(var i = 0; i < groupedMeasurements.length; i ++){
        group = groupedMeasurements[i];
        measurements = group.measurements;
        this.collection = this.collection.concat(measurements);
    }


    for(var i = 0; i < this.collection.length; i ++){
        measurement = this.collection[i];
        samples = measurement.samples;
        for(var j = 0; j < samples.length; j ++){
            sample = samples[j];
            timestamp = sample.timestamp;
            if(timestamps.indexOf(timestamp) < 0)
                timestamps.push(timestamp);
        }
    }

    this.min = Math.min.apply(null, timestamps);
    this.max = Math.max.apply(null, timestamps);

}