'use strict';

Module.register("mmm-elpriset-just-nu", {
    requiresVersion: "2.1.0",
    defaults: {
        currency: "kr", // can also be 'eur'
        area: "SE3", // can also be "SE1", "SE2" and "SE4"
        updateInterval: 1000*60*1, //1 minute. This is how often the current time indicator is updated
        title: "Elprisetjustnu.se",
    },
    chart: undefined,
    chart_start_time: undefined,
    data_day_1: undefined,
    data_day_2: undefined,
    timeout_id: undefined,
    
    getScripts: function () {
        return [
            this.file('moment.min.js'),
            this.file('canvasjs.min.js')
        ];
    },

    getDom: function () {
        const chart_wrapper = document.createElement("div");
        chart_wrapper.className = "chartwrapper";
        this.chart = this.createChart(chart_wrapper);
        return chart_wrapper;
    },

    createChart: function (element) {
        const suffix = this.config.currency;
        const chart = new CanvasJS.Chart(element, {
            theme: "dark1",
            backgroundColor: "",
            height: 250,
            title: {
                fontFamily: "Roboto Condensed",
                fontSize: 14,
                text: ""
            },
            axisY: {
                gridThickness: 0,
                labelFormatter: (e) => {
                    return e.value.toFixed(2)+suffix;
                }
            },
            axisX: {
                gridThickness: 0,
                interval: 1,
                stripLines: [
                    {
                        value: 0,
                        label: ""
                    }
                ]
            },
            data: [{
                type: "stepLine",
                markerSize: 0,
                color: "white",
                lineThickness: 0.7,
            }]
        });
        chart.render();
        return chart;
	},

    update: function () {
        this.chart.options.axisX.stripLines[0].value = moment.duration(moment()-this.chart_start_time).asHours();
        this.chart.render();
	},

    convert_data: function (raw_data) {
        const data_points = [];
        let y;
        for (let i = 0; i < raw_data.length; i++) {
            y = (this.config.currency == "kr") ? raw_data[i].SEK_per_kWh : raw_data[i].EUR_per_kWh;
            data_points.push({label: String((i%24 == 0) ? 24 : i%24), y: y});
        }
        data_points.push({label: String(24), y: y}); //add one last point to display the last value in the stepped graph
        return data_points;
    },

    update_chart: function() {
        const data_points = this.convert_data(this.data_day_1.concat(this.data_day_2));
        this.chart_start_time = moment(this.data_day_1[0].time_start);
        this.chart.options.title.text = this.config.title + " " + this.chart_start_time.format("dddd Do") + " - " + moment(this.chart_start_time).add(1, "days").format("dddd Do")
        this.chart.options.data[0].dataPoints = data_points;
        this.update();
    },

    fetch_day: async function (date) {
        let url = 'https://www.elprisetjustnu.se/api/v1/prices/';
        url = url + date.format("YYYY/MM-DD");
        url = url + "_"+this.config.area+".json";
        
        try {
            const res = await fetch(url);
            //TODO supress 404 log?
            return await res.json();
        } catch(error) {
            return undefined;
        }
    },

    fetch_new_data: async function () {
        //try to fetch next days prices. According to the documentation it will be avalible not before 13:00 the day before
        let now = moment();
        if (this.data_day_2 == undefined) {
            //first run, initiate
            this.data_day_2 = await this.fetch_day(moment(now));
        }
        const res = await this.fetch_day(moment(now).add(1, "days"));
        if (res != undefined) {
            this.data_day_1 = this.data_day_2;
            this.data_day_2 = res;
            this.update_chart();
            //set timer for next day at 13:00
            this.timeout_id = setTimeout(() => {this.fetch_new_data();}, moment(this.data_day_2[0].time_start).hours(13)-now);
        } else {
            if (this.data_day_1 == undefined) {
                //first run, initiate
                this.data_day_1 = await this.fetch_day(moment(now).subtract(1, "day"));
                this.update_chart();
                //set timer for 13:00
                this.timeout_id = setTimeout(() => {this.fetch_new_data();}, moment(this.data_day_2[0].time_start).hours(13)-now);
            } else {
                //try again in 10 minutes
                this.timeout_id = setTimeout(() => {this.fetch_new_data();}, 1000*60*10);
            }
        }
    },

    notificationReceived: async function (notification, payload) {
        if (notification === "MODULE_DOM_CREATED") {
            //initiate data
            await this.fetch_new_data();

            //start updating the time indicator
            setInterval(() => {this.update();}, this.config.updateInterval);
        }
    },
});
